import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import { AthleteController } from '../game/controller';
import type { AthleteGoal as AthleteGoalT, Keyframe } from '../game/goals';
import { GROUP_GROUND, Ragdoll } from './ragdoll';
import { JOINTS, type JointName } from './skeleton';

export const STEP = 1 / 120;
export type Who = 'top' | 'bottom';

export interface Pose {
  pos: Vector3;
  quat: Quaternion;
  locals: Record<JointName, Quaternion>;
}

const env = (globalThis as { process?: { env: Record<string, string> } }).process?.env ?? {};
const TRACK_K = Number(env.TK ?? 4);
const SOLVE_HZ = Number(env.SOLVE_HZ ?? 12);
const LIFT = Number(env.LIFT ?? 0.12);
const HOLD_K = Number(env.HOLD_K ?? 2.2);
const TRACK_RK = Number(env.TRK ?? 3);
const smooth = (t: number) => t * t * (3 - 2 * t);

let rapierReady: Promise<void> | null = null;
export function initPhysics(): Promise<void> {
  rapierReady ??= RAPIER.init();
  return rapierReady;
}

/** The mat, two athletes and their controllers. Fixed 120 Hz step. */
export class Sim {
  readonly R = RAPIER;
  readonly world: RAPIER.World;
  readonly top: Ragdoll;
  readonly bottom: Ragdoll;
  readonly ctl: Record<Who, AthleteController>;
  timeScale = 1;
  paused = false;
  time = 0;
  private acc = 0;
  /** Grips are suppressed while solving hidden keyframes. */
  noGrips = false;
  /** In-flight cinematic transition (joint-space glide). */
  private glide: { t: number; dur: number; from: Record<Who, Pose>; to: Record<Who, Pose>; k: Keyframe } | null = null;
  /** In-flight tracked transition: muscles follow an interpolated path, physics on. */
  private tracking: { t: number; dur: number; from: Record<Who, Pose>; to: Record<Who, Pose>; k: Keyframe } | null = null;
  /** Set by the interaction layer: who is being dragged right now. */
  dragging: (who: Who) => boolean = () => false;
  /** Hooks run every physics step (user drag forces, AI). */
  readonly stepHooks: ((dt: number) => void)[] = [];

  constructor(massTop = 80, massBottom = 80) {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = STEP;
    this.world.numSolverIterations = 8;

    const mat = RAPIER.ColliderDesc.cuboid(6, 0.5, 6)
      .setTranslation(0, -0.5, 0)
      .setFriction(1.0)
      .setCollisionGroups((GROUP_GROUND << 16) | 0xffff);
    this.world.createCollider(mat);

    this.top = new Ragdoll(RAPIER, this.world, { id: 'top', massKg: massTop, groupBit: 1 << 1 });
    this.bottom = new Ragdoll(RAPIER, this.world, { id: 'bottom', massKg: massBottom, groupBit: 1 << 2 });
    this.ctl = {
      top: new AthleteController(RAPIER, this.world, this.top),
      bottom: new AthleteController(RAPIER, this.world, this.bottom),
    };
    this.ctl.top.partner = this.bottom;
    this.ctl.bottom.partner = this.top;
    this.ctl.top.noGrips = this.ctl.bottom.noGrips = () => this.noGrips;
  }

  athlete(who: Who) {
    return who === 'top' ? this.top : this.bottom;
  }

  /** Teleport both athletes into a keyframe, then let physics settle. */
  setup(k: Keyframe, settleSeconds = 0.4) {
    this.glide = null;
    this.tracking = null;
    for (const who of ['top', 'bottom'] as Who[]) this.ctl[who].overrides.clear();
    const full = { top: k.top ?? this.ctl.top.goal, bottom: k.bottom ?? this.ctl.bottom.goal };
    const to = this.solve(full, false);
    this.holdSolved({ to, k: full });
    this.time = 0;
    this.acc = 0;
    const steps = Math.round(settleSeconds / STEP);
    for (let i = 0; i < steps; i++) this.stepOnce();
  }

  apply(k: Keyframe, keepOverrides = false) {
    const dur = k.dur ?? 0.8;
    if (k.top) this.ctl.top.setGoal(k.top, dur, keepOverrides);
    if (k.bottom) this.ctl.bottom.setGoal(k.bottom, dur, keepOverrides);
  }

  stepOnce() {
    if (this.glide) {
      const g = this.glide;
      g.t += STEP;
      const s = smooth(Math.min(1, g.t / g.dur));
      for (const who of ['top', 'bottom'] as Who[]) {
        const a = g.from[who];
        const b = g.to[who];
        const locals: Partial<Record<JointName, Quaternion>> = {};
        for (const j of JOINTS) locals[j.name] = a.locals[j.name].clone().slerp(b.locals[j.name], s);
        this.athlete(who).teleport(a.pos.clone().lerp(b.pos, s), a.quat.clone().slerp(b.quat, s), locals);
      }
      this.time += STEP;
      if (g.t >= g.dur) {
        this.glide = null;
        // Hand back to physics holding the final pose.
        this.holdSolved(g);
      }
      return;
    }
    if (this.tracking) {
      const g = this.tracking;
      g.t += STEP;
      const s = smooth(Math.min(1, g.t / g.dur));
      for (const who of ['top', 'bottom'] as Who[]) {
        const rd = this.athlete(who);
        const a = g.from[who];
        const b = g.to[who];
        for (const j of JOINTS) {
          rd.joints[j.name].target.slerpQuaternions(a.locals[j.name], b.locals[j.name], s);
          rd.joints[j.name].stiffness = 1.0;
        }
        rd.root.active = true;
        rd.root.pos.lerpVectors(a.pos, b.pos, s);
        rd.root.quat.slerpQuaternions(a.quat, b.quat, s);
        rd.root.posK = TRACK_K;
        rd.root.rotK = TRACK_RK;
        rd.pulls.length = 0;
        // Bleed off energy so contact fights don't launch anyone.
        for (const b of rd.bodies) {
          const v = b.linvel();
          b.setLinvel({ x: v.x * 0.985, y: v.y * 0.985, z: v.z * 0.985 }, true);
        }
      }
      if (g.t >= g.dur + 0.15) {
        this.tracking = null;
        this.holdSolved(g);
      }
    } else {
      this.ctl.top.update(STEP);
      this.ctl.bottom.update(STEP);
    }
    for (const h of this.stepHooks) h(STEP);
    for (const who of ['top', 'bottom'] as Who[]) {
      const c = this.ctl[who];
      this.athlete(who).setCalm(!this.tracking && c.holdPose !== null && c.overrides.size === 0 && !this.dragging(who));
    }
    this.top.applyControl(STEP);
    this.bottom.applyControl(STEP);
    this.world.step();
    this.time += STEP;
  }

  get gliding() {
    return this.glide !== null || this.tracking !== null;
  }

  private holdSolved(g: { to: Record<Who, Pose>; k: Keyframe }) {
    for (const who of ['top', 'bottom'] as Who[]) {
      const p = g.to[who];
      const locals = new Map(Object.entries(p.locals) as [JointName, Quaternion][]);
      this.ctl[who].hold(g.k[who]!, locals, p.pos, p.quat);
    }
  }

  /** Drop any in-flight scripted transition (e.g. the user grabbed someone). */
  cancelTransition() {
    if (this.tracking) {
      const k = this.tracking.k;
      this.tracking = null;
      this.apply({ ...k, dur: 0.3 });
      void k;
    }
  }

  pose(who: Who): Pose {
    const rd = this.athlete(who);
    const locals = {} as Record<JointName, Quaternion>;
    for (const j of JOINTS) locals[j.name] = rd.segQuat(j.parent).invert().multiply(rd.segQuat(j.child));
    return { pos: rd.segPos('pelvis'), quat: rd.segQuat('pelvis'), locals };
  }

  private saveBodies() {
    return [this.top, this.bottom].map((rd) => rd.bodies.map((b) => ({
      p: { ...b.translation() }, q: { ...b.rotation() }, lv: { ...b.linvel() }, av: { ...b.angvel() },
    })));
  }

  private restoreBodies(st: ReturnType<Sim['saveBodies']>) {
    [this.top, this.bottom].forEach((rd, i) => rd.bodies.forEach((b, k) => {
      const s = st[i][k];
      b.setTranslation(s.p, true); b.setRotation(s.q, true); b.setLinvel(s.lv, true); b.setAngvel(s.av, true);
    }));
  }

  /**
   * Cinematic transition: work out where a keyframe physically settles (in a
   * hidden pass), then glide both athletes there in joint space so nothing tears
   * apart, and resume physics. Used for big scripted moments (rolls, reactions).
   */
  transition(k: Keyframe, mode: 'glide' | 'track' = 'glide') {
    const dur = k.dur ?? 1;
    this.glide = null;
    this.tracking = null;
    const from = { top: this.pose('top'), bottom: this.pose('bottom') };
    const goals = { top: this.ctl.top.goal, bottom: this.ctl.bottom.goal };
    const full = { top: k.top ?? goals.top, bottom: k.bottom ?? goals.bottom };
    const to = this.solve(full, true);
    const job = { t: 0, dur, from, to, k: full };
    if (mode === 'glide') this.glide = job;
    else this.tracking = job;
  }

  /**
   * Work out where a keyframe physically settles: snap both athletes to their
   * intent (IK), freeze that as plain joint targets, and let soft contacts ease
   * any overlap apart. With `restore`, the world is put back afterwards.
   */
  solve(k: { top: AthleteGoalT; bottom: AthleteGoalT }, restore: boolean): Record<Who, Pose> {
    const saved = restore ? this.saveBodies() : null;
    this.ctl.top.releaseAllGrips();
    this.ctl.bottom.releaseAllGrips();
    this.noGrips = true;
    for (let i = 0; i < 2; i++) {
      this.ctl.bottom.snap(k.bottom);
      this.ctl.top.snap(k.top);
    }
    // Freeze the snapped intent as plain joint targets: no partner-chasing while solving.
    const upper: Who = this.top.segPos('pelvis').y >= this.bottom.segPos('pelvis').y ? 'top' : 'bottom';
    for (const who of ['top', 'bottom'] as Who[]) {
      const p = this.pose(who);
      this.ctl[who].hold(k[who], new Map(Object.entries(p.locals) as [JointName, Quaternion][]), p.pos, p.quat);
      this.ctl[who].holdK = 4;
      // The upper athlete starts a little above and lowers their weight onto the other,
      // so contacts form from outside instead of being pried apart.
      if (who === upper) {
        const lifted = p.pos.clone().add(new Vector3(0, LIFT, 0));
        this.athlete(who).teleport(lifted, p.quat, p.locals);
      }
    }
    this.world.integrationParameters.contact_natural_frequency = SOLVE_HZ;
    for (let i = 0; i < 100; i++) this.stepOnce();
    this.world.integrationParameters.contact_natural_frequency = 30;
    this.ctl.top.holdK = this.ctl.bottom.holdK = HOLD_K;
    if (env.DEBUG_SOLVE) console.log('[solve] KE after settle', (this.top.kineticEnergy() + this.bottom.kineticEnergy()).toFixed(1));
    const to = { top: this.pose('top'), bottom: this.pose('bottom') };
    this.noGrips = false;
    if (saved) this.restoreBodies(saved);
    return to;
  }

  /** Advance by real elapsed time (seconds), honouring slow motion. */
  advance(realDt: number) {
    if (this.paused) return;
    this.acc += Math.min(realDt, 1 / 20) * this.timeScale;
    let n = 0;
    while (this.acc >= STEP && n < 6) {
      this.stepOnce();
      this.acc -= STEP;
      n++;
    }
  }
}

import type RAPIER_NS from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import { POSES } from '../content/poses';
import { solveAim, solveTwoBone } from '../physics/ik';
import { eulerQ, type Ragdoll } from '../physics/ragdoll';
import {
  JOINTS, JOINT_BY_NAME, LANDMARKS, LIMBS, anchorIn,
  type JointName, type LimbName, type SegName, type V3,
} from '../physics/skeleton';
import type { AthleteGoal, LimbGoal, Ref } from './goals';

const ALL_JOINTS = JOINTS.map((j) => j.name);
const LIMB_NAMES = Object.keys(LIMBS) as LimbName[];
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const v3 = (a: V3) => new Vector3(a[0], a[1], a[2]);

/** A user's hand on a body part: it overrides that limb's goal while held, and stays put after release. */
export interface Override {
  limb?: LimbName;
  mode: 'end' | 'mid';
  ref: Ref;
}

interface Grip {
  joint: RAPIER_NS.ImpulseJoint;
  limb: LimbName;
  key: string;
}

/**
 * Turns an AthleteGoal (intent: "left knee beside his armpit, hips heavy") into
 * muscle targets every frame, using IK against the bodies' *actual* positions so
 * the athlete adapts as things move. Changes blend smoothly over `dur`.
 */
export class AthleteController {
  goal: AthleteGoal = {};
  readonly overrides = new Map<LimbName, Override>();
  private blendFrom = new Map<JointName, Quaternion>();
  private blendT = 1;
  private blendDur = 0.6;
  private rootFrom = { pos: new Vector3(), quat: new Quaternion() };
  private grips: Grip[] = [];
  partner!: Ragdoll;
  /** Set by the sim while it solves hidden keyframes. */
  noGrips: () => boolean = () => false;
  /** Hold a solved pose (joint targets) instead of chasing partner-relative targets. */
  holdK = 1.5;
  holdPose: { locals: Map<JointName, Quaternion>; pos: Vector3; quat: Quaternion } | null = null;
  /** Called each frame with limb goal positions (for the ghost / hint overlay). */
  lastTargets = new Map<LimbName, Vector3>();

  constructor(
    readonly R: typeof RAPIER_NS,
    readonly world: RAPIER_NS.World,
    readonly body: Ragdoll,
  ) {}

  /** Keep `goal` for grips/meaning, but hold the given solved pose. */
  hold(goal: AthleteGoal, locals: Map<JointName, Quaternion>, pos: Vector3, quat: Quaternion) {
    this.setGoal(goal, 0.05);
    this.holdPose = { locals, pos: pos.clone(), quat: quat.clone() };
  }

  setGoal(goal: AthleteGoal, dur = 0.6, keepOverrides = false) {
    this.holdPose = null;
    this.applyGhosts(goal);
    for (const j of ALL_JOINTS) this.blendFrom.set(j, this.body.joints[j].target.clone());
    this.rootFrom.pos.copy(this.body.root.active ? this.body.root.pos : this.body.segPos('pelvis'));
    this.rootFrom.quat.copy(this.body.root.active ? this.body.root.quat : this.body.segQuat('pelvis'));
    this.goal = goal;
    this.blendDur = Math.max(0.01, dur);
    this.blendT = 0;
    if (!keepOverrides) this.overrides.clear();
    // Release grips that the new goal no longer asks for.
    for (const g of [...this.grips]) {
      const lg = goal.limbs?.[g.limb];
      if (!lg?.grip || refKey(lg.to) !== g.key) this.releaseGrip(g);
    }
  }

  private applyGhosts(goal: AthleteGoal) {
    this.body.bigReach = new Set((goal.reach ?? []).map((l) => LIMBS[l].rootJoint));
    this.body.setCollideWithPartner(true, this.partner.groupBit);
    if (goal.ghost?.length) this.body.setCollideWithPartner(false, this.partner.groupBit, goal.ghost);
  }

  releaseAllGrips() {
    for (const g of [...this.grips]) this.releaseGrip(g);
  }

  hasGrip(limb: LimbName) {
    return this.grips.some((g) => g.limb === limb);
  }

  private releaseGrip(g: Grip) {
    this.world.removeImpulseJoint(g.joint, true);
    this.grips = this.grips.filter((x) => x !== g);
  }

  resolve(ref: Ref, out = new Vector3()): Vector3 {
    if ('world' in ref) return out.set(ref.world[0], ref.world[1], ref.world[2]);
    const who = ref.who === 'self' ? this.body : this.partner;
    const lm = LANDMARKS[ref.at];
    const p = ref.off ? v3(lm.p as V3).add(v3(ref.off)) : v3(lm.p as V3);
    who.pointOn(lm.seg, p, out);
    if (ref.y !== undefined) out.y = ref.y;
    return out;
  }

  /** Per physics step: compute targets, apply blending, manage grips. */
  update(dt: number) {
    const b = this.body;
    const g = this.goal;
    this.blendT = Math.min(1, this.blendT + dt / this.blendDur);
    const s = smooth(this.blendT);

    const desired = this.computeDesired();

    // 3) Blend from where the muscles were aiming toward the new targets.
    for (const j of ALL_JOINTS) {
      const from = this.blendFrom.get(j) ?? new Quaternion();
      b.joints[j].target.slerpQuaternions(from, desired.get(j)!, s);
      b.joints[j].stiffness = this.tensionFor(j);
    }

    // 4) Hips guide.
    if (this.holdPose) {
      b.root.active = true;
      b.root.pos.copy(this.holdPose.pos);
      b.root.quat.copy(this.holdPose.quat);
      b.root.posK = Math.max(this.holdK, Math.min(g.root?.k ?? 0, 5));
      b.root.rotK = Math.max(this.holdK, Math.min(g.root?.rk ?? 0, 5));
    } else if (g.root) {
      const target = this.resolve(g.root.at);
      const rot = g.root.rot ? rootQuat(g.root.rot) : b.segQuat('pelvis');
      b.root.active = true;
      b.root.pos.lerpVectors(this.rootFrom.pos, target, s);
      b.root.quat.slerpQuaternions(this.rootFrom.quat, rot, s);
      b.root.posK = g.root.k ?? 3;
      b.root.rotK = g.root.rot ? (g.root.rk ?? g.root.k ?? 3) : 0;
    } else {
      b.root.active = false;
    }

    // 5) Grips and reaching forces.
    b.pulls.length = 0;
    for (const limb of LIMB_NAMES) {
      const lg = g.limbs?.[limb];
      if (!lg?.to || this.overrides.has(limb)) continue;
      const def = LIMBS[limb];
      const target = this.resolve(lg.to);
      if (lg.pull && !this.holdPose) {
        b.pulls.push({ body: b.body(def.lower), local: v3(def.endLocal), target, k: 600, maxF: lg.pull });
      }
      if (lg.grip && !this.noGrips() && !this.hasGrip(limb) && this.blendT > 0.3) {
        const end = b.pointOn(def.lower, def.endLocal);
        if (end.distanceTo(target) < 0.2 && 'who' in lg.to) this.makeGrip(limb, lg.to, end);
      }
    }
  }

  /** Muscle targets the goal asks for right now (IK against current body positions). */
  computeDesired(): Map<JointName, Quaternion> {
    const g = this.goal;
    const desired = new Map<JointName, Quaternion>();
    if (this.holdPose) {
      for (const j of ALL_JOINTS) desired.set(j, this.holdPose.locals.get(j)!.clone());
    } else {
      const base = { ...(g.pose ? POSES[g.pose] : {}), ...(g.joints ?? {}) };
      for (const j of ALL_JOINTS) {
        const a = base[j];
        desired.set(j, a ? eulerQ(a[0], a[1], a[2]) : new Quaternion());
      }
    }
    this.lastTargets.clear();
    for (const limb of LIMB_NAMES) {
      const ov = this.overrides.get(limb);
      if (this.holdPose && !ov) continue;
      const lg: LimbGoal | undefined = ov
        ? { ...(g.limbs?.[limb] ?? {}), ...(ov.mode === 'end' ? { to: ov.ref, mid: undefined } : { mid: ov.ref, to: undefined }) }
        : g.limbs?.[limb];
      if (!lg) continue;
      this.solveLimb(limb, lg, desired);
      if (lg.to) this.lastTargets.set(limb, this.resolve(lg.to));
      else if (lg.mid) this.lastTargets.set(limb, this.resolve(lg.mid));
    }
    return desired;
  }

  /** Instantly pose the athlete at the goal (scenario setup). */
  snap(goal: AthleteGoal) {
    this.goal = goal;
    this.applyGhosts(goal);
    this.overrides.clear();
    this.releaseAllGrips();
    const b = this.body;
    const pos = goal.root ? this.resolve(goal.root.at) : b.segPos('pelvis');
    const rot = goal.root?.rot ? rootQuat(goal.root.rot) : b.segQuat('pelvis');
    const locals: Partial<Record<JointName, Quaternion>> = {};
    // Spine first so limb IK sees the right chest orientation, then limbs.
    b.teleport(pos, rot, Object.fromEntries(this.computeDesired()));
    for (const [j, q] of this.computeDesired()) locals[j] = q;
    b.teleport(pos, rot, locals);
    this.blendT = 1;
    b.root.pos.copy(pos);
    b.root.quat.copy(rot);
  }

  private tensionFor(j: JointName): number {
    const g = this.goal;
    let t = g.tension ?? 1;
    for (const limb of LIMB_NAMES) {
      const d = LIMBS[limb];
      if (d.rootJoint === j || d.midJoint === j) {
        const lt = g.limbs?.[limb]?.tension;
        if (lt !== undefined) t *= lt;
      }
    }
    return t;
  }

  private solveLimb(limb: LimbName, lg: LimbGoal, desired: Map<JointName, Quaternion>) {
    const def = LIMBS[limb];
    const b = this.body;
    const parentSeg: SegName = def.rootJoint.startsWith('shoulder') ? 'chest' : 'pelvis';
    const parentQ = b.segQuat(parentSeg);
    const rootPos = b.jointWorld(def.rootJoint);
    const isLeg = limb.startsWith('leg');
    const bendSign = isLeg ? 1 : -1;
    const midDef = JOINT_BY_NAME[def.midJoint];
    const l1 = v3(JOINT_BY_NAME[def.rootJoint].anchor).distanceTo(v3(midDef.anchor));
    const l2 = v3(anchorIn(def.lower, midDef.anchor)).distanceTo(v3(def.endLocal));
    const toParent = (d: V3) => v3(d).normalize().applyQuaternion(parentQ);
    // Default poles: knees forward and slightly out, elbows back and out.
    const side = limb.endsWith('L') ? 1 : -1;
    const defaultPole: V3 = isLeg ? [0.25 * side, 0, 1] : [0.4 * side, -0.2, -1];

    if (lg.to) {
      const target = this.resolve(lg.to);
      const r = solveTwoBone(rootPos, parentQ, l1, l2, target, toParent(lg.pole ?? defaultPole), bendSign, midDef.limits!);
      desired.set(def.rootJoint, r.upperLocal);
      desired.set(def.midJoint, new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), r.midAngle));
    } else if (lg.mid) {
      const midPoint = this.resolve(lg.mid);
      const ld = lg.lowerDir ?? (isLeg ? [0, -0.3, -1] : [0, 0, 1]);
      const lower = lg.lowerIn === 'world' ? v3(ld).normalize()
        : lg.lowerIn === 'other' ? v3(ld).normalize().applyQuaternion(this.partner.segQuat('pelvis'))
        : toParent(ld);
      // No explicit bend: fold exactly enough for the lower bone to follow `lower`.
      const upperDir = midPoint.clone().sub(rootPos).normalize();
      const auto = bendSign * Math.acos(Math.max(-1, Math.min(1, upperDir.dot(lower))));
      let bend = lg.bend !== undefined ? (lg.bend * Math.PI) / 180 : auto;
      bend = Math.min(midDef.limits![1], Math.max(midDef.limits![0], bend));
      const r = solveAim(rootPos, parentQ, midPoint, lower, bend, bendSign);
      desired.set(def.rootJoint, r.upperLocal);
      desired.set(def.midJoint, new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), r.midAngle));
    }
  }

  private makeGrip(limb: LimbName, ref: Extract<Ref, { who: string }>, endWorld: Vector3) {
    const def = LIMBS[limb];
    const who = ref.who === 'self' ? this.body : this.partner;
    const seg = LANDMARKS[ref.at].seg;
    const other = who.body(seg);
    // Anchor on the partner where the hand actually is (no teleporting).
    const oq = who.segQuat(seg).invert();
    const local = endWorld.clone().sub(who.segPos(seg)).applyQuaternion(oq);
    const a1 = def.endLocal;
    const data = this.R.JointData.spherical(
      { x: a1[0], y: a1[1], z: a1[2] },
      { x: local.x, y: local.y, z: local.z },
    );
    const joint = this.world.createImpulseJoint(data, this.body.body(def.lower), other, true);
    joint.setContactsEnabled(false);
    this.grips.push({ joint, limb, key: refKey(ref) });
  }
}

/** Hips orientation: a quaternion [x,y,z,w], or Euler degrees (YXZ). */
function rootQuat(r: V3 | [number, number, number, number]): Quaternion {
  if (r.length === 4) return new Quaternion(r[0], r[1], r[2], r[3]).normalize();
  return eulerQ(r[0], r[1], r[2], 'YXZ');
}

function refKey(r?: Ref): string {
  return r ? JSON.stringify(r) : '';
}

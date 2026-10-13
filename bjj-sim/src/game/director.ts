import { Vector3 } from 'three';
import type { CheckCtx, DragPart, Position, Step, Technique } from '../content/types';
import { LANDMARKS, type V3 } from '../physics/skeleton';
import type { Sim, Who } from '../physics/sim';
import type { AthleteGoal, Keyframe } from './goals';
import { handlePos } from './interaction';

/** Debug: render every step as a glide to inspect solved end poses. */
export let FORCE_GLIDE = false;
export const setForceGlide = (v: boolean) => { FORCE_GLIDE = v; };

export type Mode = 'explore' | 'learn' | 'watch';

export interface DirectorEvents {
  step(i: number, step: Step | null): void;
  stepDone(i: number): void;
  finished(): void;
  checks(results: { id: string; who: Who; label: string; why: string; ok: boolean }[]): void;
  caption(text: string | null): void;
}

/** Runs a position sandbox or a technique lesson on top of the simulation. */
export class Director {
  mode: Mode = 'explore';
  position!: Position;
  technique: Technique | null = null;
  stepIndex = -1;
  /** Seconds until the in-flight step finishes blending and the next begins. */
  private pending: { t: number; next: () => void } | null = null;
  private holdNear = 0;
  private checkTimer = 0;
  readonly ctx: CheckCtx;
  /** Set by the UI while the learner holds the cued part snapped onto its target. */
  snapped = false;
  /** Who the learner is controlling in explore mode. */
  focus: Who = 'top';

  constructor(readonly sim: Sim, readonly ev: DirectorEvents) {
    const s = sim;
    this.ctx = {
      top: s.top,
      bottom: s.bottom,
      lm: (who, at, off) => {
        const lm = LANDMARKS[at];
        const p = new Vector3(...(lm.p as V3));
        if (off) p.add(new Vector3(...off));
        return s.athlete(who).pointOn(lm.seg, p);
      },
      local: (who, seg, p) => {
        const rd = s.athlete(who);
        return p.clone().sub(rd.segPos(seg)).applyQuaternion(rd.segQuat(seg).invert());
      },
      gripping: (who, limb) => s.ctl[who].hasGrip(limb),
      axis: (who, seg, v) => new Vector3(...v).applyQuaternion(s.athlete(who).segQuat(seg)),
    };
  }

  get step(): Step | null {
    return this.technique?.steps[this.stepIndex] ?? null;
  }

  /** Open a position in explore (sandbox) mode. */
  explore(p: Position) {
    this.position = p;
    this.technique = null;
    this.mode = 'explore';
    this.pending = null;
    this.stepIndex = -1;
    this.sim.timeScale = 1;
    this.sim.setup(p.setup, 1.0);
    this.ev.step(-1, null);
    this.ev.caption(null);
  }

  /** Start a technique: learn (you do each step) or watch (auto-play). */
  begin(p: Position, t: Technique, mode: 'learn' | 'watch', fromStep = 0) {
    this.position = p;
    this.technique = t;
    this.mode = mode;
    this.pending = null;
    this.sim.timeScale = 1;
    this.sim.setup(p.setup, 1.0);
    // Fast-forward through earlier steps headlessly so "restart step" is exact.
    for (let i = 0; i < fromStep; i++) {
      this.sim.transition(t.steps[i].key, t.steps[i].cinematic ? 'glide' : 'track');
      const n = Math.round(((t.steps[i].key.dur ?? 0.8) + 0.45) * 120);
      for (let k = 0; k < n; k++) this.sim.stepOnce();
    }
    this.enter(fromStep);
  }

  restartStep() {
    if (this.technique) this.begin(this.position, this.technique, this.mode === 'watch' ? 'watch' : 'learn', Math.max(0, this.stepIndex));
    else this.explore(this.position);
  }

  private enter(i: number) {
    const t = this.technique!;
    this.holdNear = 0;
    if (i >= t.steps.length) {
      this.stepIndex = t.steps.length;
      this.ev.step(i, null);
      this.ev.finished();
      if (this.mode === 'watch') this.pending = { t: 2.5, next: () => this.begin(this.position, t, 'watch') };
      return;
    }
    this.stepIndex = i;
    const step = t.steps[i];
    this.ev.step(i, step);
    if (step.auto || this.mode === 'watch') {
      this.pending = { t: step.delay ?? (this.mode === 'watch' ? 1.1 : 0.7), next: () => this.perform() };
    }
  }

  /** Execute the current step (button press, drag reached target, or auto). */
  perform() {
    const step = this.step;
    if (!step) return;
    const i = this.stepIndex;
    // Hand control back to the choreography for this step.
    this.sim.ctl.top.overrides.clear();
    this.sim.ctl.bottom.overrides.clear();
    this.sim.transition(step.key, step.cinematic || FORCE_GLIDE ? 'glide' : 'track');
    this.ev.stepDone(i);
    this.pending = { t: (step.key.dur ?? 0.8) + 0.45, next: () => this.enter(i + 1) };
  }

  get busy() {
    return this.pending !== null;
  }

  /** Where the current step wants the dragged part to go (ghost target). */
  targetFor(who: Who, part: DragPart): Vector3 | null {
    const step = this.step;
    if (!step?.drag || this.pending || step.drag.who !== who || step.drag.part !== part) return null;
    return resolveTarget(this.sim, step.key, who, part);
  }

  /** The current step's drag cue: handle position + target. */
  cue(): { who: Who; part: DragPart; mode: 'end' | 'mid'; from: Vector3; to: Vector3 } | null {
    const step = this.step;
    if (this.mode !== 'learn' || !step?.drag || this.pending) return null;
    const { who, part } = step.drag;
    const to = resolveTarget(this.sim, step.key, who, part);
    if (!to) return null;
    const mode = dragMode(step.key, who, part);
    return { who, part, mode, from: handlePos(this.sim, who, part, mode), to };
  }

  update(dt: number) {
    if (this.pending) {
      this.pending.t -= dt;
      if (this.pending.t <= 0) {
        const n = this.pending.next;
        this.pending = null;
        n();
      }
    } else if (this.mode === 'learn') {
      // Drag-to-target completes the step once the part is held near the ghost.
      const c = this.cue();
      if (c) {
        // Done when the part arrives, or when the learner holds it snapped onto the
        // target (bodies can stop a few cm short against the opponent).
        const near = c.from.distanceTo(c.to) < 0.12 || (this.snapped && c.from.distanceTo(c.to) < (c.part === 'hips' ? 0.5 : 0.3));
        this.holdNear = near ? this.holdNear + dt : 0;
        if (this.holdNear > 0.25) this.perform();
      }
    }
    this.checkTimer -= dt;
    if (this.checkTimer <= 0 && this.position) {
      this.checkTimer = 0.2;
      this.ev.checks(this.position.checks.map((c) => ({ id: c.id, who: c.who, label: c.label, why: c.why, ok: safe(() => c.test(this.ctx)) })));
    }
  }

  /** Apply a sandbox tweak (intent button). */
  tweak(k: Keyframe) {
    this.sim.ctl.top.overrides.clear();
    this.sim.ctl.bottom.overrides.clear();
    this.sim.transition(k, 'track');
  }
}

function safe(f: () => boolean) {
  try { return f(); } catch { return false; }
}

function dragMode(k: Keyframe, who: Who, part: DragPart): 'end' | 'mid' {
  if (part === 'hips') return 'end';
  const lg = k[who]?.limbs?.[part];
  return lg?.to ? 'end' : 'mid';
}

export function resolveTarget(sim: Sim, k: Keyframe, who: Who, part: DragPart): Vector3 | null {
  const g: AthleteGoal | undefined = k[who];
  if (!g) return null;
  const ctl = sim.ctl[who];
  if (part === 'hips') return g.root ? ctl.resolve(g.root.at) : null;
  const lg = g.limbs?.[part];
  if (!lg) return null;
  if (lg.to) return ctl.resolve(lg.to);
  if (lg.mid) return ctl.resolve(lg.mid);
  return null;
}


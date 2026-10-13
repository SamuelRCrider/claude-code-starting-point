import type { AthleteGoal, Keyframe, LimbGoal, Ref } from '../game/goals';
import type { Landmark, V3 } from '../physics/skeleton';

// Building blocks for positions and techniques.
//
// World layout: the bottom athlete lies on their back with the head toward -Z and
// their LEFT toward +X. A top athlete facing the bottom's head faces -Z, so the
// top's left is the bottom's right (-X). Offsets in `other(...)`/`self(...)` refs
// are in the landmark segment's frame: +X = that athlete's left, +Y = toward their
// head, +Z = their front (for a supine athlete, +Z points up).

export const other = (at: Landmark, off?: V3, y?: number): Ref => ({ who: 'other', at, off, y });
export const self = (at: Landmark, off?: V3, y?: number): Ref => ({ who: 'self', at, off, y });
export const world = (x: number, y: number, z: number): Ref => ({ world: [x, y, z] });

export const MAT = 0.065; // height of a knee/hand planted on the mat

export type Side = 'L' | 'R';
export const opp = (s: Side): Side => (s === 'L' ? 'R' : 'L');
/** +1 for the athlete's left, -1 for their right (their local X). */
export const sx = (s: Side) => (s === 'L' ? 1 : -1);

/** Merge goals: later fields win, limbs merge per-limb. */
export function merge(...goals: (AthleteGoal | undefined)[]): AthleteGoal {
  const out: AthleteGoal = {};
  for (const g of goals) {
    if (!g) continue;
    if (g.pose !== undefined) out.pose = g.pose;
    if (g.root !== undefined) out.root = g.root;
    if (g.tension !== undefined) out.tension = g.tension;
    if (g.ghost !== undefined) out.ghost = g.ghost;
    if (g.reach !== undefined) out.reach = g.reach;
    if (g.joints) out.joints = { ...(out.joints ?? {}), ...g.joints };
    if (g.limbs) out.limbs = { ...(out.limbs ?? {}), ...g.limbs };
  }
  return out;
}

export function kf(top: AthleteGoal | undefined, bottom: AthleteGoal | undefined, dur = 0.8): Keyframe {
  return { top, bottom, dur };
}

export type Limbs = NonNullable<AthleteGoal['limbs']>;
export const limb = (g: LimbGoal) => g;

// ---------------------------------------------------------------------------
// Bottom-player building blocks (supine, head toward -Z).

export const SUPINE_ROT: V3 = [-90, 0, 0];

export const bottomSupine = (k = 0.6): AthleteGoal => ({
  pose: 'supine',
  root: { at: world(0, 0.12, 0), rot: SUPINE_ROT, k, rk: 1 },
});

/** Elbows tight, hands framing at the chest: the safe bottom posture. */
export const bottomFrames = (): Limbs => ({
  armL: { to: self('sternum', [0.07, 0.1, 0.13]), pole: [0.35, -1, 0] },
  armR: { to: self('sternum', [-0.07, 0.1, 0.13]), pole: [-0.35, -1, 0] },
});

/** Feet planted near the butt, knees up — ready to bridge. */
export const bottomFeetPlanted = (): Limbs => ({
  legL: { to: self('hipL', [0.02, -0.42, 0], 0.09), pole: [0.2, 0, 1] },
  legR: { to: self('hipR', [-0.02, -0.42, 0], 0.09), pole: [-0.2, 0, 1] },
});

// ---------------------------------------------------------------------------
// Top-player building blocks (facing the bottom's head, i.e. -Z).

export const FACE_HEAD: V3 = [0, 180, 0];
export const FACE_FEET: V3 = [0, 0, 0];

/** Knee planted on the mat beside a landmark of the bottom. `s` = top's side. */
export const kneeBeside = (s: Side, at: Landmark, out = 0.3, along = 0, bend?: number): LimbGoal => ({
  // Top's left is the bottom's right (-X in the bottom's frame) when facing the head.
  mid: other(at, [-sx(s) * out, along, 0], MAT),
  // Shins trail back along his legs, a little outward (partner's pelvis frame).
  lowerDir: [-sx(s) * 0.25, -1, 0.06],
  lowerIn: 'other',
  bend,
});

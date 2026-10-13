import type { JointName, Landmark, LimbName, SegName, V3 } from '../physics/skeleton';

/**
 * A point in the world described relative to a body, so goals keep working as
 * the athletes move. `off` is in the landmark segment's local frame
 * (+X = that athlete's left, +Y = toward their head, +Z = their front).
 * `y` pins the height above the mat (e.g. a knee planted on the mat).
 */
export type Ref =
  | { who: 'self' | 'other'; at: Landmark; off?: V3; y?: number }
  | { world: V3 };

export interface LimbGoal {
  /** Where the hand / heel goes. */
  to?: Ref;
  /** Where the elbow / knee goes (aims the upper bone; keeps `bend`). */
  mid?: Ref;
  /** Hinge angle in degrees when using `mid` (knee flex +, elbow flex -). */
  bend?: number;
  /** Direction (in the limb's parent frame: chest for arms, pelvis for legs) that the elbow/knee points. */
  pole?: V3;
  /** With `mid`: direction the lower bone travels (parent frame unless `lowerIn` says otherwise). */
  lowerDir?: V3;
  /** Frame for `lowerDir`: own parent segment (default), the partner's pelvis, or the world. */
  lowerIn?: 'parent' | 'other' | 'world';
  /** Close the hand / hook the foot onto the target once it's reached. */
  grip?: boolean;
  /** Extra reaching force on the hand/foot (Newtons), for grips and hooks. */
  pull?: number;
  /** Limb muscle tension multiplier. */
  tension?: number;
}

export type PoseAngles = Partial<Record<JointName, V3>>;

export interface AthleteGoal {
  /** Named base pose plus per-joint overrides (degrees, Euler XZY in parent frame). */
  pose?: string;
  joints?: PoseAngles;
  limbs?: Partial<Record<LimbName, LimbGoal>>;
  /**
   * Coach's hand on the hips: a soft spring toward a pelvis pose. `k` is the spring
   * bandwidth (rad/s); ~2 is a gentle nudge, ~6 is firm. Omit to leave the hips to physics.
   */
  root?: { at: Ref; rot?: V3 | [number, number, number, number]; k?: number; rk?: number };
  tension?: number;
  /**
   * Segments that slide through the partner instead of colliding: limbs threading
   * under a body or wrapping legs (hooks, guard), where capsule bodies would jam.
   */
  ghost?: SegName[];
  /**
   * Limbs held at very large shoulder/hip angles without bearing weight (seatbelt
   * arms, legs wrapped in a guard). They use a controller that stays accurate there.
   */
  reach?: LimbName[];
}

export interface Keyframe {
  top?: AthleteGoal;
  bottom?: AthleteGoal;
  /** Seconds to blend into this keyframe. */
  dur?: number;
}

import { Matrix4, Quaternion, Vector3 } from 'three';
import type { V3 } from '../physics/skeleton';

export type Q4 = [number, number, number, number];

/**
 * Orientation of an athlete's hips from two plain-language directions:
 * where the top of their head points, and where their belly/face points.
 * e.g. lying on the back with head toward -Z: orient([0,0,-1], [0,1,0]).
 */
export function orient(head: V3, front: V3): Q4 {
  const y = new Vector3(...head).normalize();
  const z = new Vector3(...front);
  z.addScaledVector(y, -z.dot(y)).normalize();
  const x = new Vector3().crossVectors(y, z);
  const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
  return [q.x, q.y, q.z, q.w];
}

/** Rotate an orientation about a world axis (degrees). */
export function turn(o: Q4, axis: V3, deg: number): Q4 {
  const r = new Quaternion().setFromAxisAngle(new Vector3(...axis).normalize(), (deg * Math.PI) / 180);
  const q = r.multiply(new Quaternion(...o));
  return [q.x, q.y, q.z, q.w];
}

/** Unit direction from degrees: tilt away from +Y toward a horizontal heading. */
export function dir(x: number, y: number, z: number): V3 {
  const v = new Vector3(x, y, z).normalize();
  return [v.x, v.y, v.z];
}

// Common orientations (bottom athlete's head toward -Z).
export const O = {
  supine: orient([0, 0, -1], [0, 1, 0]),
  supineHeadPlusZ: orient([0, 0, 1], [0, 1, 0]),
  prone: orient([0, 0, -1], [0, -1, 0]),
  onLeftSide: orient([0, 0, -1], [1, 0, 0]),
  onRightSide: orient([0, 0, -1], [-1, 0, 0]),
  /** Upright, facing the bottom's head. */
  uprightFacingHead: orient([0, 1, 0], [0, 0, -1]),
  uprightFacingFeet: orient([0, 1, 0], [0, 0, 1]),
};

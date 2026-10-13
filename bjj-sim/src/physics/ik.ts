import { Matrix4, Quaternion, Vector3 } from 'three';

const _m = new Matrix4();
const _x = new Vector3();
const _y = new Vector3();
const _z = new Vector3();
const _d = new Vector3();
const _p = new Vector3();
const _e = new Vector3();
const _inv = new Quaternion();

export interface TwoBoneResult {
  upperLocal: Quaternion; // upper segment relative to its parent
  midAngle: number; // hinge angle (radians, about local X)
  elbowWorld: Vector3;
}

/** Remove the component of `v` along unit `axis`, normalise; fall back if degenerate. */
function perpendicular(v: Vector3, axis: Vector3, fallback: Vector3, out: Vector3): Vector3 {
  out.copy(v).addScaledVector(axis, -v.dot(axis));
  if (out.lengthSq() < 1e-8) {
    out.copy(fallback).addScaledVector(axis, -fallback.dot(axis));
    if (out.lengthSq() < 1e-8) out.set(axis.y, axis.z, axis.x).cross(axis);
  }
  return out.normalize();
}

/**
 * Build a segment's world orientation from its bone direction (bones point down
 * local -Y in the rest pose) and a "front" hint that becomes local +Z.
 */
export function frameFromBone(boneDir: Vector3, front: Vector3, out: Quaternion): Quaternion {
  _y.copy(boneDir).normalize().negate();
  perpendicular(front, _y, new Vector3(0, 0, 1), _z);
  _x.crossVectors(_y, _z).normalize();
  _m.makeBasis(_x, _y, _z);
  return out.setFromRotationMatrix(_m);
}

/**
 * Analytic two-bone IK.
 * @param root     world position of the ball joint (shoulder / hip)
 * @param parentQ  world orientation of the parent segment (chest / pelvis)
 * @param l1,l2    bone lengths
 * @param target   world target for the end effector
 * @param pole     world direction the middle joint should point toward
 * @param bendSign +1 knee (shin folds backward, kneecap = local +Z), -1 elbow (forearm folds forward)
 */
export function solveTwoBone(
  root: Vector3,
  parentQ: Quaternion,
  l1: number,
  l2: number,
  target: Vector3,
  pole: Vector3,
  bendSign: 1 | -1,
  limits: [number, number],
): TwoBoneResult {
  _d.subVectors(target, root);
  let dist = _d.length();
  const dir = dist > 1e-6 ? _d.clone().divideScalar(dist) : new Vector3(0, -1, 0);
  dist = Math.min(Math.max(dist, Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3);

  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const a = Math.acos(Math.min(1, Math.max(-1, cosA)));
  perpendicular(pole, dir, new Vector3(0, 0, 1), _p);

  _e.copy(root).addScaledVector(dir, Math.cos(a) * l1).addScaledVector(_p, Math.sin(a) * l1);
  const upperDir = _e.clone().sub(root).normalize();
  const endPos = root.clone().addScaledVector(dir, dist);
  const lowerDir = endPos.clone().sub(_e).normalize();

  // Knee cap faces the pole (+Z front); the elbow point faces the pole (-Z back).
  const front = bendSign === 1 ? _p.clone() : _p.clone().negate();
  const upperWorld = frameFromBone(upperDir, front, new Quaternion());

  let bend = Math.acos(Math.min(1, Math.max(-1, upperDir.dot(lowerDir))));
  let mid = bendSign * bend;
  mid = Math.min(limits[1], Math.max(limits[0], mid));

  _inv.copy(parentQ).invert();
  return { upperLocal: _inv.clone().multiply(upperWorld), midAngle: mid, elbowWorld: _e.clone() };
}

/**
 * Point the upper bone at a world point (e.g. "knee goes here") and keep a given
 * hinge angle. `lowerHint` is the world direction the lower bone should travel
 * (e.g. shin lying back along the mat) and fixes the twist.
 */
export function solveAim(
  root: Vector3,
  parentQ: Quaternion,
  midPoint: Vector3,
  lowerHint: Vector3,
  midAngle: number,
  bendSign: 1 | -1,
): { upperLocal: Quaternion; midAngle: number } {
  const upperDir = midPoint.clone().sub(root).normalize();
  // For a knee the lower bone heads away from the knee cap, so front = -lowerHint.
  const front = bendSign === 1 ? lowerHint.clone().negate() : lowerHint.clone();
  const upperWorld = frameFromBone(upperDir, front, new Quaternion());
  return { upperLocal: parentQ.clone().invert().multiply(upperWorld), midAngle };
}

// Skeleton definition for one grappler.
//
// Rest pose: standing upright, arms hanging, facing +Z, Y up, origin on the mat
// between the feet. Every segment's local frame is identity in the rest pose, so
// a segment's local axes are: +X = athlete's LEFT, +Y = toward the head, +Z = front.
// Segment masses follow de Leva (1996) male percentages of total body mass.

export type SegName =
  | 'pelvis' | 'abdomen' | 'chest' | 'head'
  | 'upperArmL' | 'forearmL' | 'upperArmR' | 'forearmR'
  | 'thighL' | 'shinL' | 'footL' | 'thighR' | 'shinR' | 'footR';

export type JointName =
  | 'lumbar' | 'thoracic' | 'neck'
  | 'shoulderL' | 'elbowL' | 'shoulderR' | 'elbowR'
  | 'hipL' | 'kneeL' | 'ankleL' | 'hipR' | 'kneeR' | 'ankleR';

export type V3 = [number, number, number];

export type Shape =
  | { kind: 'capsule'; radius: number; halfHeight: number }
  | { kind: 'box'; half: V3; round: number }
  | { kind: 'ball'; radius: number };

export interface SegmentDef {
  name: SegName;
  center: V3; // rest-pose world position of the body origin
  shape: Shape;
  massPct: number; // % of total body mass
}

export interface JointDef {
  name: JointName;
  parent: SegName;
  child: SegName;
  anchor: V3; // rest-pose world position of the joint
  hinge?: V3; // revolute axis (local == world in rest pose); omitted = ball joint
  limits?: [number, number]; // radians, hinge only
  // Muscle strength: max torque (N·m) for an 80 kg athlete.
  maxTorque: number;
}

export const SEGMENTS: SegmentDef[] = [
  { name: 'pelvis', center: [0, 0.95, 0], shape: { kind: 'box', half: [0.13, 0.07, 0.09], round: 0.03 }, massPct: 11.17 },
  { name: 'abdomen', center: [0, 1.115, 0], shape: { kind: 'box', half: [0.12, 0.065, 0.08], round: 0.03 }, massPct: 16.33 },
  { name: 'chest', center: [0, 1.33, 0], shape: { kind: 'box', half: [0.15, 0.12, 0.085], round: 0.04 }, massPct: 15.96 },
  { name: 'head', center: [0, 1.62, 0.01], shape: { kind: 'ball', radius: 0.105 }, massPct: 6.94 },

  { name: 'upperArmL', center: [0.215, 1.295, 0], shape: { kind: 'capsule', radius: 0.05, halfHeight: 0.095 }, massPct: 2.71 },
  { name: 'forearmL', center: [0.215, 0.985, 0], shape: { kind: 'capsule', radius: 0.042, halfHeight: 0.123 }, massPct: 2.23 },
  { name: 'upperArmR', center: [-0.215, 1.295, 0], shape: { kind: 'capsule', radius: 0.05, halfHeight: 0.095 }, massPct: 2.71 },
  { name: 'forearmR', center: [-0.215, 0.985, 0], shape: { kind: 'capsule', radius: 0.042, halfHeight: 0.123 }, massPct: 2.23 },

  { name: 'thighL', center: [0.095, 0.71, 0], shape: { kind: 'capsule', radius: 0.07, halfHeight: 0.14 }, massPct: 14.16 },
  { name: 'shinL', center: [0.095, 0.29, 0], shape: { kind: 'capsule', radius: 0.05, halfHeight: 0.16 }, massPct: 4.33 },
  { name: 'footL', center: [0.095, 0.035, 0.05], shape: { kind: 'box', half: [0.04, 0.025, 0.1], round: 0.01 }, massPct: 1.37 },
  { name: 'thighR', center: [-0.095, 0.71, 0], shape: { kind: 'capsule', radius: 0.07, halfHeight: 0.14 }, massPct: 14.16 },
  { name: 'shinR', center: [-0.095, 0.29, 0], shape: { kind: 'capsule', radius: 0.05, halfHeight: 0.16 }, massPct: 4.33 },
  { name: 'footR', center: [-0.095, 0.035, 0.05], shape: { kind: 'box', half: [0.04, 0.025, 0.1], round: 0.01 }, massPct: 1.37 },
];

const D = Math.PI / 180;

// Hinge axis conventions (right-hand rule, rest pose):
//   knee: +X rotation swings the shin backward  -> flexion is positive
//   elbow: -X rotation swings the forearm forward -> flexion is negative
export const JOINTS: JointDef[] = [
  { name: 'lumbar', parent: 'pelvis', child: 'abdomen', anchor: [0, 1.03, 0], maxTorque: 420 },
  { name: 'thoracic', parent: 'abdomen', child: 'chest', anchor: [0, 1.2, 0], maxTorque: 380 },
  { name: 'neck', parent: 'chest', child: 'head', anchor: [0, 1.5, 0], maxTorque: 90 },

  { name: 'shoulderL', parent: 'chest', child: 'upperArmL', anchor: [0.215, 1.44, 0], maxTorque: 150 },
  { name: 'elbowL', parent: 'upperArmL', child: 'forearmL', anchor: [0.215, 1.15, 0], hinge: [1, 0, 0], limits: [-150 * D, 2 * D], maxTorque: 110 },
  { name: 'shoulderR', parent: 'chest', child: 'upperArmR', anchor: [-0.215, 1.44, 0], maxTorque: 150 },
  { name: 'elbowR', parent: 'upperArmR', child: 'forearmR', anchor: [-0.215, 1.15, 0], hinge: [1, 0, 0], limits: [-150 * D, 2 * D], maxTorque: 110 },

  { name: 'hipL', parent: 'pelvis', child: 'thighL', anchor: [0.095, 0.92, 0], maxTorque: 420 },
  { name: 'kneeL', parent: 'thighL', child: 'shinL', anchor: [0.095, 0.5, 0], hinge: [1, 0, 0], limits: [-2 * D, 155 * D], maxTorque: 320 },
  { name: 'ankleL', parent: 'shinL', child: 'footL', anchor: [0.095, 0.08, 0], hinge: [1, 0, 0], limits: [-45 * D, 30 * D], maxTorque: 120 },
  { name: 'hipR', parent: 'pelvis', child: 'thighR', anchor: [-0.095, 0.92, 0], maxTorque: 420 },
  { name: 'kneeR', parent: 'thighR', child: 'shinR', anchor: [-0.095, 0.5, 0], hinge: [1, 0, 0], limits: [-2 * D, 155 * D], maxTorque: 320 },
  { name: 'ankleR', parent: 'shinR', child: 'footR', anchor: [-0.095, 0.08, 0], hinge: [1, 0, 0], limits: [-45 * D, 30 * D], maxTorque: 120 },
];

export const SEG_INDEX: Record<SegName, number> = Object.fromEntries(
  SEGMENTS.map((s, i) => [s.name, i]),
) as Record<SegName, number>;

export const JOINT_BY_CHILD: Partial<Record<SegName, JointDef>> = Object.fromEntries(
  JOINTS.map((j) => [j.child, j]),
);

export const JOINT_BY_NAME: Record<JointName, JointDef> = Object.fromEntries(
  JOINTS.map((j) => [j.name, j]),
) as Record<JointName, JointDef>;

// Topological order (parents before children) for forward kinematics.
export const FK_ORDER: SegName[] = (() => {
  const out: SegName[] = ['pelvis'];
  while (out.length < SEGMENTS.length) {
    for (const j of JOINTS) if (out.includes(j.parent) && !out.includes(j.child)) out.push(j.child);
  }
  return out;
})();

// Limb chains used by IK. `root` joint is a ball joint, `mid` is a hinge.
export type LimbName = 'armL' | 'armR' | 'legL' | 'legR';
export interface LimbDef {
  name: LimbName;
  upper: SegName;
  lower: SegName;
  rootJoint: JointName;
  midJoint: JointName;
  // End-effector point in the LOWER segment's local frame (fist / heel).
  endLocal: V3;
}

export const LIMBS: Record<LimbName, LimbDef> = {
  armL: { name: 'armL', upper: 'upperArmL', lower: 'forearmL', rootJoint: 'shoulderL', midJoint: 'elbowL', endLocal: [0, -0.165, 0] },
  armR: { name: 'armR', upper: 'upperArmR', lower: 'forearmR', rootJoint: 'shoulderR', midJoint: 'elbowR', endLocal: [0, -0.165, 0] },
  legL: { name: 'legL', upper: 'thighL', lower: 'shinL', rootJoint: 'hipL', midJoint: 'kneeL', endLocal: [0, -0.21, 0] },
  legR: { name: 'legR', upper: 'thighR', lower: 'shinR', rootJoint: 'hipR', midJoint: 'kneeR', endLocal: [0, -0.21, 0] },
};

export function segDef(name: SegName): SegmentDef {
  return SEGMENTS[SEG_INDEX[name]];
}

// Joint anchor expressed in a segment's local frame (rest pose offset).
export function anchorIn(seg: SegName, anchor: V3): V3 {
  const c = segDef(seg).center;
  return [anchor[0] - c[0], anchor[1] - c[1], anchor[2] - c[2]];
}

// Named landmarks on the body, in segment-local coordinates. Content uses these
// to define targets and checks ("put your hand on his near armpit").
export const LANDMARKS = {
  hipsCenter: { seg: 'pelvis', p: [0, 0, 0] },
  belly: { seg: 'abdomen', p: [0, 0, 0.09] },
  sternum: { seg: 'chest', p: [0, 0.02, 0.1] },
  upperBack: { seg: 'chest', p: [0, 0.03, -0.1] },
  armpitL: { seg: 'chest', p: [0.17, 0.05, -0.02] },
  armpitR: { seg: 'chest', p: [-0.17, 0.05, -0.02] },
  // Behind the shoulder blade, where an underhooking hand ends up.
  shoulderBladeL: { seg: 'chest', p: [0.13, 0.08, -0.13] },
  shoulderBladeR: { seg: 'chest', p: [-0.13, 0.08, -0.13] },
  backOfHead: { seg: 'head', p: [0, 0.02, -0.11] },
  ear_L: { seg: 'head', p: [0.11, 0, 0] },
  ear_R: { seg: 'head', p: [-0.11, 0, 0] },
  chin: { seg: 'head', p: [0, -0.08, 0.07] },
  hipL: { seg: 'pelvis', p: [0.15, 0, 0] },
  hipR: { seg: 'pelvis', p: [-0.15, 0, 0] },
  kneeL: { seg: 'shinL', p: [0, 0.2, 0.03] },
  kneeR: { seg: 'shinR', p: [0, 0.2, 0.03] },
  elbowL: { seg: 'forearmL', p: [0, 0.15, 0] },
  elbowR: { seg: 'forearmR', p: [0, 0.15, 0] },
  wristL: { seg: 'forearmL', p: [0, -0.1, 0] },
  wristR: { seg: 'forearmR', p: [0, -0.1, 0] },
  handL: { seg: 'forearmL', p: [0, -0.165, 0] },
  handR: { seg: 'forearmR', p: [0, -0.165, 0] },
  footL: { seg: 'footL', p: [0, 0, 0.02] },
  footR: { seg: 'footR', p: [0, 0, 0.02] },
  heelL: { seg: 'shinL', p: [0, -0.21, 0] },
  heelR: { seg: 'shinR', p: [0, -0.21, 0] },
} as const satisfies Record<string, { seg: SegName; p: V3 }>;

export type Landmark = keyof typeof LANDMARKS;

// Reusable whole-body shapes. Each returns an AthleteGoal written relative to
// "other" (the partner), so the same shape works whichever color plays it.
import type { AthleteGoal, Ref } from '../game/goals';
import type { V3 } from '../physics/skeleton';
import { MAT, kneeBeside, merge, other, self, world, type Side } from './frames';
import { Quaternion, Vector3 } from 'three';
import { O, orient, turn, type Q4 } from './orient';

export const supineAt = (x: number, z: number, rot: Q4 = O.supine, k = 0.6): AthleteGoal => ({
  pose: 'supine',
  root: { at: world(x, 0.12, z), rot, k, rk: 1 },
});

export const framesTight = (): AthleteGoal['limbs'] => ({
  armL: { to: self('sternum', [0.07, 0.1, 0.13]), pole: [0.35, -1, 0] },
  armR: { to: self('sternum', [-0.07, 0.1, 0.13]), pole: [-0.35, -1, 0] },
});

export const feetPlanted = (): AthleteGoal['limbs'] => ({
  legL: { to: self('hipL', [0.02, -0.42, 0], 0.09), pole: [0.2, 0, 1] },
  legR: { to: self('hipR', [-0.02, -0.42, 0], 0.09), pole: [-0.2, 0, 1] },
});

// --------------------------------------------------------------------- mount

/** Mounted top. `high` slides the knees toward the armpits. `lean` (deg) brings the chest down. */
export function mountTop(opts: { high?: boolean; lean?: number; hands?: 'chest' | 'post' | 'free' } = {}): AthleteGoal {
  const lean = opts.lean ?? 10;
  const high = opts.high ?? false;
  const r = (lean * Math.PI) / 180;
  const rot = orient([0, Math.cos(r), -Math.sin(r)], [0, -Math.sin(r), -Math.cos(r)]);
  const hands = opts.hands ?? 'chest';
  const arms: AthleteGoal['limbs'] =
    hands === 'chest'
      ? {
          armL: { to: other('sternum', [-0.09, 0.03, 0.06]), pole: [0.4, -0.3, -1] },
          armR: { to: other('sternum', [0.09, 0.03, 0.06]), pole: [-0.4, -0.3, -1] },
        }
      : hands === 'post'
        ? {
            armL: { to: other('ear_R', [-0.16, 0.02, 0], MAT), pole: [0.6, -0.2, -1] },
            armR: { to: other('ear_L', [0.16, 0.02, 0], MAT), pole: [-0.6, -0.2, -1] },
          }
        : {};
  return {
    pose: 'straddle',
    joints: { lumbar: [lean * 0.25, 0, 0], thoracic: [lean * 0.2, 0, 0], neck: [-lean * 0.3, 0, 0] },
    root: { at: other('belly', [0, high ? 0.22 : 0.0, 0.12]), rot, k: 2.5, rk: 2 },
    limbs: {
      legL: kneeBeside('L', 'belly', high ? 0.24 : 0.27, high ? 0.3 : 0.06),
      legR: kneeBeside('R', 'belly', high ? 0.24 : 0.27, high ? 0.3 : 0.06),
      ...arms,
    },
  };
}

export const mountBottom = (): AthleteGoal => merge(supineAt(0, 0), { limbs: { ...framesTight(), ...feetPlanted() } });

// --------------------------------------------------------------------- closed guard

/**
 * Guard player on their back at (x, z), head toward -Z, legs locked around
 * the partner's waist.
 */
export function guardPlayer(x = 0, z = 0, opts: { grips?: 'sleeves' | 'collar' | 'none' } = {}): AthleteGoal {
  const grips = opts.grips ?? 'sleeves';
  return {
    pose: 'supine',
    joints: { neck: [30, 0, 0] },
    root: { at: world(x, 0.12, z), rot: O.supine, k: 0.8, rk: 1 },
    ghost: ['shinL', 'shinR', 'footL', 'footR'],
    reach: ['legL', 'legR'],
    limbs: {
      // Ankles cross behind the partner's lower back.
      legL: { to: other('hipR', [-0.2, 0.04, -0.25]), pole: [0.8, 0, 0.6], tension: 1.2 },
      legR: { to: other('hipL', [0.2, 0.0, -0.3]), pole: [-0.8, 0, 0.6], tension: 1.2 },
      ...(grips === 'sleeves'
        ? { armL: { to: other('wristR'), pole: [0.5, -1, 0], grip: true }, armR: { to: other('wristL'), pole: [-0.5, -1, 0], grip: true } }
        : grips === 'collar'
          ? { armL: { to: other('sternum', [-0.05, 0.12, 0.1]), pole: [0.5, -1, 0] }, armR: { to: other('sternum', [0.05, 0.12, 0.1]), pole: [-0.5, -1, 0] } }
          : framesTight()),
    },
  };
}

/** Kneeling inside someone's guard, posture up, hands on their hips. */
export function inGuard(opts: { posture?: 'up' | 'broken'; at?: Ref; rot?: Q4 } = {}): AthleteGoal {
  const broken = opts.posture === 'broken';
  const lean = broken ? 55 : 5;
  const r = (lean * Math.PI) / 180;
  return {
    pose: broken ? 'heavyChest' : 'kneel',
    root: {
      at: opts.at ?? other('hipsCenter', [0, -0.36, broken ? 0.22 : 0.28]),
      rot: opts.rot ?? orient([0, Math.cos(r), -Math.sin(r)], [0, -Math.sin(r), -Math.cos(r)]),
      k: 2.5, rk: 2,
    },
    limbs: {
      // Knees planted wide in front of your own hips (combat base), shins back.
      legL: { mid: self('hipL', [0.1, 0, 0.3], MAT), lowerDir: [0.1, -0.3, -1] },
      legR: { mid: self('hipR', [-0.1, 0, 0.3], MAT), lowerDir: [-0.1, -0.3, -1] },
      armL: broken ? { to: other('sternum', [-0.18, 0.1, 0.05]), pole: [0.5, -0.3, -1] } : { to: other('hipR', [0.02, 0.06, 0.09]), pole: [0.5, -0.3, -1] },
      armR: broken ? { to: other('sternum', [0.18, 0.1, 0.05]), pole: [-0.5, -0.3, -1] } : { to: other('hipL', [-0.02, 0.06, 0.09]), pole: [-0.5, -0.3, -1] },
    },
  };
}

// --------------------------------------------------------------------- helpers

/** Which of an athlete's sides ('L'/'R') points along a world direction, given hips orientation. */
export function sideToward(rot: Q4, worldDir: V3): Side {
  const q = new Quaternion(...rot);
  const left = new Vector3(1, 0, 0).applyQuaternion(q);
  return left.dot(new Vector3(...worldDir)) >= 0 ? 'L' : 'R';
}
const arm = (s: Side) => (s === 'L' ? 'armL' : 'armR') as 'armL' | 'armR';
const leg = (s: Side) => (s === 'L' ? 'legL' : 'legR') as 'legL' | 'legR';
const flip = (s: Side): Side => (s === 'L' ? 'R' : 'L');

// --------------------------------------------------------------------- side control

/**
 * Side control from the bottom athlete's LEFT (+X): chest across his chest,
 * head over the far side, knees blocking his near hip and shoulder.
 */
export function sideControlTop(opts: { crossface?: boolean; underhook?: boolean; hipsHigh?: boolean } = {}): AthleteGoal {
  const rot = orient([-1, 0.35, 0.05], [0, -1, 0]);
  const headSide = sideToward(rot, [0, 0, -1]); // the arm/knee nearer his head
  const hipSide = flip(headSide);
  const crossface = opts.crossface ?? true;
  const underhook = opts.underhook ?? true;
  return {
    pose: 'heavyChest',
    joints: { lumbar: [5, 0, 0], thoracic: [5, 0, 0], neck: [-15, 0, 0] },
    root: { at: other('belly', [0.32, 0.12, opts.hipsHigh ? 0.3 : 0.1]), rot, k: 3, rk: 2.2 },
    limbs: {
      // Crossface: near-head arm under his neck, shoulder in his jaw.
      [arm(headSide)]: crossface
        ? { to: other('ear_R', [-0.02, -0.02, -0.06]), pole: [0, -1, 0.3] }
        : { to: other('ear_L', [0.18, 0.02, 0], MAT), pole: [0, -1, 0.3] },
      // Far-side underhook (or hand blocking his near hip).
      [arm(hipSide)]: underhook
        ? { to: other('shoulderBladeR', [0.02, -0.04, -0.03]), pole: [0, -1, 0.3] }
        : { to: other('hipL', [0.08, 0, 0.06]), pole: [0, -1, 0.3] },
      // Knees tight: one to his near hip, one to his near shoulder.
      [leg(hipSide)]: { mid: other('hipL', [0.33, 0.0, 0], MAT), lowerDir: [1, 0.15, 0.05], lowerIn: 'other' },
      [leg(headSide)]: { mid: other('armpitL', [0.33, -0.05, 0], MAT), lowerDir: [1, -0.15, 0.05], lowerIn: 'other' },
    },
  };
}

/** Pinned under side control (from his left): near forearm in the neck, far hand on the hip. */
export function sideControlBottom(): AthleteGoal {
  return merge(supineAt(0, 0), {
    joints: { neck: [25, 0, 0] },
    limbs: {
      armL: { to: self('sternum', [0.12, 0.16, 0.2]), pole: [0.4, -1, 0] },
      armR: { to: self('sternum', [0.12, -0.02, 0.22]), pole: [-0.6, -1, 0] },
      legL: { to: self('hipL', [0.06, -0.42, 0], 0.09), pole: [0.5, 0, 1] },
      legR: { to: self('hipR', [-0.02, -0.42, 0], 0.09), pole: [-0.2, 0, 1] },
    },
  });
}

// --------------------------------------------------------------------- half guard

/** Top in half guard: his RIGHT leg trapped between the bottom's legs, chest heavy, crossface. */
export function halfGuardTop(): AthleteGoal {
  const lean = 55;
  const r = (lean * Math.PI) / 180;
  return {
    pose: 'heavyChest',
    root: { at: other('belly', [-0.06, -0.06, 0.13]), rot: orient([0, Math.cos(r), -Math.sin(r)], [0, -Math.sin(r), -Math.cos(r)]), k: 2.5, rk: 2 },
    limbs: {
      // Free (left) knee outside his right hip; trapped (right) knee between his thighs.
      legL: { mid: other('hipR', [-0.2, 0.05, 0], MAT), lowerDir: [-0.3, -1, 0.06], lowerIn: 'other' },
      legR: { mid: other('hipsCenter', [0.04, -0.3, 0], MAT), lowerDir: [0.1, -1, 0.06], lowerIn: 'other' },
      armL: { to: other('ear_L', [0.02, -0.02, -0.06]), pole: [0.4, -0.4, -1] },
      armR: { to: other('ear_L', [0.18, 0.05, 0], MAT), pole: [-0.4, -0.4, -1] },
    },
  };
}

/** Bottom in half guard: turned to the side, legs locked on his right leg, underhook. */
export function halfGuardBottom(opts: { underhook?: boolean } = {}): AthleteGoal {
  return {
    pose: 'supine',
    joints: { neck: [30, 0, 0] },
    root: { at: world(0, 0.13, 0), rot: turn(O.supine, [0, 0, 1], -20), k: 0.8, rk: 1 },
    ghost: ['shinL', 'shinR', 'footL', 'footR', 'forearmL'],
    limbs: {
      // Left leg hooks over his calf, right leg under: his right leg is trapped.
      legL: { to: other('kneeR', [0.0, -0.12, -0.04], 0.12), pole: [0.6, 0, 0.8] },
      legR: { to: other('kneeR', [0.0, -0.05, 0.09], 0.1), pole: [-0.4, 0, 1] },
      armL: opts.underhook ?? true
        ? { to: other('shoulderBladeR', [0, -0.03, -0.03]), pole: [0.6, -0.5, 0] }
        : { to: self('sternum', [0.07, 0.1, 0.13]), pole: [0.35, -1, 0] },
      armR: { to: other('sternum', [0.08, 0.14, 0.1]), pole: [-0.5, -1, 0] },
    },
  };
}

// --------------------------------------------------------------------- back control

const backRot = (recline: number): Q4 => {
  const r = (recline * Math.PI) / 180;
  return orient([0, Math.cos(r), Math.sin(r)], [0, Math.sin(r), -Math.cos(r)]);
};

/** Attacker sitting behind, chest to his back, hooks in, seatbelt (right arm over the shoulder). */
export function backTop(opts: { choke?: boolean } = {}): AthleteGoal {
  return {
    pose: 'sit',
    // Head tucked beside his, on the under-arm side.
    joints: { lumbar: [10, 0, 0], thoracic: [8, 0, 0], neck: [20, -15, -20] },
    root: { at: world(0, 0.13, 0.28), rot: backRot(40), k: 3, rk: 2.5 },
    ghost: ['head', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR', 'forearmL', 'forearmR'],
    reach: ['armL', 'armR', 'legL', 'legR'],
    limbs: {
      // Heels inside his thighs, knees out.
      legL: { to: world(-0.07, 0.15, -0.24), pole: [1, 0.5, 0.4] },
      legR: { to: world(0.07, 0.15, -0.24), pole: [-1, 0.5, 0.4] },
      armR: opts.choke
        ? { to: other('chin', [0.12, -0.02, 0.0]), pole: [-0.2, 0.3, -1] }
        : { to: other('sternum', [0.07, -0.04, 0.08]), pole: [-1, 0.25, -0.3] },
      armL: opts.choke
        ? { to: other('backOfHead', [0.02, 0.04, -0.02]), pole: [0.6, 0.6, 0] }
        : { to: other('sternum', [0.03, -0.1, 0.08]), pole: [0.5, -0.6, 0.2] },
    },
  };
}

/** Defender sitting in front, leaning back into him, two hands on the choking arm. */
export function backBottom(): AthleteGoal {
  return {
    pose: 'sit',
    joints: { lumbar: [8, 0, 0], thoracic: [5, 0, 0], neck: [25, 0, 0] },
    root: { at: world(0, 0.16, 0.02), rot: backRot(38), k: 2.5, rk: 2 },
    ghost: ['forearmL', 'forearmR'],
    reach: ['armL', 'armR'],
    limbs: {
      armL: { to: other('wristR', [0, 0.04, 0]), pole: [0.6, -0.5, 0] },
      armR: { to: other('elbowR', [0, -0.04, 0]), pole: [-0.6, -0.5, 0] },
      legL: { to: world(-0.2, 0.09, -0.62), pole: [-0.5, 0.3, 1] },
      legR: { to: world(0.2, 0.09, -0.62), pole: [0.5, 0.3, 1] },
    },
  };
}

// --------------------------------------------------------------------- knee on belly

/** Knee on belly from his left side: shin across the belly, base foot out wide. */
export function kneeOnBellyTop(): AthleteGoal {
  const rot = orient([-0.2, 1, 0.05], [-1, -0.15, 0.05]);
  const hipSide = sideToward(rot, [0, 0, 1]);
  return {
    pose: 'kneel',
    joints: { lumbar: [12, 0, 0], thoracic: [5, 0, 0], neck: [15, 0, 0] },
    root: { at: world(0.3, 0.58, -0.1), rot, k: 4, rk: 4 },
    limbs: {
      [leg(hipSide)]: { mid: world(0.02, 0.27, -0.1), lowerDir: [-1, -0.25, 0.5], lowerIn: 'world' },
      [leg(flip(hipSide))]: { to: world(0.82, 0.09, -0.22), pole: [0, 0, 1] },
      [arm(hipSide)]: { to: other('hipL', [0.05, 0.02, 0.09]), pole: [0.3, -0.5, -1] },
      [arm(flip(hipSide))]: { to: other('sternum', [-0.04, 0.1, 0.1]), pole: [-0.3, -0.5, -1] },
    },
  };
}

// --------------------------------------------------------------------- north-south

/** Chest on his chest, facing his hips, arms under his armpits. */
export function northSouthTop(): AthleteGoal {
  const rot = orient([0, 0.25, 1], [0, -1, 0.25]);
  return {
    pose: 'heavyChest',
    joints: { neck: [-25, 0, 0] },
    root: { at: world(0, 0.33, -0.9), rot, k: 2.5, rk: 2 },
    limbs: {
      legL: { mid: self('hipL', [0.12, -0.05, 0.3], MAT), lowerDir: [0.1, -1, 0.1] },
      legR: { mid: self('hipR', [-0.12, -0.05, 0.3], MAT), lowerDir: [-0.1, -1, 0.1] },
      armL: { to: other('armpitL', [0.04, -0.06, -0.06]), pole: [0.6, -0.5, -0.5] },
      armR: { to: other('armpitR', [-0.04, -0.06, -0.06]), pole: [-0.6, -0.5, -0.5] },
    },
  };
}

// --------------------------------------------------------------------- turtle

export const TURTLE_ROT: Q4 = orient([0, 0.25, -1], [0, -1, -0.25]);

/** Turtled: knees and elbows together, back rounded, chin tucked. */
export function turtleBottom(): AthleteGoal {
  return {
    pose: 'turtle',
    root: { at: world(0, 0.4, 0.05), rot: TURTLE_ROT, k: 1.5, rk: 2 },
    limbs: {
      legL: { mid: self('hipL', [0.02, 0.06, 0.32], MAT), lowerDir: [0, -1, 0.1] },
      legR: { mid: self('hipR', [-0.02, 0.06, 0.32], MAT), lowerDir: [0, -1, 0.1] },
      armL: { mid: self('hipL', [0.0, 0.3, 0.36], MAT), lowerDir: [0, 0.3, 1], bend: -120 },
      armR: { mid: self('hipR', [0.0, 0.3, 0.36], MAT), lowerDir: [0, 0.3, 1], bend: -120 },
    },
  };
}

/** On a turtled opponent's LEFT side, chest on his back, seatbelt grip. */
export function turtleTop(): AthleteGoal {
  const rot = orient([0.8, 0.45, -0.3], [0.4, -0.85, 0.1]);
  const headSide = sideToward(rot, [0, 0, -1]);
  return {
    pose: 'heavyChest',
    root: { at: other('hipsCenter', [0.34, 0.12, -0.3]), rot, k: 2.5, rk: 2 },
    limbs: {
      [leg(headSide)]: { mid: self('hipL', [0.0, -0.05, 0.32], MAT), lowerDir: [0, -1, 0.1] },
      [leg(flip(headSide))]: { mid: self('hipR', [0.0, -0.05, 0.32], MAT), lowerDir: [0, -1, 0.1] },
      // Over the far shoulder and under the near armpit, hands meeting on his chest.
      [arm(headSide)]: { to: other('sternum', [0.0, 0.04, 0.12]), pole: [0, 1, 0] },
      [arm(flip(headSide))]: { to: other('sternum', [0.06, -0.06, 0.12]), pole: [0, -1, 0] },
    },
  };
}

export const v = (x: number, y: number, z: number): V3 => [x, y, z];
export { turn, orient, O };

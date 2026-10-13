import type { Technique } from '../types';
import { MAT, merge, other, self, world } from '../frames';
import { O, orient, turn } from '../orient';
import { guardPlayer, inGuard, mountBottom, mountTop, supineAt } from '../shapes';

// Closed guard: White (bottom) on their back, head toward -Z, legs around Blue's
// waist. Blue kneels facing -Z; Blue's RIGHT arm is on White's LEFT (+X).

const brokenPosture = inGuard({ posture: 'broken' });

export const GUARD_TECHNIQUES: Technique[] = [
  {
    id: 'guard-armbar',
    name: 'Armbar from guard',
    kind: 'submission',
    role: 'bottom',
    from: 'closed-guard',
    summary: 'Pin his arm to your chest, swing your hips out to an angle, throw a leg over his face and extend.',
    mistakes: [
      'Staying square: without the hip angle your leg cannot get over his head.',
      'Letting his elbow slip below your hips: keep the arm high on your chest.',
      'Knees apart at the finish: he pulls the arm out and stacks you.',
    ],
    steps: [
      {
        say: 'Break his posture: pull him down with your knees and collar grip.',
        why: 'A bent-over opponent has his arms near your chest, where you can catch them.',
        drag: { who: 'top', part: 'hips' },
        intent: 'Pull him down',
        key: { top: brokenPosture, bottom: guardPlayer(0, 0, { grips: 'collar' }), dur: 1.0 },
      },
      {
        say: 'Cross-grip his right wrist and pin it to your chest.',
        drag: { who: 'bottom', part: 'armR' },
        intent: 'Pin the arm',
        key: {
          bottom: merge(guardPlayer(0, 0, { grips: 'collar' }), { limbs: { armR: { to: other('wristR'), pole: [-0.5, -1, 0], grip: true } } }),
          top: merge(brokenPosture, { limbs: { armR: { to: other('sternum', [0.05, 0.02, 0.12]), pole: [-0.5, -0.3, -1], tension: 0.6 } } }),
          dur: 0.9,
        },
      },
      {
        say: 'Foot on his hip, swing your hips out to the right: make an angle.',
        why: 'Turning perpendicular puts your leg in line with his head.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Get the angle',
        key: {
          bottom: {
            pose: 'supine',
            root: { at: world(-0.18, 0.12, 0.05), rot: turn(O.supine, [0, 1, 0], -35), k: 3, rk: 2.5 },
            ghost: ['shinL', 'shinR', 'footL', 'footR'],
            reach: ['legR'],
            limbs: {
              legL: { to: other('hipL', [0.05, 0, 0.1]), pole: [0.8, 0, 0.6] },
              legR: { to: other('shoulderBladeR', [-0.05, 0.05, -0.1]), pole: [-0.6, 0, 0.8] },
              armR: { to: other('wristR'), pole: [-0.5, -1, 0], grip: true },
              armL: { to: other('elbowR'), pole: [0.5, -1, 0], grip: true },
            },
          },
          dur: 1.0,
        },
      },
      {
        say: 'Swing your left leg over his face and pinch your knees.',
        drag: { who: 'bottom', part: 'legL' },
        intent: 'Leg over',
        cinematic: true,
        key: {
          bottom: {
            pose: 'supine',
            root: { at: world(-0.2, 0.13, 0.1), rot: turn(O.supine, [0, 1, 0], -55), k: 3, rk: 2.5 },
            ghost: ['thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'],
            reach: ['legL', 'legR'],
            limbs: {
              legL: { to: other('ear_L', [0.12, 0.1, 0.12]), pole: [0.4, 0.4, 1] },
              legR: { to: other('shoulderBladeR', [-0.05, 0.05, -0.12]), pole: [-0.6, 0, 0.8] },
              armR: { to: other('wristR'), grip: true },
              armL: { to: other('wristR', [0, 0.06, 0]), grip: true },
            },
          },
          top: merge(brokenPosture, { limbs: { armR: { to: other('sternum', [-0.02, 0.02, 0.2]), tension: 0.3 } } }),
          dur: 1.1,
        },
      },
      {
        say: 'Thumb up, lift your hips into his elbow. Slowly. Tap.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Finish',
        key: {
          bottom: {
            pose: 'supine',
            joints: { lumbar: [-10, 0, 0] },
            root: { at: world(-0.2, 0.2, 0.1), rot: turn(turn(O.supine, [0, 1, 0], -55), [1, 0, 0], -10), k: 3, rk: 2.5 },
            ghost: ['thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'],
            reach: ['legL', 'legR'],
            limbs: {
              legL: { to: other('ear_L', [0.12, 0.1, 0.12]), pole: [0.4, 0.4, 1] },
              legR: { to: other('shoulderBladeR', [-0.05, 0.05, -0.12]), pole: [-0.6, 0, 0.8] },
              armR: { to: other('wristR'), grip: true },
              armL: { to: other('wristR', [0, 0.06, 0]), grip: true },
            },
          },
          dur: 1.2,
        },
      },
    ],
  },

  {
    id: 'scissor-sweep',
    name: 'Scissor sweep',
    kind: 'sweep',
    role: 'bottom',
    from: 'closed-guard',
    to: 'mount',
    summary: 'Sleeve and collar, shin across his belly, chop his knee and scissor him over into mount.',
    mistakes: [
      'No grips: without the sleeve he just posts his hand and stops the sweep.',
      'Bottom leg chopping the side of his knee instead of behind it.',
    ],
    steps: [
      {
        say: 'Open your guard. Grip his right sleeve and his left collar.',
        drag: { who: 'bottom', part: 'armL' },
        intent: 'Grips',
        key: {
          bottom: merge(guardPlayer(0, 0, { grips: 'none' }), {
            limbs: {
              armL: { to: other('wristR'), pole: [0.5, -1, 0], grip: true },
              armR: { to: other('sternum', [-0.06, 0.15, 0.09]), pole: [-0.5, -1, 0], grip: true },
              legL: { to: self('hipL', [0.05, -0.45, 0], 0.09), pole: [0.3, 0, 1] },
              legR: { to: self('hipR', [-0.05, -0.45, 0], 0.09), pole: [-0.3, 0, 1] },
            },
          }),
          dur: 0.9,
        },
      },
      {
        say: 'Shrimp to your right and slide your right shin across his belly.',
        why: 'The shin is the blade of the scissor. Knee by his left hip.',
        drag: { who: 'bottom', part: 'legR' },
        intent: 'Shin across',
        key: {
          bottom: {
            pose: 'sideLying',
            root: { at: world(-0.12, 0.13, 0.02), rot: turn(O.supine, [0, 0, 1], 35), k: 3, rk: 2.5 },
            ghost: ['shinR', 'footR'],
            limbs: {
              armL: { to: other('wristR'), pole: [0.5, -1, 0], grip: true },
              armR: { to: other('sternum', [-0.06, 0.15, 0.09]), pole: [-0.5, -1, 0], grip: true },
              legR: { to: other('hipR', [0.06, 0.08, 0.1]), pole: [-0.6, 0.4, 0.6] },
              legL: { to: other('kneeR', [0.05, 0.0, -0.12], 0.08), pole: [0.4, 0, 1] },
            },
          },
          dur: 1.0,
        },
      },
      {
        say: 'Pull him onto your shin, then chop his knee and kick your shin over.',
        drag: { who: 'bottom', part: 'legL' },
        intent: 'Scissor',
        cinematic: true,
        key: {
          bottom: { pose: 'sideLying', root: { at: world(0.1, 0.25, -0.05), rot: turn(O.supine, [0, 0, 1], 100), k: 4, rk: 3 }, limbs: {} },
          top: { pose: 'sideLying', root: { at: world(0.35, 0.22, 0.2), rot: orient([0.3, 0.2, -1], [0.9, -0.3, 0.2]), k: 4, rk: 3 }, limbs: {} },
          dur: 0.9,
        },
      },
      {
        say: 'Follow him over and land in mount.',
        auto: true,
        cinematic: true,
        delay: 0.1,
        key: { top: merge(supineAt(0.45, -0.15), { limbs: mountBottom().limbs }), bottom: mountTop(), dur: 1.2 },
      },
    ],
  },

  {
    id: 'hip-bump',
    name: 'Hip bump sweep',
    kind: 'sweep',
    role: 'bottom',
    from: 'closed-guard',
    to: 'mount',
    summary: 'When he postures up, sit up, post a hand, reach over his shoulder and bump him over with your hips.',
    mistakes: [
      'Sitting up without posting a hand: no base to bump from.',
      'Bumping forward instead of up and over his shoulder.',
      'If he posts his arm back, switch to the kimura on that arm.',
    ],
    steps: [
      {
        say: 'He postures up tall. Sit up and post your right hand behind you.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Sit up',
        key: {
          top: merge(inGuard(), { root: { at: other('hipsCenter', [0, -0.42, 0.3]), rot: O.uprightFacingHead, k: 3, rk: 2.5 } }),
          bottom: {
            pose: 'sit',
            joints: { lumbar: [25, 0, 10], thoracic: [10, 0, 0] },
            root: { at: world(-0.05, 0.14, 0.02), rot: orient([-0.25, 0.7, -0.65], [0.1, 0.6, 0.75]), k: 3, rk: 2.5 },
            ghost: ['shinL', 'shinR', 'footL', 'footR'],
            limbs: {
              armR: { to: self('hipR', [-0.18, 0.2, -0.15], MAT), pole: [-0.5, 0, -1] },
              legL: { to: self('hipL', [0.15, -0.4, 0.1], 0.09), pole: [0.5, 0, 1] },
              legR: { to: self('hipR', [-0.15, -0.4, 0.1], 0.09), pole: [-0.5, 0, 1] },
            },
          },
          dur: 1.0,
        },
      },
      {
        say: 'Reach your left arm over his right shoulder.',
        drag: { who: 'bottom', part: 'armL' },
        intent: 'Reach over',
        key: {
          bottom: {
            pose: 'sit',
            joints: { lumbar: [25, 0, 10], thoracic: [10, 0, 0] },
            root: { at: world(-0.05, 0.16, 0.06), rot: orient([-0.25, 0.75, -0.6], [0.1, 0.55, 0.8]), k: 3, rk: 2.5 },
            ghost: ['shinL', 'shinR', 'footL', 'footR', 'forearmL'],
            limbs: {
              armR: { to: self('hipR', [-0.18, 0.2, -0.15], MAT), pole: [-0.5, 0, -1] },
              armL: { to: other('shoulderBladeR', [0, 0.05, 0]), pole: [0.6, 0.3, 0] },
              legL: { to: self('hipL', [0.15, -0.4, 0.1], 0.09), pole: [0.5, 0, 1] },
              legR: { to: self('hipR', [-0.15, -0.4, 0.1], 0.09), pole: [-0.5, 0, 1] },
            },
          },
          dur: 0.8,
        },
      },
      {
        say: 'Bump your hips up into his chest and roll him over his right shoulder.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Bump',
        cinematic: true,
        key: {
          bottom: { pose: 'kneel', root: { at: world(0.12, 0.38, 0.0), rot: orient([0.5, 0.8, -0.3], [0.6, -0.4, 0.7]), k: 4, rk: 3 }, limbs: {} },
          top: { pose: 'sideLying', root: { at: world(0.35, 0.25, 0.25), rot: orient([0.8, 0.5, 0], [0, 0.3, -1]), k: 4, rk: 3 }, limbs: {} },
          dur: 0.9,
        },
      },
      {
        say: 'He lands on his back. You land in mount.',
        auto: true,
        cinematic: true,
        delay: 0.1,
        key: { top: merge(supineAt(0.5, 0.0), { limbs: mountBottom().limbs }), bottom: mountTop(), dur: 1.2 },
      },
    ],
  },

  {
    id: 'guard-posture',
    name: 'Posture in the guard',
    kind: 'control',
    role: 'top',
    from: 'closed-guard',
    summary: 'Hands on his hips, spine straight, elbows in. Posture first, then think about passing.',
    mistakes: [
      'Hands on his chest with straight arms: armbar.',
      'One arm in, one arm out: triangle.',
      'Head down near his chest: chokes and the kimura.',
    ],
    steps: [
      {
        say: 'He pulls your head down. Your posture is broken.',
        auto: true,
        key: { top: brokenPosture, bottom: guardPlayer(0, 0, { grips: 'collar' }), dur: 1.0 },
      },
      {
        say: 'Drive your hands into his hips and sit your hips back.',
        why: 'Hands on hips, not chest: your elbows stay bent and safe.',
        drag: { who: 'top', part: 'armL' },
        intent: 'Hands on hips',
        key: {
          top: merge(inGuard({ posture: 'broken' }), {
            root: { at: other('hipsCenter', [0, -0.4, 0.25]), rot: orient([0, 0.8, -0.6], [0, -0.6, -0.8]), k: 3, rk: 2.5 },
            limbs: inGuard().limbs,
          }),
          dur: 0.9,
        },
      },
      {
        say: 'Lift your head and straighten your spine: posture up.',
        drag: { who: 'top', part: 'hips' },
        intent: 'Posture up',
        key: { top: inGuard(), bottom: guardPlayer(0, 0, { grips: 'sleeves' }), dur: 1.0 },
      },
    ],
  },
];

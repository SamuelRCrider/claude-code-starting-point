import type { Technique } from '../types';
import { MAT, merge, other, self, world } from '../frames';
import { O, orient, turn } from '../orient';
import {
  backBottom, backTop, feetPlanted, framesTight, guardPlayer, halfGuardBottom, halfGuardTop, inGuard,
  kneeOnBellyTop, mountBottom, mountTop, northSouthTop, sideControlBottom, sideControlTop, supineAt,
  turtleBottom, turtleTop,
} from '../shapes';

const flatBottom = () => merge(supineAt(0, 0), { limbs: { ...framesTight(), ...feetPlanted() } });

/** Mounted-style finish shared by the armbars: hips by his right shoulder, legs across. */
const armbarFinish = (hipsUp: boolean) => ({
  pose: 'sit',
  joints: hipsUp ? { lumbar: [-10, 0, 0] as [number, number, number] } : {},
  root: { at: other('armpitR', [-0.2, -0.04, 0.0], hipsUp ? 0.16 : 0.14), rot: hipsUp ? orient([-1, 0.08, 0], [0.05, 1, 0.1]) : orient([-1, 0.35, 0], [0.2, 0.9, 0.1]), k: 3.5, rk: 2.5 },
  limbs: {
    legL: { to: other('ear_L', [0.1, 0.05, 0.05], 0.1), pole: [0, 1, 0.3] as [number, number, number] },
    legR: { to: other('hipL', [0.0, 0.2, 0.06], 0.12), pole: [0, 1, 0.3] as [number, number, number] },
    armR: { to: other('wristR'), grip: true },
    armL: { to: other('wristR', [0, 0.05, 0]), grip: true },
  },
});

export const MORE_TECHNIQUES: Technique[] = [
  // ------------------------------------------------------------------ half guard
  {
    id: 'old-school',
    name: 'Old school sweep',
    kind: 'sweep',
    role: 'bottom',
    from: 'half-guard',
    to: 'side-control',
    summary: 'Underhook, come up on your side, grab his trapped ankle and drive him over it.',
    mistakes: [
      'Flat on your back: you cannot drive forward from there.',
      'Not holding the ankle: he simply posts that foot and stops the sweep.',
    ],
    steps: [
      {
        say: 'Win the underhook and turn onto your side, head tight to his chest.',
        drag: { who: 'bottom', part: 'armL' },
        intent: 'Underhook',
        key: { bottom: merge(halfGuardBottom(), { root: { at: world(-0.05, 0.16, 0.05), rot: turn(O.supine, [0, 0, 1], -55), k: 3, rk: 2.5 } }), dur: 0.9 },
      },
      {
        say: 'Reach under with your right hand and grab his right ankle.',
        drag: { who: 'bottom', part: 'armR' },
        intent: 'Grab ankle',
        key: {
          bottom: merge(halfGuardBottom(), {
            root: { at: world(-0.1, 0.2, 0.15), rot: turn(O.supine, [0, 0, 1], -75), k: 3, rk: 2.5 },
            limbs: { armR: { to: other('heelR', [0, 0.05, 0]), pole: [-0.5, -1, 0], grip: true } },
          }),
          dur: 1.0,
        },
      },
      {
        say: 'Drive up off your knee into him. He has no foot to post.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Drive',
        cinematic: true,
        key: {
          bottom: { pose: 'kneel', root: { at: world(0.1, 0.42, 0.1), rot: orient([0.5, 0.8, -0.3], [0.7, -0.5, 0.4]), k: 4, rk: 3 }, limbs: {} },
          top: { pose: 'sideLying', root: { at: world(0.4, 0.25, -0.05), rot: orient([0.4, 0.5, -0.8], [0.9, -0.2, 0.3]), k: 4, rk: 3 }, limbs: {} },
          dur: 1.0,
        },
      },
      {
        say: 'He lands on his back. Settle into side control.',
        auto: true,
        cinematic: true,
        delay: 0.1,
        key: { top: merge(supineAt(0.15, 0), { limbs: sideControlBottom().limbs }), bottom: sideControlTop(), dur: 1.3 },
      },
    ],
  },
  {
    id: 'knee-slice',
    name: 'Knee slice pass',
    kind: 'pass',
    role: 'top',
    from: 'half-guard',
    to: 'side-control',
    summary: 'Crossface and underhook to flatten him, slice your knee across his thigh and settle into side control.',
    mistakes: [
      'Passing before he is flat: he comes up on the underhook.',
      'Hips high while slicing: he recovers guard.',
    ],
    steps: [
      {
        say: 'Crossface: drive your shoulder into his jaw and flatten him.',
        drag: { who: 'top', part: 'armL' },
        intent: 'Crossface',
        key: { top: halfGuardTop(), bottom: merge(halfGuardBottom({ underhook: false }), { root: { at: world(0, 0.12, 0), rot: O.supine, k: 1, rk: 1.5 } }), dur: 0.9 },
      },
      {
        say: 'Slice your trapped knee across his left thigh to the mat.',
        why: 'Knee and shin cut across the thigh like a blade. Hips stay low.',
        drag: { who: 'top', part: 'legR' },
        intent: 'Slice',
        key: {
          top: merge(halfGuardTop(), {
            root: { at: other('belly', [0.1, -0.06, 0.15]), rot: orient([0.3, 0.6, -0.75], [0.2, -0.8, -0.55]), k: 3, rk: 2.5 },
            limbs: { legR: { mid: other('hipL', [0.18, -0.22, 0], MAT), lowerDir: [-1, -0.3, 0.05], lowerIn: 'other' } },
          }),
          dur: 1.0,
        },
      },
      {
        say: 'Pull your foot free and settle chest to chest: side control.',
        drag: { who: 'top', part: 'hips' },
        intent: 'Settle',
        cinematic: true,
        key: { top: sideControlTop(), bottom: sideControlBottom(), dur: 1.3 },
      },
    ],
  },
  {
    id: 'half-recover',
    name: 'Recover full guard',
    kind: 'escape',
    role: 'bottom',
    from: 'half-guard',
    to: 'closed-guard',
    summary: 'Frame, shrimp, wedge a knee shield, then free your leg and lock your ankles.',
    steps: [
      {
        say: 'Frame: forearm across his collarbone, hand on his hip.',
        drag: { who: 'bottom', part: 'armR' },
        intent: 'Frame',
        key: {
          bottom: merge(halfGuardBottom({ underhook: false }), {
            limbs: { armR: { to: other('sternum', [0.02, 0.14, 0.1]), pole: [-0.5, -1, 0] }, armL: { to: other('hipR', [0, 0.04, 0.1]), pole: [0.5, -1, 0] } },
          }),
          dur: 0.8,
        },
      },
      {
        say: 'Shrimp out and wedge your knee across his belly: knee shield.',
        drag: { who: 'bottom', part: 'legL' },
        intent: 'Knee shield',
        key: {
          bottom: merge(halfGuardBottom({ underhook: false }), {
            root: { at: world(-0.15, 0.13, 0.05), rot: turn(O.supine, [0, 0, 1], -40), k: 3, rk: 2.5 },
            limbs: {
              legL: { mid: other('belly', [0.05, 0.05, 0.1]), lowerDir: [1, -0.2, 0], lowerIn: 'world' },
              armR: { to: other('sternum', [0.02, 0.14, 0.1]), pole: [-0.5, -1, 0] },
              armL: { to: other('hipR', [0, 0.04, 0.1]), pole: [0.5, -1, 0] },
            },
          }),
          top: merge(halfGuardTop(), { root: { at: other('belly', [-0.04, -0.12, 0.22]), k: 2, rk: 2 } }),
          dur: 1.0,
        },
      },
      {
        say: 'Free your leg and lock your ankles behind his back.',
        auto: true,
        cinematic: true,
        delay: 0.3,
        key: { bottom: guardPlayer(-0.1, 0.05, { grips: 'none' }), top: inGuard({ at: world(-0.1, 0.36, 0.42) }), dur: 1.3 },
      },
    ],
  },

  // ------------------------------------------------------------------ knee on belly
  {
    id: 'kob-armbar',
    name: 'Far-side armbar',
    kind: 'submission',
    role: 'top',
    from: 'knee-on-belly',
    summary: 'He pushes your knee with his far arm. Catch it, step around his head and sit into the armbar.',
    mistakes: ['Sitting far from his shoulder: the arm slips out.', 'Losing the grip as you step around.'],
    steps: [
      {
        say: 'He pushes your knee with a straight far arm.',
        auto: true,
        key: { bottom: merge(flatBottom(), { limbs: { armR: { to: self('belly', [0.1, 0.06, 0.24]), pole: [-0.5, -1, 0] } } }), dur: 0.8 },
      },
      {
        say: 'Catch that arm to your chest, step your base leg around his head and sit by his shoulder.',
        why: 'Keep the arm glued to your chest the whole way around.',
        drag: { who: 'top', part: 'hips' },
        intent: 'Catch and step around',
        cinematic: true,
        key: { top: armbarFinish(false), bottom: merge(supineAt(0, 0), { limbs: { armR: { to: other('sternum', [0, 0.05, 0.1]), tension: 0.4 } } }), dur: 1.5 },
      },
      {
        say: 'Thumb up, squeeze the knees, lift the hips. Tap.',
        drag: { who: 'top', part: 'hips' },
        intent: 'Finish',
        key: { top: armbarFinish(true), dur: 1.1 },
      },
    ],
  },
  {
    id: 'kob-to-mount',
    name: 'Knee on belly to mount',
    kind: 'transition',
    role: 'top',
    from: 'knee-on-belly',
    to: 'mount',
    summary: 'Keep your grips, walk the base foot in, slide the knee across his belly to the mat and sit into mount.',
    steps: [
      {
        say: 'Walk your base foot in closer to his hip.',
        why: 'A closer base lets you swing the knee across without falling over him.',
        drag: { who: 'top', part: 'legR' },
        intent: 'Foot in',
        key: { top: merge(kneeOnBellyTop(), { limbs: { legR: { to: world(0.5, 0.09, -0.15), pole: [0, 0, 1] } } }), dur: 0.9 },
      },
      {
        say: 'Slide your knee across his belly to the far side and sit down: mount.',
        drag: { who: 'top', part: 'hips' },
        intent: 'Mount',
        cinematic: true,
        key: { top: mountTop(), bottom: mountBottom(), dur: 1.4 },
      },
    ],
  },
  {
    id: 'kob-escape',
    name: 'Knee on belly escape',
    kind: 'escape',
    role: 'bottom',
    from: 'knee-on-belly',
    to: 'closed-guard',
    summary: 'Bent-arm frames on his knee, turn away, shrimp out from under it, and put your legs back in.',
    steps: [
      {
        say: 'Frame both hands on his knee and push it toward his hips.',
        drag: { who: 'bottom', part: 'armL' },
        intent: 'Frame the knee',
        key: { bottom: merge(flatBottom(), { limbs: { armL: { to: other('kneeL', [0, 0.05, 0.06]), pole: [0.5, -1, 0] }, armR: { to: other('kneeL', [0.05, 0.1, 0.06]), pole: [-0.5, -1, 0] } } }), dur: 0.8 },
      },
      {
        say: 'Turn onto your side and shrimp your hips out from under the knee.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Shrimp',
        key: {
          bottom: { pose: 'sideLying', root: { at: world(-0.3, 0.14, 0.1), rot: O.onLeftSide, k: 3.5, rk: 3 }, limbs: { armL: { to: other('kneeL', [0, 0.05, 0.06]), pole: [0.5, -1, 0] } } },
          top: merge(kneeOnBellyTop(), { root: { at: world(0.32, 0.5, -0.1), k: 2, rk: 2.5 } }),
          dur: 1.0,
        },
      },
      {
        say: 'Knee in, legs around him: closed guard.',
        auto: true,
        cinematic: true,
        delay: 0.3,
        key: { bottom: guardPlayer(-0.3, 0.1, { grips: 'none' }), top: inGuard({ at: world(-0.3, 0.36, 0.47), rot: O.uprightFacingHead }), dur: 1.4 },
      },
    ],
  },

  // ------------------------------------------------------------------ back
  {
    id: 'rnc',
    name: 'Rear-naked choke',
    kind: 'submission',
    role: 'top',
    from: 'back',
    summary: 'Choking arm across the neck, hand to your own biceps, other hand behind his head, squeeze.',
    mistakes: [
      'Forearm on the jaw instead of the neck: dig it under the chin first.',
      'Hand on the shoulder instead of the biceps: the lock is loose.',
    ],
    steps: [
      {
        say: 'Fight his hands down, then slide your right forearm across his neck.',
        drag: { who: 'top', part: 'armR' },
        intent: 'Arm across',
        key: {
          top: merge(backTop(), { limbs: { armR: { to: other('chin', [0.14, -0.04, 0.0]), pole: [-1, 0.3, -0.3] } } }),
          bottom: merge(backBottom(), { limbs: { armL: { to: other('wristR', [0, 0.04, 0]), pole: [0.6, -0.5, 0], tension: 0.5 } } }),
          dur: 1.0,
        },
      },
      {
        say: 'Right hand grabs your left biceps. Left hand goes behind his head.',
        drag: { who: 'top', part: 'armL' },
        intent: 'Lock it',
        key: {
          top: merge(backTop({ choke: true }), { limbs: { armR: { to: self('elbowL', [0, -0.05, 0.03]), pole: [-1, 0.3, -0.3] } } }),
          dur: 1.0,
        },
      },
      {
        say: 'Elbows together, chest out, head tight to his. Tap.',
        drag: { who: 'top', part: 'hips' },
        intent: 'Squeeze',
        key: {
          top: merge(backTop({ choke: true }), {
            joints: { lumbar: [5, 0, 0], thoracic: [5, 0, 0], neck: [35, -25, -15] },
            limbs: { armR: { to: self('elbowL', [0, -0.05, 0.03]), pole: [-1, 0.3, -0.3] } },
          }),
          bottom: merge(backBottom(), { tension: 0.5 }),
          dur: 1.2,
        },
      },
    ],
  },
  {
    id: 'back-escape',
    name: 'Back escape',
    kind: 'escape',
    role: 'bottom',
    from: 'back',
    to: 'closed-guard',
    summary: 'Two-on-one the choking arm, slide your shoulders to the mat on the choking-arm side, clear the hook and turn in.',
    mistakes: [
      'Escaping toward the under-arm side: his choking arm stays free.',
      'Letting go of the choking arm to fight the hooks.',
    ],
    steps: [
      {
        say: 'Both hands on his choking arm, chin tucked.',
        drag: { who: 'bottom', part: 'armL' },
        intent: 'Two-on-one',
        key: { bottom: backBottom(), dur: 0.8 },
      },
      {
        say: 'Slide down and drop your shoulders to the mat on the choking-arm side (right).',
        why: 'With your back on the mat on that side, his choking arm is pinned.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Slide down',
        cinematic: true,
        key: {
          bottom: merge(backBottom(), { root: { at: world(-0.32, 0.14, 0.12), rot: turn(O.supine, [0, 0, 1], 25), k: 3, rk: 2.5 } }),
          top: merge(backTop(), { root: { at: world(0.05, 0.12, 0.02), rot: turn(O.supine, [0, 0, 1], 20), k: 2, rk: 2 } }),
          dur: 1.2,
        },
      },
      {
        say: 'Clear his hook, turn in to face him: you end up in his guard.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Turn in',
        cinematic: true,
        key: { top: guardPlayer(0.0, 0.0, { grips: 'none' }), bottom: inGuard({ at: world(0.0, 0.36, 0.4) }), dur: 1.4 },
      },
    ],
  },

  // ------------------------------------------------------------------ turtle
  {
    id: 'turtle-back-take',
    name: 'Back take from turtle',
    kind: 'transition',
    role: 'top',
    from: 'turtle',
    to: 'back',
    summary: 'Seatbelt, insert the near hook, roll over the choking-arm shoulder and put in the second hook.',
    mistakes: ['Hips far from his: he sits out.', 'Rolling to the wrong side: you end up under him with no control.'],
    steps: [
      {
        say: 'Seatbelt: one arm over his far shoulder, one under his near armpit.',
        drag: { who: 'top', part: 'armL' },
        intent: 'Seatbelt',
        key: { top: turtleTop(), dur: 0.9 },
      },
      {
        say: 'Insert your near hook: heel inside his near thigh.',
        drag: { who: 'top', part: 'legR' },
        intent: 'Hook in',
        key: { top: merge(turtleTop(), { ghost: ['shinR', 'footR'], limbs: { legR: { to: other('kneeL', [0.1, 0.12, 0.05]), pole: [0, 1, 0] } } }), dur: 0.9 },
      },
      {
        say: 'Roll over your shoulder, pulling him on top of you. Second hook in.',
        drag: { who: 'top', part: 'hips' },
        intent: 'Roll',
        cinematic: true,
        key: { top: backTop(), bottom: backBottom(), dur: 1.6 },
      },
    ],
  },
  {
    id: 'granby',
    name: 'Granby roll',
    kind: 'escape',
    role: 'bottom',
    from: 'turtle',
    to: 'closed-guard',
    summary: 'Tuck your head, roll over your shoulder away from him, legs leading, and come out facing him in guard.',
    mistakes: ['Rolling over your head instead of your shoulder: neck pressure.', 'Rolling toward him: he follows and takes the back.'],
    steps: [
      {
        say: 'Tuck your chin and post on the shoulder away from him.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Post the shoulder',
        key: { bottom: merge(turtleBottom(), { root: { at: world(0.08, 0.45, 0.05), rot: turn(turtleBottomRot(), [0, 0, 1], -25), k: 3, rk: 2.5 } }), dur: 0.8 },
      },
      {
        say: 'Roll over that shoulder, legs leading.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Roll',
        cinematic: true,
        key: { bottom: { pose: 'turtle', root: { at: world(0.35, 0.35, -0.05), rot: orient([0, -0.3, -1], [1, 0, 0]), k: 4, rk: 3 }, limbs: {} }, dur: 0.9 },
      },
      {
        say: 'Come out on your back facing him and recover guard.',
        auto: true,
        cinematic: true,
        delay: 0.1,
        key: { bottom: guardPlayer(0.45, -0.2, { grips: 'none' }), top: inGuard({ at: world(0.45, 0.36, 0.17), rot: O.uprightFacingHead }), dur: 1.3 },
      },
    ],
  },

  // ------------------------------------------------------------------ north-south
  {
    id: 'ns-kimura',
    name: 'Kimura from north-south',
    kind: 'submission',
    role: 'top',
    from: 'north-south',
    summary: 'His arm comes up: grip the wrist, thread under the elbow, figure-four and turn it behind his back.',
    steps: [
      {
        say: 'He pushes on your hip with his right arm.',
        auto: true,
        key: { bottom: merge(flatBottom(), { limbs: { armR: { to: other('hipR', [0, 0, 0.08]), pole: [-0.6, -1, 0] } } }), dur: 0.8 },
      },
      {
        say: 'Grip his right wrist with your right hand.',
        drag: { who: 'top', part: 'armR' },
        intent: 'Grip wrist',
        key: { top: merge(northSouthTop(), { limbs: { armR: { to: other('wristR'), pole: [-0.6, -0.5, -0.5], grip: true } } }), dur: 0.8 },
      },
      {
        say: 'Thread your left arm under his upper arm and grab your own wrist.',
        drag: { who: 'top', part: 'armL' },
        intent: 'Figure-four',
        key: { top: merge(northSouthTop(), { limbs: { armR: { to: other('wristR'), pole: [-0.6, -0.5, -0.5], grip: true }, armL: { to: self('wristR', [0, -0.03, 0]), pole: [0.6, -0.5, -0.5], grip: true } } }), dur: 0.9 },
      },
      {
        say: 'Sit your hips back and turn his hand toward his head. Tap.',
        drag: { who: 'top', part: 'hips' },
        intent: 'Finish',
        key: {
          top: merge(northSouthTop(), {
            root: { at: world(-0.2, 0.32, -0.95), rot: orient([0.3, 0.3, 0.9], [0, -1, 0.3]), k: 3, rk: 2.5 },
            limbs: { armR: { to: other('ear_R', [-0.25, 0.1, 0.05], 0.15), grip: true }, armL: { to: self('wristR', [0, -0.03, 0]), grip: true } },
          }),
          bottom: merge(flatBottom(), { limbs: { armR: { to: self('ear_R', [-0.25, 0.1, 0.05], 0.15), pole: [-0.3, 1, -0.4], tension: 0.3 } } }),
          dur: 1.3,
        },
      },
    ],
  },
  {
    id: 'ns-escape',
    name: 'North-south escape',
    kind: 'escape',
    role: 'bottom',
    from: 'north-south',
    to: 'closed-guard',
    summary: 'Frame his hips, bridge, turn to your side and shrimp until your knee comes back in.',
    steps: [
      {
        say: 'Frame your forearms on his hips.',
        drag: { who: 'bottom', part: 'armL' },
        intent: 'Frame',
        key: { bottom: merge(flatBottom(), { limbs: { armL: { to: other('hipL', [0, 0, 0.1]), pole: [0.5, -1, 0] }, armR: { to: other('hipR', [0, 0, 0.1]), pole: [-0.5, -1, 0] } } }), dur: 0.8 },
      },
      {
        say: 'Bridge, turn onto your side and shrimp your hips away.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Shrimp',
        key: {
          bottom: { pose: 'sideLying', root: { at: world(0.3, 0.14, 0.05), rot: O.onRightSide, k: 3.5, rk: 3 }, limbs: { armL: { to: other('hipL', [0, 0, 0.1]), pole: [0.5, -1, 0] } } },
          dur: 1.0,
        },
      },
      {
        say: 'Spin your legs back in front of him: guard.',
        auto: true,
        cinematic: true,
        delay: 0.3,
        key: { bottom: guardPlayer(0.25, -0.15, { grips: 'none' }), top: inGuard({ at: world(0.25, 0.36, 0.22), rot: O.uprightFacingHead }), dur: 1.6 },
      },
    ],
  },
];

function turtleBottomRot() {
  return turtleBottom().root!.rot as [number, number, number, number];
}


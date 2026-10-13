import type { Technique } from '../types';
import { MAT, merge, other, self, world } from '../frames';
import { O, orient, turn } from '../orient';
import { feetPlanted, framesTight, guardPlayer, inGuard, mountBottom, mountTop, supineAt } from '../shapes';

// Bottom (White) lies head toward -Z, their left = +X. Top (Blue) faces -Z.
// Blue's RIGHT arm and leg are on White's LEFT side (+X).

const leanPosted = mountTop({ lean: 55, hands: 'post' });

export const MOUNT_TECHNIQUES: Technique[] = [
  {
    id: 'upa',
    name: 'Trap and roll (upa)',
    kind: 'escape',
    role: 'bottom',
    from: 'mount',
    to: 'closed-guard',
    summary: 'Trap an arm and a foot on the same side, bridge, and roll him over the side where he has no post.',
    mistakes: [
      'Bridging straight up without trapping: he just posts a hand or foot and stays mounted.',
      'Trapping the arm but not the foot on the same side: he steps out and bases.',
      'Rolling toward the side you did not trap: that is exactly where his post is.',
    ],
    steps: [
      {
        say: 'He leans forward and posts both hands by your head.',
        auto: true,
        key: { top: leanPosted, dur: 1.0 },
      },
      {
        say: 'Trap his right arm: reach over and hug it to your chest.',
        why: 'With the arm trapped he can no longer post on that side.',
        drag: { who: 'bottom', part: 'armR' },
        intent: 'Trap the arm',
        key: {
          bottom: merge(mountBottom(), {
            limbs: {
              armR: { to: other('elbowR', [0, -0.02, 0]), pole: [-0.4, -1, 0], grip: true, pull: 220 },
              armL: { to: other('wristR', [0, 0.02, 0]), pole: [0.4, -1, 0], grip: true, pull: 220 },
            },
          }),
          top: merge(leanPosted, { limbs: { armR: { to: other('sternum', [0.12, 0.05, 0.1]), pole: [-0.4, -0.3, -1], tension: 0.5 } } }),
          dur: 0.9,
        },
      },
      {
        say: 'Trap his right foot: step your left foot over the outside of his ankle.',
        why: 'Arm and foot trapped on the same side: nothing left to catch his fall.',
        drag: { who: 'bottom', part: 'legL' },
        intent: 'Trap the foot',
        key: {
          bottom: {
            limbs: {
              legL: { to: other('heelR', [0, 0, 0], 0.1), pole: [0.7, 0, 0.6] },
              legR: { to: self('hipR', [-0.02, -0.42, 0], 0.09), pole: [-0.2, 0, 1] },
              armR: { to: other('elbowR', [0, -0.02, 0]), pole: [-0.4, -1, 0], grip: true, pull: 220 },
              armL: { to: other('wristR', [0, 0.02, 0]), pole: [0.4, -1, 0], grip: true, pull: 220 },
            },
            pose: 'supine',
            root: { at: world(0, 0.12, 0), rot: O.supine, k: 0.6, rk: 1 },
          },
          dur: 0.8,
        },
      },
      {
        say: 'Bridge: drive your hips straight up toward the ceiling.',
        why: 'The bridge lifts his weight off the mat and throws it over his head.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Bridge',
        cinematic: true,
        key: {
          bottom: {
            pose: 'supine',
            joints: { lumbar: [-15, 0, 0], thoracic: [-5, 0, 0] },
            root: { at: world(0, 0.3, 0.05), rot: turn(O.supine, [1, 0, 0], -20), k: 3.5, rk: 2.5 },
            limbs: {
              legL: { to: other('heelR', [0, 0, 0], 0.1), pole: [0.7, 0, 0.6] },
              legR: { to: world(-0.12, 0.09, 0.42), pole: [-0.2, 0, 1] },
              armR: { to: other('elbowR'), pole: [-0.4, -1, 0], grip: true, pull: 220 },
              armL: { to: other('wristR'), pole: [0.4, -1, 0], grip: true, pull: 220 },
            },
          },
          top: merge(leanPosted, { root: { at: other('belly', [0, 0.1, 0.12]), rot: orient([0, 0.6, -0.8], [0, -0.8, -0.6]), k: 1.2, rk: 1 }, limbs: { armR: { to: other('sternum', [0.12, 0.05, 0.1]), tension: 0.4 } } }),
          dur: 0.6,
        },
      },
      {
        say: 'Turn over your left shoulder, the trapped side.',
        why: 'He tips over the side where his arm and foot are stuck.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Roll',
        cinematic: true,
        key: {
          bottom: {
            pose: 'sideLying',
            root: { at: world(0.3, 0.28, -0.05), rot: O.onLeftSide, k: 4, rk: 3 },
            limbs: {
              armR: { to: other('elbowR'), grip: true, pull: 220 },
              armL: { to: other('wristR'), grip: true, pull: 220 },
            },
          },
          top: {
            pose: 'sideLying',
            root: { at: world(0.62, 0.2, -0.12), rot: orient([0.2, 0.2, -1], [0.95, -0.2, 0.2]), k: 5, rk: 3 },
            limbs: {},
          },
          dur: 0.8,
        },
      },
      {
        say: 'He topples onto his back. Come up on top of him.',
        auto: true,
        cinematic: true,
        delay: 0.1,
        key: {
          top: { pose: 'supine', root: { at: world(0.62, 0.13, -0.15), rot: O.supine, k: 5, rk: 3 } },
          bottom: { pose: 'heavyChest', root: { at: world(0.62, 0.36, 0.18), rot: orient([0, 0.6, -0.8], [0, -0.8, -0.6]), k: 5, rk: 3 } },
          dur: 0.9,
        },
      },
      {
        say: 'Land in his closed guard, posture up, hands on his hips.',
        auto: true,
        cinematic: true,
        delay: 0.2,
        key: { top: guardPlayer(0.62, -0.15, { grips: 'none' }), bottom: inGuard({ at: world(0.62, 0.36, 0.22) }), dur: 1.2 },
      },
    ],
  },

  {
    id: 'elbow-escape',
    name: 'Elbow-knee escape',
    kind: 'escape',
    role: 'bottom',
    from: 'mount',
    to: 'half-guard',
    summary: 'Frame, turn to your side and shrimp until your knee slides inside his leg. Recover half guard, then full guard.',
    mistakes: [
      'Staying flat on your back: you cannot shrimp without turning to your side.',
      'Pushing his chest with straight arms: that is the mount armbar.',
      'Leaving your elbow away from your knee: the gap is where your knee has to go.',
    ],
    steps: [
      {
        say: 'Frame: both forearms on his left hip.',
        why: 'Frames are bones, not muscle. They hold space while your hips move.',
        drag: { who: 'bottom', part: 'armR' },
        intent: 'Frame',
        key: {
          bottom: merge(mountBottom(), {
            limbs: {
              armR: { to: other('hipL', [-0.02, 0, 0.06]), pole: [-0.5, -1, 0] },
              armL: { to: other('hipL', [0.05, 0.08, 0.08]), pole: [0.3, -1, 0] },
            },
          }),
          dur: 0.7,
        },
      },
      {
        say: 'Small bridge, then turn onto your right side.',
        auto: false,
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Turn to side',
        key: {
          bottom: {
            pose: 'sideLying',
            root: { at: world(0.1, 0.15, 0.02), rot: turn(O.supine, [0, 0, 1], 55), k: 3, rk: 2.5 },
            limbs: {
              armR: { to: other('hipL', [-0.02, 0, 0.06]), pole: [-0.5, -1, 0] },
              armL: { to: other('hipL', [0.05, 0.08, 0.08]), pole: [0.3, -1, 0] },
              legL: { to: self('hipL', [0.0, -0.4, 0], 0.09), pole: [0.3, 0, 1] },
            },
          },
          dur: 0.8,
        },
      },
      {
        say: 'Shrimp: push off your left foot and slide your hips out to the left.',
        why: 'Moving your hips, not his, opens space between your right elbow and knee.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Shrimp',
        key: {
          bottom: {
            pose: 'sideLying',
            root: { at: world(0.32, 0.15, 0.08), rot: turn(O.supine, [0, 0, 1], 60), k: 3, rk: 2.5 },
            limbs: {
              armR: { to: other('hipL', [-0.04, 0, 0.06]), pole: [-0.5, -1, 0] },
              armL: { to: other('hipL', [0.05, 0.08, 0.08]), pole: [0.3, -1, 0] },
              legR: { mid: other('belly', [0.02, -0.08, -0.06]), lowerDir: [0.3, -0.2, -1], bend: 120 },
            },
          },
          dur: 0.9,
        },
      },
      {
        say: 'Slide your right knee inside his left leg and hook it.',
        why: 'Elbow and knee connect: his leg is now trapped. That is half guard.',
        drag: { who: 'bottom', part: 'legR' },
        intent: 'Knee in',
        key: {
          bottom: {
            pose: 'sideLying',
            root: { at: world(0.3, 0.13, 0.08), rot: turn(O.supine, [0, 0, 1], 30), k: 2, rk: 2 },
            limbs: {
              legR: { to: other('kneeL', [0.05, -0.05, -0.05], 0.12), pole: [0.3, 0, 1] },
              legL: { to: other('heelL', [0.0, 0.05, 0], 0.11), pole: [0.4, 0, 1] },
              armR: { to: other('hipL', [-0.04, 0, 0.06]), pole: [-0.5, -1, 0] },
              armL: { to: self('sternum', [0.05, 0.1, 0.15]), pole: [0.3, -1, 0] },
            },
          },
          top: merge(mountTop({ lean: 20 }), { root: { at: other('belly', [-0.1, 0.0, 0.14]), k: 1.5, rk: 1.5 } }),
          dur: 1.0,
        },
      },
      {
        say: 'Repeat on the other side, then lock your ankles: full guard.',
        auto: true,
        delay: 0.4,
        key: { bottom: guardPlayer(0.15, 0.05, { grips: 'none' }), top: inGuard({ at: world(0.15, 0.36, 0.42) }), dur: 1.4 },
      },
    ],
  },

  {
    id: 'mount-hold',
    name: 'Ride the bridge',
    kind: 'control',
    role: 'top',
    from: 'mount',
    summary: 'Get heavy and wide so his bridge goes nowhere: hips low, knees pinched, base close to his head.',
    mistakes: [
      'Sitting tall with hands far away: one trapped arm and he rolls you.',
      'Knees open and sitting on his stomach: easy elbow-knee escape.',
    ],
    steps: [
      {
        say: 'Pinch your knees tight to his ribs.',
        why: 'No gap between your knees and his body means no room for his elbow or knee.',
        drag: { who: 'top', part: 'legL' },
        intent: 'Pinch knees',
        key: { top: merge(mountTop({ lean: 20 }), { limbs: { legL: { mid: other('belly', [-0.24, 0.1, 0], MAT), lowerDir: [-0.1, -0.35, -1], bend: 125 }, legR: { mid: other('belly', [0.24, 0.1, 0], MAT), lowerDir: [0.1, -0.35, -1], bend: 125 } } }), dur: 0.8 },
      },
      {
        say: 'Drop your hips onto his and post your hands near his head.',
        why: 'Low hips plus close posts form a wide, low base, like a tripod.',
        drag: { who: 'top', part: 'hips' },
        intent: 'Get heavy',
        key: { top: merge(mountTop({ lean: 35, hands: 'post' }), { root: { at: other('belly', [0, 0.05, 0.09]), k: 3, rk: 2 } }), dur: 0.8 },
      },
      {
        say: 'He bridges hard… and goes nowhere.',
        auto: true,
        delay: 0.4,
        key: {
          bottom: { pose: 'supine', joints: { lumbar: [-15, 0, 0] }, root: { at: world(0, 0.3, 0.05), rot: turn(O.supine, [1, 0, 0], -20), k: 4, rk: 3 }, limbs: { ...framesTight(), ...feetPlanted() } },
          dur: 0.6,
        },
      },
      {
        say: 'Ride it, then settle back down when he runs out of air.',
        auto: true,
        delay: 0.9,
        key: { bottom: mountBottom(), dur: 1.0 },
      },
    ],
  },

  {
    id: 'americana',
    name: 'Americana',
    kind: 'submission',
    role: 'top',
    from: 'mount',
    summary: 'Pin his wrist by his head, thread your other arm under his elbow, grab your own wrist and paint the floor.',
    mistakes: [
      'Letting his elbow straighten: keep it at about 90 degrees.',
      'Sitting up while you finish: chest pressure keeps his shoulder pinned.',
    ],
    steps: [
      {
        say: 'His left arm comes off his chest. Pin his wrist to the mat beside his head with your left hand.',
        why: 'Elbow bent about 90°, hand above the elbow.',
        drag: { who: 'top', part: 'armL' },
        intent: 'Pin the wrist',
        key: {
          bottom: merge(mountBottom(), { limbs: { armL: { to: self('ear_L', [0.26, 0.04, 0], 0.1), pole: [0.3, -1, 0] } } }),
          top: merge(mountTop({ lean: 40 }), {
            limbs: {
              armL: { to: other('wristL', [0, 0, 0.02]), pole: [0.5, -0.5, -1], grip: true },
              armR: { to: other('ear_L', [-0.05, 0.05, 0], MAT), pole: [-0.5, -0.5, -1] },
            },
          }),
          dur: 1.0,
        },
      },
      {
        say: 'Thread your right hand under his upper arm and grab your own left wrist.',
        why: 'The figure-four: his arm is now a lever you control with two arms.',
        drag: { who: 'top', part: 'armR' },
        intent: 'Figure-four',
        key: {
          top: merge(mountTop({ lean: 45 }), {
            limbs: {
              armL: { to: other('wristL'), pole: [0.5, -0.5, -1], grip: true },
              armR: { to: self('wristL', [0, -0.02, -0.03]), pole: [-0.4, -0.6, -1], grip: true },
            },
          }),
          dur: 0.9,
        },
      },
      {
        say: 'Paint the floor: slide his hand toward his hip and lift his elbow.',
        why: 'The shoulder rotates past its range. Slowly. Your partner taps.',
        drag: { who: 'top', part: 'armL' },
        intent: 'Finish',
        key: {
          top: merge(mountTop({ lean: 45 }), {
            limbs: {
              armL: { to: other('hipL', [0.14, 0.2, 0], 0.12), pole: [0.5, -0.5, -1], grip: true },
              armR: { to: self('wristL', [0, -0.02, -0.03]), pole: [-0.4, 0.3, -1], grip: true },
            },
          }),
          bottom: merge(mountBottom(), { limbs: { armL: { to: self('hipL', [0.14, 0.2, 0], 0.12), pole: [0.3, 1, 0.2], tension: 0.3 } } }),
          dur: 1.4,
        },
      },
    ],
  },

  {
    id: 'mount-armbar',
    name: 'Armbar from mount',
    kind: 'submission',
    role: 'top',
    from: 'mount',
    summary: 'Climb high, catch the arm he pushes with, swing your leg over his head and sit back.',
    mistakes: [
      'Sitting far from his shoulder: keep your butt tight to his armpit.',
      'Thumb pointing sideways: his thumb points up so the elbow faces your hips.',
    ],
    steps: [
      {
        say: 'Climb to high mount: walk your knees up toward his armpits.',
        why: 'From high mount his arms are isolated above his elbows.',
        drag: { who: 'top', part: 'legL' },
        intent: 'High mount',
        key: { top: mountTop({ high: true, lean: 10 }), dur: 1.0 },
      },
      {
        say: 'He panics and pushes your chest with straight arms.',
        auto: true,
        key: {
          bottom: merge(mountBottom(), {
            limbs: {
              armL: { to: other('sternum', [0.08, 0.05, 0.12]), pole: [0.4, -0.5, 0], tension: 1.2 },
              armR: { to: other('sternum', [-0.08, 0.05, 0.12]), pole: [-0.4, -0.5, 0], tension: 1.2 },
            },
          }),
          dur: 0.8,
        },
      },
      {
        say: 'Trap his right arm to your chest with both arms.',
        drag: { who: 'top', part: 'armR' },
        intent: 'Trap the arm',
        key: {
          top: merge(mountTop({ high: true, lean: 5 }), {
            limbs: {
              armR: { to: other('elbowR', [0, 0.03, 0]), pole: [-0.6, -0.4, -1], grip: true },
              armL: { to: other('wristR'), pole: [0.6, -0.4, -1], grip: true },
            },
          }),
          dur: 0.8,
        },
      },
      {
        say: 'Swing your left leg over his head and sit back, close to his shoulder.',
        why: 'Hips tight to his armpit; knees squeeze his arm.',
        drag: { who: 'top', part: 'hips' },
        intent: 'Sit back',
        key: {
          top: {
            pose: 'sit',
            root: { at: other('armpitR', [-0.2, -0.04, 0.0], 0.14), rot: orient([-1, 0.35, 0], [0.2, 0.9, 0.1]), k: 3.5, rk: 2.5 },
            limbs: {
              legL: { to: other('ear_L', [0.1, 0.05, 0.05], 0.1), pole: [0, 1, 0.3] },
              legR: { to: other('hipL', [0.0, 0.2, 0.06], 0.12), pole: [0, 1, 0.3] },
              armR: { to: other('wristR'), pole: [-0.6, -0.4, -1], grip: true },
              armL: { to: other('wristR', [0, 0.05, 0]), pole: [0.6, -0.4, -1], grip: true },
            },
          },
          bottom: merge(supineAt(0, 0), { limbs: { armR: { to: other('sternum', [0, 0.05, 0.1]), pole: [0, 0, -1], tension: 0.4 } } }),
          dur: 1.3,
        },
      },
      {
        say: 'Thumb up, squeeze your knees, lift your hips slowly. Tap.',
        drag: { who: 'top', part: 'hips' },
        intent: 'Finish',
        key: {
          top: {
            pose: 'sit',
            joints: { lumbar: [-10, 0, 0] },
            root: { at: other('armpitR', [-0.2, -0.04, 0.0], 0.16), rot: orient([-1, 0.08, 0], [0.05, 1, 0.1]), k: 3.5, rk: 2.5 },
            limbs: {
              legL: { to: other('ear_L', [0.1, 0.05, 0.05], 0.1), pole: [0, 1, 0.3] },
              legR: { to: other('hipL', [0.0, 0.2, 0.06], 0.12), pole: [0, 1, 0.3] },
              armR: { to: other('wristR'), grip: true },
              armL: { to: other('wristR', [0, 0.05, 0]), grip: true },
            },
          },
          dur: 1.2,
        },
      },
    ],
  },
];

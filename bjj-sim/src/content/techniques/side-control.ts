import type { Technique } from '../types';
import { MAT, merge, other, self, world } from '../frames';
import { O, orient, turn } from '../orient';
import { feetPlanted, guardPlayer, inGuard, mountBottom, mountTop, sideControlBottom, sideControlTop, supineAt } from '../shapes';

// Side control: Blue across White's chest from White's LEFT (+X).

export const SIDE_TECHNIQUES: Technique[] = [
  {
    id: 'side-shrimp',
    name: 'Shrimp to guard',
    kind: 'escape',
    role: 'bottom',
    from: 'side-control',
    to: 'closed-guard',
    summary: 'Frame his neck and hip, bridge to make him post, shrimp away and put your knee back in.',
    mistakes: [
      'Pushing with straight arms: frames are bent-arm bone structures.',
      'Shrimping without bridging first: his weight pins your hips.',
      'Lying flat facing the ceiling: turn toward him.',
    ],
    steps: [
      {
        say: 'Frame: left forearm across his neck, right hand on his hip.',
        drag: { who: 'bottom', part: 'armL' },
        intent: 'Frame',
        key: {
          bottom: merge(supineAt(0, 0), {
            limbs: {
              armL: { to: other('chin', [0, -0.08, 0.05]), pole: [0.6, -1, 0] },
              armR: { to: other('hipsCenter', [0, 0.05, 0.1]), pole: [-0.4, -1, 0] },
              ...feetPlanted(),
            },
          }),
          dur: 0.8,
        },
      },
      {
        say: 'Bridge into him so he has to lift his weight.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Bridge',
        key: {
          bottom: {
            pose: 'supine',
            joints: { lumbar: [-15, 0, 0] },
            root: { at: world(0.05, 0.26, 0.02), rot: turn(O.supine, [0, 0, 1], -20), k: 4, rk: 3 },
            limbs: {
              armL: { to: other('chin', [0, -0.08, 0.08]), pole: [0.6, -1, 0] },
              armR: { to: other('hipsCenter', [0, 0.05, 0.12]), pole: [-0.4, -1, 0] },
              ...feetPlanted(),
            },
          },
          top: merge(sideControlTop(), { root: { at: other('belly', [0.36, 0.12, 0.2]), rot: orient([-1, 0.4, 0.05], [0, -1, 0]), k: 2, rk: 2 } }),
          dur: 0.6,
        },
      },
      {
        say: 'Shrimp: hips out to the right, away from him, onto your side.',
        why: 'You make the space with your hips, not your arms.',
        drag: { who: 'bottom', part: 'hips' },
        intent: 'Shrimp',
        key: {
          bottom: {
            pose: 'sideLying',
            root: { at: world(-0.3, 0.14, 0.06), rot: O.onLeftSide, k: 3.5, rk: 3 },
            limbs: {
              armL: { to: other('chin', [0, -0.08, 0.08]), pole: [0.6, -1, 0] },
              armR: { to: other('hipsCenter', [0, 0.05, 0.12]), pole: [-0.4, -1, 0] },
              legL: { mid: other('belly', [0, -0.05, 0.05]), lowerDir: [-1, 0, 0], lowerIn: 'world' },
            },
          },
          dur: 0.9,
        },
      },
      {
        say: 'Slide your knee across his belly, then swing your leg over his back.',
        drag: { who: 'bottom', part: 'legL' },
        intent: 'Knee in',
        cinematic: true,
        key: {
          bottom: guardPlayer(-0.35, 0.05, { grips: 'none' }),
          top: inGuard({ at: world(-0.35, 0.36, 0.42), rot: O.uprightFacingHead }),
          dur: 1.4,
        },
      },
    ],
  },

  {
    id: 'side-to-mount',
    name: 'Knee slide to mount',
    kind: 'transition',
    role: 'top',
    from: 'side-control',
    to: 'mount',
    summary: 'Keep the crossface, slide your near knee across his belly, and settle into mount.',
    mistakes: [
      'Lifting your chest to step over: he gets his knee in.',
      'Forgetting the crossface: he turns into you as you move.',
    ],
    steps: [
      {
        say: 'Keep your chest heavy and pin his near hip with your hand.',
        drag: { who: 'top', part: 'hips' },
        intent: 'Pin the hip',
        key: { top: sideControlTop({ underhook: false }), dur: 0.8 },
      },
      {
        say: 'Slide your near knee across his belly to the mat on the far side.',
        why: 'Knee low across the belly: no gap for his knee.',
        drag: { who: 'top', part: 'legL' },
        intent: 'Knee across',
        key: {
          top: merge(sideControlTop({ underhook: false }), {
            limbs: {
              legL: { mid: other('belly', [-0.15, -0.02, 0.1]), lowerDir: [1, 0.1, 0.2], lowerIn: 'world' },
              legR: { mid: other('armpitL', [0.33, -0.05, 0], MAT), lowerDir: [1, -0.15, 0.05], lowerIn: 'other' },
            },
          }),
          dur: 1.0,
        },
      },
      {
        say: 'Turn to face his head, post your knee on the far side: mount.',
        drag: { who: 'top', part: 'hips' },
        intent: 'Mount',
        cinematic: true,
        key: { top: mountTop({ lean: 20 }), bottom: mountBottom(), dur: 1.2 },
      },
    ],
  },

  {
    id: 'side-kimura',
    name: 'Kimura',
    kind: 'submission',
    role: 'top',
    from: 'side-control',
    summary: 'His far arm comes up: pin the wrist, thread under his elbow, figure-four, and rotate.',
    mistakes: [
      'Letting his elbow drift away from your chest: keep it tight.',
      'Cranking fast: rotate slowly so your partner can tap.',
    ],
    steps: [
      {
        say: 'He pushes up with his far arm.',
        auto: true,
        key: { bottom: merge(sideControlBottom(), { limbs: { armR: { to: self('ear_R', [-0.2, 0.05, 0.3]), pole: [-1, 0, 0] } } }), dur: 0.8 },
      },
      {
        say: 'Grab his far wrist with your far hand and pin it to the mat.',
        drag: { who: 'top', part: 'armL' },
        intent: 'Grab wrist',
        key: {
          top: merge(sideControlTop({ crossface: true, underhook: false }), { limbs: { armL: { to: other('wristR'), pole: [0, -1, 0.3], grip: true } } }),
          bottom: merge(sideControlBottom(), { limbs: { armR: { to: self('hipR', [-0.32, 0.25, 0], 0.1), pole: [-0.3, 1, 0] } } }),
          dur: 0.9,
        },
      },
      {
        say: 'Thread your other arm under his elbow and grab your own wrist.',
        drag: { who: 'top', part: 'armR' },
        intent: 'Figure-four',
        key: {
          top: merge(sideControlTop({ crossface: false, underhook: false }), {
            limbs: {
              armL: { to: other('wristR'), pole: [0, -1, 0.3], grip: true },
              armR: { to: self('wristL', [0, -0.03, 0]), pole: [0, -1, 0], grip: true },
            },
          }),
          dur: 0.9,
        },
      },
      {
        say: 'Keep his elbow tight and rotate his hand toward his head. Tap.',
        drag: { who: 'top', part: 'armL' },
        intent: 'Finish',
        key: {
          top: merge(sideControlTop({ crossface: false, underhook: false }), {
            limbs: {
              armL: { to: other('ear_R', [-0.2, 0.1, 0.05], 0.12), pole: [0, -1, 0.3], grip: true },
              armR: { to: self('wristL', [0, -0.03, 0]), pole: [0, -1, 0], grip: true },
            },
          }),
          bottom: merge(sideControlBottom(), { limbs: { armR: { to: self('ear_R', [-0.2, 0.1, 0.05], 0.12), pole: [-0.3, 1, -0.5], tension: 0.3 } } }),
          dur: 1.3,
        },
      },
    ],
  },
];

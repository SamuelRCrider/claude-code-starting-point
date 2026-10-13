import type { Vector3 } from 'three';
import type { Check, CheckCtx, Position } from './types';
import { kf, merge, other } from './frames';
import {
  backBottom, backTop, feetPlanted, framesTight, guardPlayer, halfGuardBottom, halfGuardTop, inGuard,
  kneeOnBellyTop, mountBottom, mountTop, northSouthTop, sideControlBottom, sideControlTop, supineAt,
  turtleBottom, turtleTop,
} from './shapes';

// Checks are geometric tests on the live bodies (see docs/bjj-sim/research-bjj-curriculum.md).
// Thresholds are tuned to the avatars, not canonical values.

/** Position of a point along the bottom athlete's spine (+ toward the head) from their hips. */
const along = (c: CheckCtx, p: Vector3) => c.local('bottom', 'pelvis', p).y;
/** Angle (deg) between a segment's spine axis and world up. */
const tilt = (c: CheckCtx, who: 'top' | 'bottom', seg: 'chest' | 'pelvis' = 'chest') =>
  (Math.acos(Math.max(-1, Math.min(1, c.axis(who, seg, [0, 1, 0]).y))) * 180) / Math.PI;
/** How much the bottom's chest faces up (1 = flat on back). */
const chestUp = (c: CheckCtx) => c.axis('bottom', 'chest', [0, 0, 1]).y;
const elbowsTight = (c: CheckCtx, who: 'top' | 'bottom', max = 0.2) =>
  (['L', 'R'] as const).every((s) => {
    const p = c.local(who, 'chest', c.lm(who, s === 'L' ? 'elbowL' : 'elbowR'));
    return Math.abs(p.x) < 0.3 && p.y < 0.05 && Math.hypot(Math.abs(p.x) - 0.18, p.z) < max;
  });
const handBehind = (c: CheckCtx, who: 'top' | 'bottom', target: 'top' | 'bottom', hands: ('handL' | 'handR')[]) =>
  hands.some((h) => {
    const p = c.local(target, 'chest', c.lm(who, h));
    return p.z < -0.02 && Math.abs(p.x) < 0.3 && p.y > -0.12 && p.y < 0.3;
  });

export const mountChecks: Check[] = [
  {
    id: 'M2', who: 'top', label: 'Knees pinched',
    why: 'Open knees give him space to shrimp and slide a knee in.',
    test: (c) => {
      const kl = c.local('bottom', 'abdomen', c.lm('top', 'kneeL'));
      const kr = c.local('bottom', 'abdomen', c.lm('top', 'kneeR'));
      return Math.abs(kl.x) < 0.46 && Math.abs(kr.x) < 0.46 && kl.x * kr.x < 0;
    },
  },
  {
    id: 'M5', who: 'top', label: 'Hips heavy',
    why: 'Weight on his hips kills the bridge. Hovering lets him move.',
    test: (c) => c.lm('top', 'hipsCenter').y - c.lm('bottom', 'belly').y < 0.2,
  },
  {
    id: 'M6', who: 'top', label: 'Base close',
    why: 'Hands posted far away can be trapped. Keep your posts near his head.',
    test: (c) => {
      const head = c.lm('bottom', 'backOfHead');
      return (['handL', 'handR'] as const).every((h) => {
        const p = c.lm('top', h);
        return p.y > 0.14 || p.distanceTo(head) < 0.45;
      });
    },
  },
  {
    id: 'M3', who: 'top', label: 'High mount',
    why: 'Knees above his elbows remove the elbow-knee escape.',
    test: (c) => {
      // Knees up by his armpits, above his elbows.
      const pit = along(c, c.lm('bottom', 'armpitL'));
      const el = Math.max(along(c, c.lm('bottom', 'elbowL')), along(c, c.lm('bottom', 'elbowR')));
      const k = Math.min(along(c, c.lm('top', 'kneeL')), along(c, c.lm('top', 'kneeR')));
      return k > el && k > pit - 0.14;
    },
  },
  {
    id: 'M7', who: 'top', label: 'Underhook',
    why: 'An arm under his armpit controls the shoulder and flattens him.',
    test: (c) => handBehind(c, 'top', 'bottom', ['handL', 'handR']),
  },
  {
    id: 'M8', who: 'bottom', label: 'Elbows tight',
    why: 'Elbows glued to the ribs block the high mount and armbars.',
    test: (c) => elbowsTight(c, 'bottom'),
  },
  {
    id: 'M8b', who: 'bottom', label: 'Feet planted',
    why: 'Feet near the butt are your engine: no feet, no bridge.',
    test: (c) => (['heelL', 'heelR'] as const).every((h) => c.lm('bottom', h).y < 0.16 && along(c, c.lm('bottom', h)) > -0.6),
  },
];

const guardChecks: Check[] = [
  {
    id: 'G1', who: 'bottom', label: 'Guard closed',
    why: 'Ankles crossed behind his back: he cannot pass without opening them.',
    test: (c) => c.lm('bottom', 'heelL').distanceTo(c.lm('bottom', 'heelR')) < 0.9 && c.local('top', 'pelvis', c.lm('bottom', 'heelL')).z < 0 && c.local('top', 'pelvis', c.lm('bottom', 'heelR')).z < 0,
  },
  {
    id: 'G3', who: 'bottom', label: 'Posture broken',
    why: 'Pull his head down. A bent-over opponent cannot punch, pass or defend chokes.',
    test: (c) => tilt(c, 'top') > 40 && c.lm('top', 'chin').distanceTo(c.lm('bottom', 'sternum')) < 0.45,
  },
  {
    id: 'G6', who: 'bottom', label: 'Hips angled',
    why: 'Square hips go nowhere. An angle opens armbars, triangles and sweeps.',
    test: (c) => Math.abs(c.local('top', 'pelvis', c.lm('bottom', 'hipsCenter')).x) > 0.12,
  },
  {
    id: 'G2', who: 'top', label: 'Posture up',
    why: 'Spine straight, head up. Broken posture feeds every attack in the guard.',
    test: (c) => tilt(c, 'top') < 28,
  },
  {
    id: 'G4', who: 'top', label: 'Elbows inside',
    why: 'Elbows inside his knees stop him climbing his legs up your back.',
    test: (c) => (['elbowL', 'elbowR'] as const).every((e) => {
      const p = c.local('bottom', 'pelvis', c.lm('top', e));
      const k = Math.min(Math.abs(c.local('bottom', 'pelvis', c.lm('bottom', 'kneeL')).x), Math.abs(c.local('bottom', 'pelvis', c.lm('bottom', 'kneeR')).x));
      return Math.abs(p.x) < k + 0.05;
    }),
  },
  {
    id: 'G5', who: 'top', label: 'Both arms in',
    why: 'One arm in, one arm out is the triangle choke setup.',
    test: (c) => {
      const inside = (h: 'handL' | 'handR') => Math.abs(c.local('bottom', 'pelvis', c.lm('top', h)).x) < 0.3;
      return inside('handL') === inside('handR');
    },
  },
];

const sideChecks: Check[] = [
  {
    id: 'S2', who: 'top', label: 'Chest heavy',
    why: 'Chest on his chest, hips low. Hips high = space for him to re-guard.',
    test: (c) => c.lm('top', 'sternum').distanceTo(c.lm('bottom', 'sternum')) < 0.32 && c.lm('top', 'hipsCenter').y < 0.42,
  },
  {
    id: 'S3', who: 'top', label: 'Crossface',
    why: 'Your shoulder turns his face away. He cannot turn in without his head.',
    test: (c) => (['handL', 'handR'] as const).some((h) => c.local('bottom', 'head', c.lm('top', h)).x < -0.05 && c.lm('top', h).distanceTo(c.lm('bottom', 'backOfHead')) < 0.3),
  },
  {
    id: 'S4', who: 'top', label: 'Far underhook',
    why: 'The far underhook stops him turning away and sets up mount.',
    test: (c) => (['handL', 'handR'] as const).some((h) => {
      const p = c.local('bottom', 'chest', c.lm('top', h));
      return p.x < -0.05 && p.z < 0.0;
    }),
  },
  {
    id: 'S5', who: 'top', label: 'Knees blocking',
    why: 'A knee tight to his hip stops his knee sliding in.',
    test: (c) => (['kneeL', 'kneeR'] as const).some((k) => c.lm('top', k).distanceTo(c.lm('bottom', 'hipL')) < 0.4),
  },
  {
    id: 'S6', who: 'bottom', label: 'Frames in',
    why: 'Forearm in his neck, hand on his hip: bones hold the space your hips need.',
    test: (c) => c.lm('bottom', 'handL').distanceTo(c.lm('top', 'sternum')) < 0.35 || c.lm('bottom', 'handL').distanceTo(c.lm('top', 'chin')) < 0.3,
  },
  {
    id: 'S7', who: 'bottom', label: 'On your side',
    why: 'Turn toward him. Flat on your back you can be walked over.',
    test: (c) => chestUp(c) < 0.8,
  },
];

const halfChecks: Check[] = [
  {
    id: 'H2', who: 'bottom', label: 'Underhook',
    why: 'Win the underhook on the trapped-leg side and you can come up.',
    test: (c) => handBehind(c, 'bottom', 'top', ['handL']),
  },
  {
    id: 'H3', who: 'bottom', label: 'On your side',
    why: 'Flat in half guard is a pass waiting to happen.',
    test: (c) => chestUp(c) < 0.85,
  },
  {
    id: 'H1', who: 'bottom', label: 'Leg trapped',
    why: 'Your legs lock one of his. Lose it and he is past.',
    test: (c) => c.lm('bottom', 'heelL').distanceTo(c.lm('top', 'kneeR')) < 0.42,
  },
  {
    id: 'H5', who: 'top', label: 'Crossface',
    why: 'Turn his head away and he cannot win the underhook.',
    test: (c) => (['handL', 'handR'] as const).some((h) => c.lm('top', h).distanceTo(c.lm('bottom', 'backOfHead')) < 0.25),
  },
  {
    id: 'H5b', who: 'top', label: 'Hips low',
    why: 'Heavy hips flatten him so you can free the leg.',
    test: (c) => c.lm('top', 'hipsCenter').y < 0.4,
  },
];

const backChecks: Check[] = [
  {
    id: 'B1', who: 'top', label: 'Chest to back',
    why: 'Any gap and he slides down and turns in.',
    test: (c) => c.lm('top', 'sternum').distanceTo(c.lm('bottom', 'upperBack')) < 0.3,
  },
  {
    id: 'B2', who: 'top', label: 'Hooks in',
    why: 'Heels inside his thighs steer his hips. Never cross your ankles.',
    test: (c) => c.lm('top', 'heelL').distanceTo(c.lm('bottom', 'hipR')) < 0.5 && c.lm('top', 'heelR').distanceTo(c.lm('bottom', 'hipL')) < 0.5,
  },
  {
    id: 'B4', who: 'top', label: 'Seatbelt',
    why: 'One arm over the shoulder, one under: he cannot turn either way.',
    test: (c) => c.lm('top', 'handL').distanceTo(c.lm('top', 'handR')) < 0.36 && c.lm('top', 'handR').distanceTo(c.lm('bottom', 'sternum')) < 0.32,
  },
  {
    id: 'B3', who: 'top', label: 'Ankles uncrossed',
    why: 'Crossed feet in front get foot-locked, and score nothing in IBJJF.',
    test: (c) => c.lm('top', 'heelL').distanceTo(c.lm('top', 'heelR')) > 0.25,
  },
  {
    id: 'B7', who: 'bottom', label: 'Two-on-one',
    why: 'Both hands on the choking arm. Fight hands before anything else.',
    test: (c) => c.lm('bottom', 'handL').distanceTo(c.lm('top', 'wristR')) < 0.25 && c.lm('bottom', 'handR').distanceTo(c.lm('top', 'wristR')) < 0.3,
  },
  {
    id: 'B7b', who: 'bottom', label: 'Chin tucked',
    why: 'No space under the chin, no rear-naked choke.',
    test: (c) => c.local('bottom', 'chest', c.lm('bottom', 'chin')).z > 0.04,
  },
];

const kobChecks: Check[] = [
  {
    id: 'K1', who: 'top', label: 'Knee on belly',
    why: 'Knee and shin across his belly: your weight goes through one point.',
    test: (c) => (['kneeL', 'kneeR'] as const).some((k) => c.lm('top', k).distanceTo(c.lm('bottom', 'belly')) < 0.36),
  },
  {
    id: 'K2', who: 'top', label: 'Base leg wide',
    why: 'Foot posted out wide is your balance. Too close and he rolls you.',
    test: (c) => (['footL', 'footR'] as const).some((f) => c.lm('top', f).distanceTo(c.lm('bottom', 'sternum')) > 0.45 && c.lm('top', f).y < 0.15),
  },
  {
    id: 'K3', who: 'top', label: 'Weight on knee',
    why: 'Hips over the knee. Sit back and it is just a knee resting on him.',
    test: (c) => {
      const hip = c.lm('top', 'hipsCenter');
      const k = [c.lm('top', 'kneeL'), c.lm('top', 'kneeR')].sort((a, b) => a.distanceTo(c.lm('bottom', 'belly')) - b.distanceTo(c.lm('bottom', 'belly')))[0];
      return Math.hypot(hip.x - k.x, hip.z - k.z) < 0.3;
    },
  },
  {
    id: 'K5', who: 'bottom', label: 'Bent-arm frames',
    why: 'Push his knee with bent arms. A straight arm is the far-side armbar.',
    test: (c) => elbowsTight(c, 'bottom', 0.3),
  },
];

const nsChecks: Check[] = [
  {
    id: 'N2', who: 'top', label: 'Chest pressure',
    why: 'Sternum on his sternum, hips low. Lift and he spins out.',
    test: (c) => c.lm('top', 'sternum').distanceTo(c.lm('bottom', 'sternum')) < 0.3 && c.lm('top', 'hipsCenter').y < 0.45,
  },
  {
    id: 'N3', who: 'top', label: 'Arms in tight',
    why: 'Arms wrapped tight around his upper body stop him framing.',
    test: (c) => (['handL', 'handR'] as const).every((h) => {
      const p = c.local('bottom', 'chest', c.lm('top', h));
      return Math.abs(p.x) > 0.12 && Math.abs(p.x) < 0.4 && p.z < 0.26;
    }),
  },
  {
    id: 'N9', who: 'bottom', label: 'Elbows in',
    why: 'Keep your elbows tight, or he catches a kimura.',
    test: (c) => elbowsTight(c, 'bottom', 0.3),
  },
];

const turtleChecks: Check[] = [
  {
    id: 'T2', who: 'bottom', label: 'Elbows to knees',
    why: 'No gap between elbows and knees means no hooks.',
    test: (c) => c.lm('bottom', 'elbowL').distanceTo(c.lm('bottom', 'kneeL')) < 0.5 && c.lm('bottom', 'elbowR').distanceTo(c.lm('bottom', 'kneeR')) < 0.5,
  },
  {
    id: 'T1', who: 'bottom', label: 'Hips low',
    why: 'Hips high and you get flattened or rolled.',
    test: (c) => c.lm('bottom', 'hipsCenter').y < 0.5,
  },
  {
    id: 'T3', who: 'top', label: 'Chest on back',
    why: 'Glue your chest to his back so he carries your weight.',
    test: (c) => c.lm('top', 'sternum').distanceTo(c.lm('bottom', 'upperBack')) < 0.4,
  },
  {
    id: 'T4', who: 'top', label: 'Seatbelt',
    why: 'Over one shoulder, under the other armpit: you go where he goes.',
    test: (c) => c.lm('top', 'handL').distanceTo(c.lm('top', 'handR')) < 0.45,
  },
];

export const POSITIONS: Position[] = [
  {
    id: 'mount',
    name: 'Mount',
    points: 4,
    blurb: 'Sitting on the torso facing the head. The most dominant pin after the back.',
    topName: 'Top (mounted)',
    bottomName: 'Bottom',
    setup: kf(mountTop(), mountBottom()),
    checks: mountChecks,
    concepts: [
      { who: 'top', text: 'Pinch your knees to his hips and ribs. Glue your weight to his hips.' },
      { who: 'top', text: 'Climb high: knees above his elbows shut down the elbow escape.' },
      { who: 'top', text: 'Post hands close to his head, never far out where he can trap them.' },
      { who: 'bottom', text: 'Elbows tight, forearms framing his hips. Never push his chest with straight arms.' },
      { who: 'bottom', text: 'Feet flat near your butt. Trap an arm AND a foot on the same side, then bridge.' },
    ],
    tweaks: [
      { who: 'top', label: 'High mount', key: { top: mountTop({ high: true }), dur: 0.9 } },
      { who: 'top', label: 'Get heavy', key: { top: mountTop({ lean: 45, hands: 'post' }), dur: 0.9 } },
      { who: 'top', label: 'Sit tall', key: { top: mountTop(), dur: 0.9 } },
      { who: 'bottom', label: 'Elbows in', key: { bottom: mountBottom(), dur: 0.7 } },
      { who: 'bottom', label: 'Push his chest (mistake)', key: { bottom: merge(mountBottom(), { limbs: { armL: { to: other('sternum', [0.08, 0.05, 0.12]), pole: [0.4, -0.5, 0] }, armR: { to: other('sternum', [-0.08, 0.05, 0.12]), pole: [-0.4, -0.5, 0] } } }), dur: 0.7 } },
    ],
  },
  {
    id: 'closed-guard',
    name: 'Closed guard',
    blurb: 'Legs locked around his waist. The bottom player attacks from here.',
    topName: 'Top (in guard)',
    bottomName: 'Bottom (guard)',
    setup: kf(inGuard(), guardPlayer(0, 0)),
    checks: guardChecks,
    concepts: [
      { who: 'bottom', text: 'Break his posture: pull with your knees and grips until his head is near your chest.' },
      { who: 'bottom', text: 'Get an angle with your hips. Square to him, you have no attacks.' },
      { who: 'bottom', text: 'Control an arm and the head or posture before you attack.' },
      { who: 'top', text: 'Posture first: spine straight, head up, hands on his hips.' },
      { who: 'top', text: 'Elbows inside his knees. Never one arm in and one out.' },
    ],
    tweaks: [
      { who: 'bottom', label: 'Break posture', key: { top: inGuard({ posture: 'broken' }), bottom: guardPlayer(0, 0, { grips: 'collar' }), dur: 1 } },
      { who: 'top', label: 'Posture up', key: { top: inGuard(), dur: 0.9 } },
    ],
  },
  {
    id: 'side-control',
    name: 'Side control',
    points: 3,
    blurb: 'Chest to chest across the body. Reached by passing the guard.',
    topName: 'Top',
    bottomName: 'Bottom',
    setup: kf(sideControlTop(), sideControlBottom()),
    camera: [-2.0, 1.4, 0.7],
    checks: sideChecks,
    concepts: [
      { who: 'top', text: 'Crossface: drive your shoulder into his jaw so he looks away from you.' },
      { who: 'top', text: 'Far underhook or near-hip control, hips low, chest heavy.' },
      { who: 'top', text: 'Knees tight to his hip and shoulder so his knee cannot slide in.' },
      { who: 'bottom', text: 'Frame: forearm in his neck, other hand on his hip. Turn toward him.' },
      { who: 'bottom', text: 'Bridge to make him post, then shrimp away and put your knee in.' },
    ],
    tweaks: [
      { who: 'top', label: 'Hips high (mistake)', key: { top: sideControlTop({ hipsHigh: true }), dur: 0.8 } },
      { who: 'top', label: 'Heavy hips', key: { top: sideControlTop(), dur: 0.8 } },
      { who: 'top', label: 'Release crossface', key: { top: sideControlTop({ crossface: false }), dur: 0.8 } },
    ],
  },
  {
    id: 'half-guard',
    name: 'Half guard',
    blurb: 'One of his legs trapped between yours. A battle for the underhook.',
    topName: 'Top',
    bottomName: 'Bottom (half guard)',
    setup: kf(halfGuardTop(), halfGuardBottom()),
    checks: halfChecks,
    concepts: [
      { who: 'bottom', text: 'Stay on your side, never flat. Head lower than his.' },
      { who: 'bottom', text: 'Win the underhook on the trapped-leg side, or use a knee shield for distance.' },
      { who: 'top', text: 'Crossface plus far underhook flattens him. Then free your leg.' },
      { who: 'top', text: 'If he gets the underhook, whizzer (overhook) it immediately.' },
    ],
    tweaks: [
      { who: 'bottom', label: 'Lose underhook', key: { bottom: halfGuardBottom({ underhook: false }), dur: 0.8 } },
      { who: 'bottom', label: 'Win underhook', key: { bottom: halfGuardBottom(), dur: 0.8 } },
    ],
  },
  {
    id: 'knee-on-belly',
    name: 'Knee on belly',
    points: 2,
    blurb: 'Knee across the belly, base leg wide. A mobile, crushing pin.',
    topName: 'Top',
    bottomName: 'Bottom',
    setup: kf(kneeOnBellyTop(), merge(supineAt(0, 0), { limbs: { ...framesTight(), ...feetPlanted() } })),
    camera: [-2.0, 1.4, 0.7],
    checks: kobChecks,
    concepts: [
      { who: 'top', text: 'Shin diagonal across his belly, foot hooked by his far hip.' },
      { who: 'top', text: 'Base leg posted out wide. Grip far collar and near hip.' },
      { who: 'top', text: 'If he pushes with a straight arm: far-side armbar.' },
      { who: 'bottom', text: 'Bent-arm frames on his knee and hip, turn in, shrimp away.' },
    ],
  },
  {
    id: 'back',
    name: 'Back control',
    points: 4,
    blurb: 'Chest to back, hooks in, seatbelt. Shown here on the ground. The best position in jiu-jitsu.',
    topName: 'Attacker',
    bottomName: 'Defender',
    setup: kf(backTop(), backBottom()),
    checks: backChecks,
    concepts: [
      { who: 'top', text: 'Seatbelt: one arm over the shoulder, one under the armpit, hands together.' },
      { who: 'top', text: 'Both heels inside his thighs. Never cross your ankles.' },
      { who: 'top', text: 'Head tight beside his, on the under-arm side.' },
      { who: 'bottom', text: 'Two hands on the choking arm, chin tucked.' },
      { who: 'bottom', text: 'Escape toward the choking arm side: get your shoulders to the mat there.' },
    ],
  },
  {
    id: 'turtle',
    name: 'Turtle',
    blurb: 'On knees and elbows, back to the opponent. A transition, not a home.',
    topName: 'Top',
    bottomName: 'Bottom (turtle)',
    setup: kf(turtleTop(), turtleBottom()),
    checks: turtleChecks,
    concepts: [
      { who: 'bottom', text: 'Elbows glued to knees, chin tucked, hips low. Then leave: sit out or roll.' },
      { who: 'top', text: 'Chest on his back, seatbelt grip, hips heavy. Insert a hook to take the back.' },
    ],
  },
  {
    id: 'north-south',
    name: 'North-south',
    blurb: 'Chest on chest, head toward his hips. Home of the kimura and NS choke.',
    topName: 'Top',
    bottomName: 'Bottom',
    setup: kf(northSouthTop(), merge(supineAt(0, 0), { limbs: { ...framesTight(), ...feetPlanted() } })),
    checks: nsChecks,
    concepts: [
      { who: 'top', text: 'Sternum on his sternum, hips low, arms under his armpits.' },
      { who: 'top', text: 'An arm coming up away from his body is a kimura.' },
      { who: 'bottom', text: 'Frame on his hips and shoulders, turn to a side, shrimp, knee in.' },
    ],
  },
];

export const positionById = (id: string) => POSITIONS.find((p) => p.id === id)!;

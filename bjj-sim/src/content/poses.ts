import type { PoseAngles } from '../game/goals';
import type { V3 } from '../physics/skeleton';

// Semantic helpers so poses read like anatomy instead of Euler soup.
// Euler order is XZY in the parent's frame (see physics/skeleton.ts for axes).
export const spine = (flex = 0, sideBendRight = 0, twistLeft = 0): V3 => [flex, twistLeft, sideBendRight];
export const hip = (side: 'L' | 'R', flex = 0, abduct = 0, rotOut = 0): V3 =>
  side === 'L' ? [-flex, -rotOut, abduct] : [-flex, rotOut, -abduct];
export const shoulder = (side: 'L' | 'R', flex = 0, abduct = 0, rotIn = 0): V3 =>
  side === 'L' ? [-flex, rotIn, abduct] : [-flex, -rotIn, -abduct];
export const knee = (flex: number): V3 => [flex, 0, 0];
export const elbow = (flex: number): V3 => [-flex, 0, 0];
export const ankle = (pointToes: number): V3 => [pointToes, 0, 0];

const both = (
  f: (s: 'L' | 'R') => PoseAngles,
): PoseAngles => ({ ...f('L'), ...f('R') });

export const POSES: Record<string, PoseAngles> = {
  stand: {},

  // On the back, knees up, elbows in, chin tucked — the defensive "turtle on the back".
  supine: {
    lumbar: spine(5), thoracic: spine(5), neck: spine(25),
    ...both((s) => ({
      [`hip${s}`]: hip(s, 55, 12),
      [`knee${s}`]: knee(85),
      [`ankle${s}`]: ankle(10),
      [`shoulder${s}`]: shoulder(s, 35, 20, 30),
      [`elbow${s}`]: elbow(115),
    })),
  },

  // Flat on the back, legs extended (what a pinned athlete collapses into).
  flat: {
    lumbar: spine(0), thoracic: spine(0), neck: spine(15),
    ...both((s) => ({
      [`hip${s}`]: hip(s, 5, 10),
      [`knee${s}`]: knee(10),
      [`shoulder${s}`]: shoulder(s, 20, 25),
      [`elbow${s}`]: elbow(60),
    })),
  },

  // Kneeling astride (mount / knee-ride base): hips flexed, knees deep.
  straddle: {
    lumbar: spine(10), thoracic: spine(5), neck: spine(10),
    ...both((s) => ({
      [`hip${s}`]: hip(s, 70, 35),
      [`knee${s}`]: knee(130),
      [`ankle${s}`]: ankle(30),
      [`shoulder${s}`]: shoulder(s, 30, 15),
      [`elbow${s}`]: elbow(70),
    })),
  },

  // Chest-to-chest pressure: torso flexed forward.
  heavyChest: {
    lumbar: spine(30), thoracic: spine(25), neck: spine(-10),
    ...both((s) => ({
      [`hip${s}`]: hip(s, 60, 30),
      [`knee${s}`]: knee(110),
      [`ankle${s}`]: ankle(30),
      [`shoulder${s}`]: shoulder(s, 70, 30),
      [`elbow${s}`]: elbow(90),
    })),
  },

  // Kneeling upright (combat base / guard top).
  kneel: {
    lumbar: spine(0), thoracic: spine(0), neck: spine(0),
    ...both((s) => ({
      [`hip${s}`]: hip(s, 85, 20),
      [`knee${s}`]: knee(140),
      [`ankle${s}`]: ankle(30),
      [`shoulder${s}`]: shoulder(s, 40, 10),
      [`elbow${s}`]: elbow(80),
    })),
  },

  // Seated, legs forward (back-take top / guard pull).
  sit: {
    lumbar: spine(20), thoracic: spine(10), neck: spine(5),
    ...both((s) => ({
      [`hip${s}`]: hip(s, 80, 25),
      [`knee${s}`]: knee(60),
      [`shoulder${s}`]: shoulder(s, 40, 15),
      [`elbow${s}`]: elbow(80),
    })),
  },

  // Turtle: knees and elbows tucked, back rounded.
  turtle: {
    lumbar: spine(35), thoracic: spine(30), neck: spine(35),
    ...both((s) => ({
      [`hip${s}`]: hip(s, 120, 10),
      [`knee${s}`]: knee(145),
      [`ankle${s}`]: ankle(35),
      [`shoulder${s}`]: shoulder(s, 70, 15, 10),
      [`elbow${s}`]: elbow(130),
    })),
  },

  // Side-lying on the hip (shrimping / half guard bottom).
  sideLying: {
    lumbar: spine(20), thoracic: spine(15), neck: spine(25),
    ...both((s) => ({
      [`hip${s}`]: hip(s, 70, 10),
      [`knee${s}`]: knee(90),
      [`shoulder${s}`]: shoulder(s, 50, 15, 20),
      [`elbow${s}`]: elbow(110),
    })),
  },

  // Prone / flattened on the belly.
  prone: {
    lumbar: spine(-5), thoracic: spine(0), neck: spine(-20),
    ...both((s) => ({
      [`hip${s}`]: hip(s, 5, 15),
      [`knee${s}`]: knee(20),
      [`shoulder${s}`]: shoulder(s, 60, 40),
      [`elbow${s}`]: elbow(90),
    })),
  },
};

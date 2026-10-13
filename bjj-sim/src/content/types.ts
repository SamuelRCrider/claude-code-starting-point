import type { Vector3 } from 'three';
import type { Keyframe } from '../game/goals';
import type { Ragdoll } from '../physics/ragdoll';
import type { Landmark, LimbName, SegName, V3 } from '../physics/skeleton';
import type { Who } from '../physics/sim';

export interface CheckCtx {
  top: Ragdoll;
  bottom: Ragdoll;
  /** World position of a landmark (+ optional local offset). */
  lm(who: Who, at: Landmark, off?: V3): Vector3;
  /** Express a world point in a segment's local frame. */
  local(who: Who, seg: SegName, p: Vector3): Vector3;
  /** World direction of a segment-local axis (e.g. chest [0,1,0] = where the spine points). */
  axis(who: Who, seg: SegName, v: V3): Vector3;
  /** Is the given hand/foot gripping? */
  gripping(who: Who, limb: LimbName): boolean;
}

/** A live, geometric test of a key detail ("hips heavy", "elbows tight"). */
export interface Check {
  id: string;
  who: Who;
  label: string;
  /** Why it matters / what happens if you don't. */
  why: string;
  test(c: CheckCtx): boolean;
}

export type DragPart = LimbName | 'hips';

export interface Step {
  /** Short imperative instruction, shown big. */
  say: string;
  /** One-line "why" under the instruction. */
  why?: string;
  /** Which body part the learner moves to perform this step. Target comes from `key`. */
  drag?: { who: Who; part: DragPart };
  /** Label for the tap-to-do-it intent button. */
  intent?: string;
  /** The whole-body goal this step leads to. */
  key: Keyframe;
  /** Opponent reaction / follow-through: plays automatically after `delay` seconds. */
  auto?: boolean;
  delay?: number;
  /** Glide there in joint space instead of fighting through contact (big scripted moments). */
  cinematic?: boolean;
}

export type TechKind = 'escape' | 'sweep' | 'submission' | 'pass' | 'transition' | 'control';

export interface Technique {
  id: string;
  name: string;
  kind: TechKind;
  /** Who the learner plays. */
  role: Who;
  from: string;
  to?: string;
  summary: string;
  /** Common mistakes and how they get punished. */
  mistakes?: string[];
  steps: Step[];
}

export interface Position {
  id: string;
  name: string;
  /** IBJJF points for achieving it (top), if any. */
  points?: number;
  blurb: string;
  topName: string;
  bottomName: string;
  setup: Keyframe;
  checks: Check[];
  /** Concepts shown on the position screen. */
  concepts: { who: Who; text: string }[];
  /** Sandbox intent buttons that tweak the current position. */
  tweaks?: { who: Who; label: string; key: Keyframe }[];
}

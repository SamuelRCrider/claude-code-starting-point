import * as THREE from 'three';
import type { Renderer } from '../render/scene';
import type { Sim, Who } from '../physics/sim';
import { LIMBS, type LimbName, type SegName, type V3 } from '../physics/skeleton';
import type { DragPart } from '../content/types';

/** Which handle a grabbed segment moves. */
export function partForSeg(seg: SegName, localY: number): { part: DragPart; mode: 'end' | 'mid' } {
  const side = seg.endsWith('L') ? 'L' : 'R';
  if (seg.startsWith('forearm')) return { part: `arm${side}` as LimbName, mode: 'end' };
  if (seg.startsWith('upperArm')) return { part: `arm${side}` as LimbName, mode: 'mid' };
  if (seg.startsWith('thigh')) return { part: `leg${side}` as LimbName, mode: 'mid' };
  // Shin: grabbing near the knee moves the knee, lower down moves the foot.
  if (seg.startsWith('shin')) return { part: `leg${side}` as LimbName, mode: localY > 0 ? 'mid' : 'end' };
  if (seg.startsWith('foot')) return { part: `leg${side}` as LimbName, mode: 'end' };
  return { part: 'hips', mode: 'end' };
}

/** World position of a drag handle. */
export function handlePos(sim: Sim, who: Who, part: DragPart, mode: 'end' | 'mid', out = new THREE.Vector3()) {
  const rd = sim.athlete(who);
  if (part === 'hips') return rd.segPos('pelvis', out);
  const def = LIMBS[part];
  if (mode === 'end') return rd.pointOn(def.lower, def.endLocal as V3, out);
  return rd.jointWorld(def.midJoint, out);
}

export interface DragState {
  who: Who;
  part: DragPart;
  mode: 'end' | 'mid';
  plane: THREE.Plane;
  target: THREE.Vector3;
  grabOffset: THREE.Vector3;
  pointerId: number;
  snapped: boolean;
}

export interface InteractionHooks {
  /** Optional snap target for a part (the current step's ghost). */
  snapFor(who: Who, part: DragPart): THREE.Vector3 | null;
  canDrag(who: Who): boolean;
  onDragStart?(d: DragState): void;
  onDragEnd?(d: DragState): void;
  onSnap?(d: DragState): void;
}

const HANDLE_PARTS: { part: DragPart; mode: 'end' | 'mid' }[] = [
  { part: 'armL', mode: 'end' }, { part: 'armR', mode: 'end' },
  { part: 'legL', mode: 'mid' }, { part: 'legR', mode: 'mid' },
  { part: 'legL', mode: 'end' }, { part: 'legR', mode: 'end' },
  { part: 'hips', mode: 'end' },
];

/**
 * One finger on a body part = move it (through muscles + a capped pulling force,
 * so heavy things feel heavy). One finger on empty space = orbit, pinch = zoom.
 */
export class Interaction {
  drag: DragState | null = null;
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  /** World pulling force cap (N) — about what one arm can push. */
  maxForce = 420;

  constructor(
    readonly r: Renderer,
    readonly sim: Sim,
    readonly hooks: InteractionHooks,
  ) {
    const el = r.canvas;
    // Capture phase so we decide before OrbitControls whether this is a drag.
    el.addEventListener('pointerdown', (e) => this.down(e), { capture: true });
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));
    sim.stepHooks.push((dt) => this.step(dt));
    sim.dragging = (who) => this.drag?.who === who;
  }

  private setNdc(e: PointerEvent) {
    const rect = this.r.canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.r.camera);
  }

  /** Find what's under the pointer: a mesh hit, or the nearest handle within a finger's reach. */
  pick(e: PointerEvent): { who: Who; part: DragPart; mode: 'end' | 'mid'; point: THREE.Vector3 } | null {
    this.setNdc(e);
    const hits = this.ray.intersectObjects(this.r.pickables, false);
    for (const h of hits) {
      const { who, seg } = h.object.userData as { who: Who; seg: SegName };
      if (!this.hooks.canDrag(who)) continue;
      const rd = this.sim.athlete(who);
      const local = h.point.clone().sub(rd.segPos(seg)).applyQuaternion(rd.segQuat(seg).invert());
      return { who, ...partForSeg(seg, local.y), point: h.point.clone() };
    }
    // Generous touch targets: nearest handle within ~32 px.
    const rect = this.r.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    let best: { who: Who; part: DragPart; mode: 'end' | 'mid'; point: THREE.Vector3 } | null = null;
    let bestD = 32;
    for (const who of ['top', 'bottom'] as Who[]) {
      if (!this.hooks.canDrag(who)) continue;
      for (const hp of HANDLE_PARTS) {
        const p = handlePos(this.sim, who, hp.part, hp.mode);
        const s = p.clone().project(this.r.camera);
        const sx = ((s.x + 1) / 2) * rect.width;
        const sy = ((1 - s.y) / 2) * rect.height;
        const d = Math.hypot(sx - px, sy - py);
        if (d < bestD) { bestD = d; best = { who, ...hp, point: p }; }
      }
    }
    return best;
  }

  private down(e: PointerEvent) {
    if (this.drag || e.button > 0) return;
    const hit = this.pick(e);
    if (!hit) return;
    // A body part: this gesture is ours, not the camera's.
    this.r.controls.enabled = false;
    e.stopPropagation();
    this.r.canvas.setPointerCapture?.(e.pointerId);
    const handle = handlePos(this.sim, hit.who, hit.part, hit.mode);
    const normal = this.r.camera.getWorldDirection(new THREE.Vector3()).negate();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hit.point);
    this.drag = {
      who: hit.who, part: hit.part, mode: hit.mode, plane,
      target: handle.clone(),
      grabOffset: handle.clone().sub(hit.point),
      pointerId: e.pointerId,
      snapped: false,
    };
    this.applyOverride();
    this.hooks.onDragStart?.(this.drag);
  }

  private move(e: PointerEvent) {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    this.setNdc(e);
    const p = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(d.plane, p)) return;
    p.add(d.grabOffset);
    p.y = Math.max(p.y, 0.05);
    // Magnetic snap toward the step's target.
    const snap = this.hooks.snapFor(d.who, d.part);
    const wasSnapped = d.snapped;
    d.snapped = !!snap && p.distanceTo(snap) < 0.14;
    d.target.copy(d.snapped ? snap! : p);
    if (d.snapped && !wasSnapped) this.hooks.onSnap?.(d);
    this.applyOverride();
  }

  private up(e: PointerEvent) {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    this.drag = null;
    this.r.controls.enabled = true;
    // The part stays where it was put (the override persists) until the step changes.
    this.hooks.onDragEnd?.(d);
  }

  private applyOverride() {
    const d = this.drag!;
    const ctl = this.sim.ctl[d.who];
    const t = d.target;
    if (d.part === 'hips') {
      const g = ctl.goal;
      ctl.goal = { ...g, root: { at: { world: [t.x, t.y, t.z] }, rot: g.root?.rot, k: 4, rk: g.root?.rk ?? 2 } };
      return;
    }
    ctl.overrides.set(d.part, { limb: d.part, mode: d.mode, ref: { world: [t.x, t.y, t.z] } });
  }

  /** Physics step: a capped pulling force on the dragged part on top of the muscles. */
  private step(dt: number) {
    const d = this.drag;
    if (!d) return;
    const rd = this.sim.athlete(d.who);
    let body;
    let local: THREE.Vector3;
    if (d.part === 'hips') {
      body = rd.body('pelvis');
      local = new THREE.Vector3();
    } else {
      const def = LIMBS[d.part];
      if (d.mode === 'end') { body = rd.body(def.lower); local = new THREE.Vector3(...(def.endLocal as V3)); }
      else { body = rd.body(def.lower); local = new THREE.Vector3(0, 0.2, 0); }
    }
    const q = body.rotation();
    const tr = body.translation();
    const wp = local.applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w)).add(new THREE.Vector3(tr.x, tr.y, tr.z));
    const lv = body.linvel();
    const f = d.target.clone().sub(wp).multiplyScalar(1500).sub(new THREE.Vector3(lv.x, lv.y, lv.z).multiplyScalar(60));
    const cap = d.part === 'hips' ? this.maxForce * 1.6 : this.maxForce;
    if (f.length() > cap) f.setLength(cap);
    body.applyImpulseAtPoint({ x: f.x * dt, y: f.y * dt, z: f.z * dt }, { x: wp.x, y: wp.y, z: wp.z }, true);
  }
}

import type RAPIER_NS from '@dimforge/rapier3d-compat';
import { Euler, Quaternion, Vector3 } from 'three';
import {
  FK_ORDER, JOINTS, JOINT_BY_CHILD, LANDMARKS, SEGMENTS, SEG_INDEX, anchorIn, segDef,
  type JointDef, type JointName, type Landmark, type SegName, type V3,
} from './skeleton';

type R = typeof RAPIER_NS;
type Body = RAPIER_NS.RigidBody;

const v3 = (a: V3) => new Vector3(a[0], a[1], a[2]);
const fromR = (v: { x: number; y: number; z: number }, out = new Vector3()) => out.set(v.x, v.y, v.z);
const qFromR = (q: { x: number; y: number; z: number; w: number }, out = new Quaternion()) =>
  out.set(q.x, q.y, q.z, q.w);

export interface RagdollOptions {
  id: 'top' | 'bottom';
  massKg: number;
  groupBit: number; // collision membership bit for this athlete
}

/** Collision group bits shared by the whole scene. */
export const GROUP_GROUND = 1 << 0;

interface JointState {
  def: JointDef;
  parent: Body;
  child: Body;
  joint: RAPIER_NS.ImpulseJoint;
  /** Outer-loop correction (rotation vector) for the motor's small-angle bias. */
  integ: Vector3;

  target: Quaternion; // child orientation relative to parent
  kp: number;
  kd: number;
  maxTorque: number;
  stiffness: number; // 0..1+ multiplier set by the controller (tension / relax)
  explicitInit?: boolean;
}

/**
 * An "active ragdoll": real rigid bodies with real masses, held in shape by
 * PD-controlled muscles with capped torque. Nothing is animated directly — the
 * athlete can only move by applying (limited) forces, which is what makes
 * bodies feel heavy.
 */
export class Ragdoll {
  readonly id: 'top' | 'bottom';
  readonly massKg: number;
  readonly bodies: Body[] = [];
  readonly colliders: RAPIER_NS.Collider[] = [];
  readonly joints: Record<JointName, JointState>;
  /** Pelvis guide: soft spring toward a world pose (coach's hand). 0 = off. */
  root = { pos: new Vector3(), quat: new Quaternion(), posK: 0, rotK: 0, active: false };
  /** Extra pulling forces on body points (grips, reaching, user drags). */
  readonly pulls: { body: Body; local: Vector3; target: Vector3; k: number; maxF: number }[] = [];
  globalTension = 1;
  /** Root joints (shoulder/hip) that may switch to the large-angle controller. */
  bigReach = new Set<JointName>();
  private readonly R: R;
  readonly groupBit: number;

  constructor(R: R, world: RAPIER_NS.World, opts: RagdollOptions) {
    this.R = R;
    this.id = opts.id;
    this.massKg = opts.massKg;
    this.groupBit = opts.groupBit;

    for (const s of SEGMENTS) {
      const bd = R.RigidBodyDesc.dynamic()
        .setTranslation(s.center[0], s.center[1], s.center[2])
        .setCanSleep(false)
        .setLinearDamping(0.05)
        // Limbs carry muscle damping; the trunk stays lively.
        .setAngularDamping(LIMB_SEGS.has(s.name) ? LIMB_DAMP : 0.4);
      const body = world.createRigidBody(bd);
      let cd: RAPIER_NS.ColliderDesc;
      if (s.shape.kind === 'capsule') cd = R.ColliderDesc.capsule(s.shape.halfHeight, s.shape.radius);
      else if (s.shape.kind === 'ball') cd = R.ColliderDesc.ball(s.shape.radius);
      else {
        const [hx, hy, hz] = s.shape.half;
        const r = s.shape.round;
        cd = R.ColliderDesc.roundCuboid(hx - r, hy - r, hz - r, r);
      }
      const mass = (s.massPct / 100) * this.massKg;
      cd.setMass(mass)
        .setFriction(0.9)
        .setRestitution(0)
        // Collide with the mat and the partner. Self-collision is off: limbs folded
        // onto your own torso (hands on chest, knees to chest) would fight forever.
        .setCollisionGroups(((opts.groupBit & 0xffff) << 16) | (0xffff & ~opts.groupBit))
        .setContactSkin(0.004);
      this.colliders.push(world.createCollider(cd, body));
      this.bodies.push(body);
    }

    const joints = {} as Record<JointName, JointState>;
    for (const j of JOINTS) {
      const parent = this.body(j.parent);
      const child = this.body(j.child);
      const a1 = anchorIn(j.parent, j.anchor);
      const a2 = anchorIn(j.child, j.anchor);
      const data = j.hinge
        ? R.JointData.revolute(
            { x: a1[0], y: a1[1], z: a1[2] },
            { x: a2[0], y: a2[1], z: a2[2] },
            { x: j.hinge[0], y: j.hinge[1], z: j.hinge[2] },
          )
        : R.JointData.spherical({ x: a1[0], y: a1[1], z: a1[2] }, { x: a2[0], y: a2[1], z: a2[2] });

      let joint = world.createImpulseJoint(data, parent, child, true);
      // Rapier 0.21 hands back the generic wrapper for ball joints; rewrap to reach the motors.
      if (!j.hinge) {
        const raw = joint as unknown as { rawSet: never; bodySet: never; handle: number };
        joint = new R.SphericalImpulseJoint(raw.rawSet, raw.bodySet, raw.handle);
      }
      joint.setContactsEnabled(false);
      if (j.hinge && j.limits) (joint as RAPIER_NS.RevoluteImpulseJoint).setLimits(j.limits[0], j.limits[1]);

      // Gains from the inertia of everything this joint has to swing.
      const inertia = subtreeInertia(j, this.massKg);
      const omega = MUSCLE_OMEGA; // rad/s — muscle "bandwidth"
      const scale = this.massKg / 80;
      const st: JointState = {
        def: j, parent, child, joint,
        integ: new Vector3(),
        target: new Quaternion(),
        kp: inertia * omega * omega,
        kd: 2 * inertia * omega * MUSCLE_ZETA,
        maxTorque: j.maxTorque * scale,
        stiffness: 1,
      };
      const axes = j.hinge ? [null] : [R.JointAxis.AngX, R.JointAxis.AngY, R.JointAxis.AngZ];
      for (const ax of axes) {
        if (ax === null) {
          (joint as RAPIER_NS.RevoluteImpulseJoint).configureMotorModel(R.MotorModel.ForceBased);
        } else {
          (joint as RAPIER_NS.SphericalImpulseJoint).configureMotorModel(ax, R.MotorModel.ForceBased);
        }
      }
      joints[j.name] = st;
    }
    this.joints = joints;
  }

  body(name: SegName): Body {
    return this.bodies[SEG_INDEX[name]];
  }

  segPos(name: SegName, out = new Vector3()): Vector3 {
    return fromR(this.body(name).translation(), out);
  }

  segQuat(name: SegName, out = new Quaternion()): Quaternion {
    return qFromR(this.body(name).rotation(), out);
  }

  /** World position of a point given in a segment's local frame. */
  pointOn(seg: SegName, local: V3 | Vector3, out = new Vector3()): Vector3 {
    const l = Array.isArray(local) ? v3(local) : local;
    return out.copy(l).applyQuaternion(this.segQuat(seg)).add(this.segPos(seg));
  }

  landmark(name: Landmark, out = new Vector3()): Vector3 {
    const lm = LANDMARKS[name];
    return this.pointOn(lm.seg, lm.p as V3, out);
  }

  jointWorld(name: JointName, out = new Vector3()): Vector3 {
    const j = this.joints[name].def;
    return this.pointOn(j.parent, anchorIn(j.parent, j.anchor), out);
  }

  centerOfMass(out = new Vector3()): Vector3 {
    out.set(0, 0, 0);
    let m = 0;
    for (const b of this.bodies) {
      const bm = b.mass();
      out.addScaledVector(fromR(b.translation(), _t), bm);
      m += bm;
    }
    return out.divideScalar(m);
  }

  /**
   * Instantly place the athlete: pelvis at `rootPos`/`rootQuat`, every joint at its
   * local target. Velocities are zeroed. Used to set up a position.
   */
  teleport(rootPos: Vector3, rootQuat: Quaternion, locals: Partial<Record<JointName, Quaternion>>) {
    const pos: Partial<Record<SegName, Vector3>> = { pelvis: rootPos.clone() };
    const rot: Partial<Record<SegName, Quaternion>> = { pelvis: rootQuat.clone() };
    for (const seg of FK_ORDER) {
      if (seg === 'pelvis') continue;
      const j = JOINT_BY_CHILD[seg]!;
      const pq = rot[j.parent]!;
      const cq = pq.clone().multiply(locals[j.name] ?? new Quaternion());
      const anchorW = v3(anchorIn(j.parent, j.anchor)).applyQuaternion(pq).add(pos[j.parent]!);
      pos[seg] = anchorW.sub(v3(anchorIn(seg, j.anchor)).applyQuaternion(cq));
      rot[seg] = cq;
    }
    for (const s of SEGMENTS) {
      const b = this.body(s.name);
      const p = pos[s.name]!;
      const q = rot[s.name]!;
      b.setTranslation({ x: p.x, y: p.y, z: p.z }, true);
      b.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
    for (const name of Object.keys(locals) as JointName[]) this.joints[name].target.copy(locals[name]!);
  }

  /** Apply muscle torques, pelvis guide and pulls. Call once per physics substep. */
  applyControl(dt: number) {
    for (const js of Object.values(this.joints)) this.applyMuscle(js, dt);
    this.applyRootGuide(dt);
    for (const p of this.pulls) {
      const wp = _a.copy(p.local).applyQuaternion(qFromR(p.body.rotation(), _q1)).add(fromR(p.body.translation(), _b));
      const f = _c.subVectors(p.target, wp).multiplyScalar(p.k);
      // Damping on the point velocity so pulls don't oscillate.
      const vel = pointVelocity(p.body, wp, _d);
      f.addScaledVector(vel, -2 * Math.sqrt(p.k * Math.max(1, p.body.mass())) * 0.7);
      if (f.length() > p.maxF) f.setLength(p.maxF);
      p.body.applyImpulseAtPoint({ x: f.x * dt, y: f.y * dt, z: f.z * dt }, { x: wp.x, y: wp.y, z: wp.z }, true);
    }
  }

  private applyMuscle(js: JointState, dt: number) {
    if (EXPLICIT_SHOULDERS && this.bigReach.has(js.def.name)) {
      // Opted-in limbs: implicit motor where it is accurate, explicit PD for big reaches.
      const big = rotvec(js.target, _a).length() > (js.explicitInit ? EXPL_ON - 0.15 : EXPL_ON);
      if (big) return this.applyExplicitMuscle(js, dt);
    }
    if (js.explicitInit) js.explicitInit = false;
    const k = Math.max(0, js.stiffness * this.globalTension);
    const kp = js.kp * k;
    const kd = js.kd * Math.sqrt(k) + 0.5;
    const cap = js.maxTorque * Math.min(1.5, Math.max(k, 0.02));
    if (js.def.hinge) {
      // Hinge angle about local X (rest pose is angle 0).
      const t = js.target;
      const angle = 2 * Math.atan2(t.x, t.w);
      const j = js.joint as RAPIER_NS.RevoluteImpulseJoint;
      j.configureMotorPosition(wrapPi(angle), kp, kd);
      j.setMotorMaxForce(cap);
      return;
    }
    // Ball joint: Rapier's per-axis motors track (approximately) the rotation vector
    // of the child relative to the parent. A slow outer loop removes the residual.
    const rel = _q1.copy(qFromR(js.parent.rotation(), _q2)).invert().multiply(qFromR(js.child.rotation(), _q3));
    const want = rotvec(js.target, _a);
    // Rotation-vector targets flip sign at 180°; stay clear of it.
    if (want.length() > MAX_BALL_ANGLE) want.setLength(MAX_BALL_ANGLE);
    const have = rotvec(rel, _b);
    const err = _c.subVectors(want, have);
    if (err.length() < 0.6) js.integ.addScaledVector(err, dt * INTEG_GAIN);
    else js.integ.multiplyScalar(0.98);
    if (js.integ.length() > 0.5) js.integ.setLength(0.5);
    const cmd = want.add(js.integ);
    const j = js.joint as RAPIER_NS.SphericalImpulseJoint;
    const R = this.R;
    j.configureMotorPosition(R.JointAxis.AngX, cmd.x, kp, kd);
    j.configureMotorPosition(R.JointAxis.AngY, cmd.y, kp, kd);
    j.configureMotorPosition(R.JointAxis.AngZ, cmd.z, kp, kd);
    j.setMotorMaxForce(R.JointAxis.AngX, cap);
    j.setMotorMaxForce(R.JointAxis.AngY, cap);
    j.setMotorMaxForce(R.JointAxis.AngZ, cap);
  }

  /**
   * Shoulders: Rapier's per-axis ball motors drift at the big angles arms reach
   * (seatbelts, underhooks), so these use a stable-PD torque instead. The arm is
   * light and the chest heavy, which keeps an explicit torque well conditioned.
   */
  private applyExplicitMuscle(js: JointState, dt: number) {
    const j = js.joint as RAPIER_NS.SphericalImpulseJoint;
    const R = this.R;
    if (!js.explicitInit) {
      for (const ax of [R.JointAxis.AngX, R.JointAxis.AngY, R.JointAxis.AngZ]) j.configureMotorPosition(ax, 0, 0, 0);
      js.explicitInit = true;
    }
    const k = Math.max(0, js.stiffness * this.globalTension);
    if (k <= 0.001) return;
    const isHip = js.def.name.startsWith('hip');
    const I = (isHip ? HIP_I : SHOULDER_I) * (this.massKg / 80);
    const w = (isHip ? EW_HIP : EW_ARM) * Math.sqrt(Math.min(k, 1.5));
    const kp = I * w * w;
    const kd = 2 * I * w * EZ;
    const pq = qFromR(js.parent.rotation(), _q1);
    const wRel = fromR(js.child.angvel(), _b).sub(fromR(js.parent.angvel(), _c));
    // Stable PD: aim from where the arm will be a step from now.
    const cq = qFromR(js.child.rotation(), _q2);
    const spin = _a.copy(wRel).multiplyScalar(dt);
    const ang = spin.length();
    if (ang > 1e-9) cq.premultiply(_q3.setFromAxisAngle(spin.divideScalar(ang), ang));
    const desired = pq.multiply(js.target);
    const err = desired.multiply(cq.invert());
    const e = rotvec(err, _a);
    const tau = e.multiplyScalar(kp).addScaledVector(wRel, -kd);
    const cap = js.maxTorque * Math.min(1.5, k);
    if (tau.length() > cap) tau.setLength(cap);
    js.child.applyTorqueImpulse({ x: tau.x * dt, y: tau.y * dt, z: tau.z * dt }, true);
    js.parent.applyTorqueImpulse({ x: -tau.x * dt, y: -tau.y * dt, z: -tau.z * dt }, true);
  }

  private applyRootGuide(dt: number) {
    const r = this.root;
    if (!r.active || (r.posK <= 0 && r.rotK <= 0)) return;
    const trunk = [this.body('pelvis'), this.body('abdomen'), this.body('chest')];
    const pelvis = trunk[0];
    const m = this.massKg;
    if (r.posK > 0) {
      // Critically damped spring on the whole-body mass, spread over the trunk.
      const w = r.posK;
      const p = fromR(pelvis.translation(), _a);
      const v = fromR(pelvis.linvel(), _b);
      const f = _c.subVectors(r.pos, p).multiplyScalar(m * w * w).addScaledVector(v, -2 * m * w);
      const cap = 9.81 * m * 2.5;
      if (f.length() > cap) f.setLength(cap);
      const share = [0.5, 0.25, 0.25];
      trunk.forEach((b, i) => b.applyImpulse({ x: f.x * dt * share[i], y: f.y * dt * share[i], z: f.z * dt * share[i] }, true));
    }
    if (r.rotK > 0) {
      // Core balance: hold each trunk segment toward its intended world orientation
      // (hips guide × spine targets). Without this a kneeling athlete is an
      // inverted pendulum and topples like a sack.
      const w = r.rotK * 3;
      const desired = [
        _q3.copy(r.quat),
        new Quaternion().copy(r.quat).multiply(this.joints.lumbar.target),
        new Quaternion().copy(r.quat).multiply(this.joints.lumbar.target).multiply(this.joints.thoracic.target),
      ];
      const I = m * 0.04;
      trunk.forEach((b, i) => {
        const q = qFromR(b.rotation(), _q1);
        const err = _q2.copy(desired[i]).multiply(q.invert());
        if (err.w < 0) err.set(-err.x, -err.y, -err.z, -err.w);
        const angle = 2 * Math.acos(Math.min(1, err.w));
        const s = Math.sqrt(Math.max(1e-12, 1 - err.w * err.w));
        const tau = _a.set(err.x / s, err.y / s, err.z / s).multiplyScalar(I * w * w * angle);
        tau.addScaledVector(fromR(b.angvel(), _b), -2 * I * w * 0.7);
        if (tau.length() > 350) tau.setLength(350);
        b.applyTorqueImpulse({ x: tau.x * dt, y: tau.y * dt, z: tau.z * dt }, true);
      });
    }
  }

  private calm = false;
  /**
   * Resting athletes get extra damping so tightly entangled holds don't buzz;
   * gravity and contact still act. Lively again as soon as someone moves them.
   */
  setCalm(on: boolean) {
    if (on === this.calm) return;
    this.calm = on;
    SEGMENTS.forEach((s, i) => {
      const b = this.bodies[i];
      b.setLinearDamping(on ? CALM_LIN : 0.05);
      b.setAngularDamping(on ? CALM_ANG : LIMB_SEGS.has(s.name) ? LIMB_DAMP : 0.4);
    });
  }

  setCollideWithPartner(on: boolean, partnerBit: number, segs?: SegName[]) {
    const list = segs ? segs.map((s) => this.colliders[SEG_INDEX[s]]) : this.colliders;
    const filter = (on ? 0xffff : 0xffff & ~partnerBit) & ~this.groupBit;
    for (const c of list) c.setCollisionGroups(((this.groupBit & 0xffff) << 16) | filter);
  }

  /** Total kinetic energy — used to detect when a position has settled. */
  kineticEnergy(): number {
    let e = 0;
    for (const b of this.bodies) {
      const v = b.linvel();
      e += 0.5 * b.mass() * (v.x * v.x + v.y * v.y + v.z * v.z);
    }
    return e;
  }
}

const MUSCLE_OMEGA = Number((globalThis as { process?: { env: Record<string, string> } }).process?.env?.OM ?? 22);
const MUSCLE_ZETA = Number((globalThis as { process?: { env: Record<string, string> } }).process?.env?.ZE ?? 0.8);
const LIMB_DAMP = Number((globalThis as { process?: { env: Record<string, string> } }).process?.env?.LD ?? 2.5);
const LIMB_SEGS = new Set<SegName>(['upperArmL', 'forearmL', 'upperArmR', 'forearmR', 'shinL', 'shinR', 'footL', 'footR']);
const CALM_LIN = Number((globalThis as { process?: { env: Record<string, string> } }).process?.env?.CL ?? 2);
const CALM_ANG = Number((globalThis as { process?: { env: Record<string, string> } }).process?.env?.CA ?? 5);
const EXPL_ON = Number((globalThis as { process?: { env: Record<string, string> } }).process?.env?.EON ?? 1.6);
const EW_ARM = Number((globalThis as { process?: { env: Record<string, string> } }).process?.env?.EWA ?? 8);
const EW_HIP = Number((globalThis as { process?: { env: Record<string, string> } }).process?.env?.EWH ?? 7);
const EZ = Number((globalThis as { process?: { env: Record<string, string> } }).process?.env?.EZ ?? 1.6);
const MAX_BALL_ANGLE = 2.6; // rad (~150°)
/** Whole-arm inertia about the shoulder for an 80 kg athlete (kg·m²). */
const SHOULDER_I = 0.42;
/** Whole-leg inertia about the hip. */
const HIP_I = 2.4;
const EXPLICIT_SHOULDERS = ((globalThis as { process?: { env: Record<string, string> } }).process?.env?.EXPL ?? '1') === '1';

function wrapPi(a: number) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Rotation vector (axis * angle) of a quaternion, shortest arc. */
export function rotvec(q: Quaternion, out: Vector3): Vector3 {
  let { x, y, z, w } = q;
  if (w < 0) { x = -x; y = -y; z = -z; w = -w; }
  const s = Math.sqrt(x * x + y * y + z * z);
  if (s < 1e-9) return out.set(2 * x, 2 * y, 2 * z);
  const angle = 2 * Math.atan2(s, w);
  return out.set((x / s) * angle, (y / s) * angle, (z / s) * angle);
}

function subtreeInertia(j: JointDef, massKg: number): number {
  const pivot = v3(j.anchor);
  let I = 0;
  const visit = (seg: SegName) => {
    const s = segDef(seg);
    const m = (s.massPct / 100) * massKg;
    I += m * (v3(s.center).distanceToSquared(pivot) + 0.004);
    for (const c of JOINTS) if (c.parent === seg) visit(c.child);
  };
  visit(j.child);
  return I;
}

function pointVelocity(b: Body, wp: Vector3, out: Vector3): Vector3 {
  const lv = fromR(b.linvel(), out);
  const w = fromR(b.angvel(), _e);
  const r = _f.subVectors(wp, fromR(b.translation(), _g));
  return lv.add(w.cross(r));
}

export function eulerQ(xDeg: number, yDeg: number, zDeg: number, order: 'XYZ' | 'XZY' | 'YXZ' | 'ZXY' = 'XZY') {
  const D = Math.PI / 180;
  return new Quaternion().setFromEuler(new Euler(xDeg * D, yDeg * D, zDeg * D, order));
}

export let INTEG_GAIN = Number((globalThis as { process?: { env: Record<string, string> } }).process?.env?.IG ?? 0);
export const setIntegGain = (g: number) => { INTEG_GAIN = g; };
const _t = new Vector3();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const _d = new Vector3();
const _e = new Vector3();
const _f = new Vector3();
const _g = new Vector3();
const _q1 = new Quaternion();
const _q2 = new Quaternion();
const _q3 = new Quaternion();


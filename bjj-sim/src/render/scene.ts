import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Ragdoll } from '../physics/ragdoll';
import { SEGMENTS, type SegName } from '../physics/skeleton';
import type { Who } from '../physics/sim';

export const COLORS: Record<Who, { gi: number; accent: number; css: string; name: string }> = {
  top: { gi: 0x2f6fed, accent: 0x1d4fb8, css: '#3b82f6', name: 'Blue' },
  bottom: { gi: 0xf2f0ea, accent: 0xd8d2c4, css: '#e9e4d8', name: 'White' },
};
const SKIN = 0xc98e6b;

export interface SegMesh {
  who: Who;
  seg: SegName;
  group: THREE.Group;
  mats: THREE.MeshStandardMaterial[];
}

export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly segMeshes: SegMesh[] = [];
  /** Pickable meshes → segment. */
  readonly pickables: THREE.Object3D[] = [];
  readonly overlay = new THREE.Group();
  private camGoal: { pos: THREE.Vector3; target: THREE.Vector3; t: number } | null = null;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.background = new THREE.Color(0x0e1116);
    this.scene.fog = new THREE.Fog(0x0e1116, 7, 16);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.05, 50);
    this.camera.position.set(2.2, 1.7, 1.4);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 0.25, -0.2);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.minDistance = 0.9;
    this.controls.maxDistance = 7;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

    this.buildGym();
    this.scene.add(this.overlay);
  }

  private buildGym() {
    const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x20242c, 1.1);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2.5, 5, 2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sc = key.shadow.camera;
    sc.left = -2.5; sc.right = 2.5; sc.top = 2.5; sc.bottom = -2.5; sc.near = 0.5; sc.far = 12;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fb8ff, 0.7);
    rim.position.set(-3, 2.5, -3);
    this.scene.add(rim);

    // Tatami: tiles with subtle seams.
    const tile = 1;
    const n = 8;
    const geo = new RoundedBoxGeometry(tile * 0.995, 0.04, tile * 0.995, 2, 0.008);
    const mats = [
      new THREE.MeshStandardMaterial({ color: 0x1f5d4a, roughness: 0.92 }),
      new THREE.MeshStandardMaterial({ color: 0x1b5343, roughness: 0.92 }),
      new THREE.MeshStandardMaterial({ color: 0x8a2a2a, roughness: 0.92 }),
    ];
    for (let i = -n / 2; i < n / 2; i++) {
      for (let j = -n / 2; j < n / 2; j++) {
        const edge = i === -n / 2 || j === -n / 2 || i === n / 2 - 1 || j === n / 2 - 1;
        const m = new THREE.Mesh(geo, edge ? mats[2] : mats[(i + j) & 1]);
        m.position.set(i * tile + tile / 2, -0.02, j * tile + tile / 2);
        m.receiveShadow = true;
        this.scene.add(m);
      }
    }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.045;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  addAthlete(who: Who) {
    const c = COLORS[who];
    const gi = () => new THREE.MeshStandardMaterial({ color: c.gi, roughness: 0.78 });
    const skin = () => new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.6 });
    for (const s of SEGMENTS) {
      const group = new THREE.Group();
      const mats: THREE.MeshStandardMaterial[] = [];
      const add = (geo: THREE.BufferGeometry, mat: THREE.MeshStandardMaterial, pos?: [number, number, number], pick = true) => {
        const m = new THREE.Mesh(geo, mat);
        if (pos) m.position.set(...pos);
        m.castShadow = true;
        m.receiveShadow = true;
        m.userData = { who, seg: s.name };
        group.add(m);
        mats.push(mat);
        if (pick) this.pickables.push(m);
        return m;
      };
      const sh = s.shape;
      if (s.name === 'head') {
        add(new THREE.SphereGeometry(0.105, 32, 24), skin());
        // Hair cap on the back/top so you can read which way the head faces.
        const hair = add(new THREE.SphereGeometry(0.109, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: 0x24190f, roughness: 0.9 }));
        hair.rotation.x = -0.65;
        // Ears and nose.
        const ear = new THREE.SphereGeometry(0.025, 12, 8);
        add(ear, skin(), [0.103, 0, -0.005], false);
        add(ear, skin(), [-0.103, 0, -0.005], false);
        add(new THREE.SphereGeometry(0.022, 12, 8), skin(), [0, -0.01, 0.103], false);
        add(new THREE.CylinderGeometry(0.048, 0.055, 0.12, 16), skin(), [0, -0.12, -0.01], false);
      } else if (sh.kind === 'capsule') {
        const isForearm = s.name.startsWith('forearm');
        add(new THREE.CapsuleGeometry(sh.radius, sh.halfHeight * 2, 6, 16), isForearm ? skin() : gi());
        if (isForearm) {
          // Gi sleeve over the upper forearm + a fist.
          add(new THREE.CylinderGeometry(sh.radius + 0.008, sh.radius + 0.012, 0.16, 16), gi(), [0, 0.09, 0]);
          add(new THREE.SphereGeometry(0.048, 16, 12), skin(), [0, -0.16, 0.005]);
        }
        if (s.name.startsWith('shin')) {
          // Bare foot side of the shin is skin; pants cover above.
          const pants = add(new THREE.CylinderGeometry(sh.radius + 0.012, sh.radius + 0.006, 0.22, 16), gi(), [0, 0.08, 0]);
          pants.castShadow = true;
        }
      } else if (sh.kind === 'box') {
        const [hx, hy, hz] = sh.half;
        const isFoot = s.name.startsWith('foot');
        if (isFoot) {
          const f = add(new RoundedBoxGeometry(hx * 2.1, hy * 2.4, hz * 2, 4, 0.028), skin(), [0, 0.006, 0]);
          f.scale.set(1, 1, 1);
          add(new THREE.SphereGeometry(0.042, 14, 10), skin(), [0, 0.012, -0.07], false);
        } else {
          // Visual torso is a touch bigger and rounder than its collider so the pieces read as one body.
          const round = Math.min(hx, hy, hz) * 0.85;
          add(new RoundedBoxGeometry(hx * 2.06, hy * 2.25, hz * 2.06, 4, round), gi());
        }
        if (s.name === 'pelvis') {
          // Belt.
          add(new RoundedBoxGeometry(hx * 2 + 0.02, 0.045, hz * 2 + 0.02, 2, 0.015), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 }), [0, 0.045, 0], false);
        }
        if (s.name === 'chest') {
          // Gi lapels: a darker V on the front.
          const lapel = new THREE.MeshStandardMaterial({ color: c.accent, roughness: 0.8 });
          const l1 = add(new THREE.BoxGeometry(0.04, 0.24, 0.012), lapel, [0.045, 0.0, hz + 0.001], false);
          l1.rotation.z = 0.35;
          const l2 = add(new THREE.BoxGeometry(0.04, 0.24, 0.012), lapel.clone(), [-0.045, 0.0, hz + 0.001], false);
          l2.rotation.z = -0.35;
        }
      } else {
        add(new THREE.SphereGeometry(sh.radius, 24, 16), gi());
      }
      // Fill joint gaps with spheres (shoulders, hips, knees, elbows).
      const jointBall: Partial<Record<SegName, [number, [number, number, number], boolean]>> = {
        upperArmL: [0.058, [0, 0.135, 0], false], upperArmR: [0.058, [0, 0.135, 0], false],
        forearmL: [0.047, [0, 0.165, 0], false], forearmR: [0.047, [0, 0.165, 0], false],
        thighL: [0.078, [0, 0.2, 0], false], thighR: [0.078, [0, 0.2, 0], false],
        shinL: [0.06, [0, 0.21, 0], false], shinR: [0.06, [0, 0.21, 0], false],
      };
      const jb = jointBall[s.name];
      if (jb) add(new THREE.SphereGeometry(jb[0], 16, 12), gi(), jb[1], false);

      this.scene.add(group);
      this.segMeshes.push({ who, seg: s.name, group, mats });
    }
  }

  sync(top: Ragdoll, bottom: Ragdoll) {
    for (const m of this.segMeshes) {
      const rd = m.who === 'top' ? top : bottom;
      const b = rd.body(m.seg);
      const t = b.translation();
      const r = b.rotation();
      m.group.position.set(t.x, t.y, t.z);
      m.group.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }

  /** Smoothly fly the camera to look at `target` from `pos`. */
  flyTo(pos: THREE.Vector3, target: THREE.Vector3, instant = false) {
    if (instant) {
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.camGoal = null;
      return;
    }
    this.camGoal = { pos: pos.clone(), target: target.clone(), t: 0 };
  }

  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (this.canvas.width !== Math.floor(w * this.renderer.getPixelRatio()) || this.canvas.height !== Math.floor(h * this.renderer.getPixelRatio())) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      // Portrait phones: widen the view so both athletes fit.
      this.camera.fov = w / h < 0.8 ? 58 : 42;
      this.camera.updateProjectionMatrix();
    }
  }

  render(dt: number) {
    this.resize();
    if (this.camGoal) {
      const g = this.camGoal;
      g.t = Math.min(1, g.t + dt * 2.2);
      const k = 1 - Math.pow(1 - g.t, 3);
      this.camera.position.lerp(g.pos, k * 0.25);
      this.controls.target.lerp(g.target, k * 0.25);
      if (g.t >= 1) this.camGoal = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  setHighlight(who: Who, segs: SegName[], color: number | null) {
    for (const m of this.segMeshes) {
      if (m.who !== who) continue;
      const on = color !== null && segs.includes(m.seg);
      for (const mat of m.mats) {
        mat.emissive.setHex(on ? color! : 0x000000);
        mat.emissiveIntensity = on ? 0.45 : 0;
      }
    }
  }

  clearHighlights() {
    for (const m of this.segMeshes) for (const mat of m.mats) { mat.emissive.setHex(0); mat.emissiveIntensity = 0; }
  }
}

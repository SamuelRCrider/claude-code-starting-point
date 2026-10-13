import * as THREE from 'three';
import type { Renderer } from './scene';

const AMBER = new THREE.Color(0xf5b54a);
const GREEN = new THREE.Color(0x34d399);

/** In-world teaching cues: the ghost target, a guide line and handle rings. */
export class CueOverlay {
  private ghost: THREE.Mesh;
  private ghostRing: THREE.Mesh;
  private handle: THREE.Mesh;
  private line: THREE.Line;
  private dots: THREE.Mesh[] = [];
  private t = 0;

  constructor(readonly r: Renderer) {
    const ghostMat = new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.35, depthTest: false });
    this.ghost = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16), ghostMat);
    this.ghost.renderOrder = 10;
    const ringMat = new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false });
    this.ghostRing = new THREE.Mesh(new THREE.RingGeometry(0.085, 0.1, 40), ringMat);
    this.ghostRing.renderOrder = 11;
    const handleMat = new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthTest: false });
    this.handle = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.092, 40), handleMat);
    this.handle.renderOrder = 12;
    const lineMat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.04, gapSize: 0.03, transparent: true, opacity: 0.8, depthTest: false });
    this.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), lineMat);
    this.line.renderOrder = 9;
    for (const o of [this.ghost, this.ghostRing, this.handle, this.line]) {
      o.visible = false;
      r.overlay.add(o);
    }
  }

  /** Show "move this → there". `progress` 0..1 colours the handle amber→green as it nears. */
  showCue(from: THREE.Vector3, to: THREE.Vector3, dt: number) {
    this.t += dt;
    const cam = this.r.camera;
    const d = from.distanceTo(to);
    const near = Math.max(0, Math.min(1, 1 - (d - 0.1) / 0.5));
    const pulse = 1 + Math.sin(this.t * 5) * 0.12;

    this.ghost.visible = this.ghostRing.visible = this.handle.visible = this.line.visible = true;
    this.ghost.position.copy(to);
    this.ghostRing.position.copy(to);
    this.ghostRing.quaternion.copy(cam.quaternion);
    this.ghostRing.scale.setScalar(pulse);
    this.handle.position.copy(from);
    this.handle.quaternion.copy(cam.quaternion);
    this.handle.scale.setScalar(1.1 - (pulse - 1));
    (this.handle.material as THREE.MeshBasicMaterial).color.copy(AMBER).lerp(GREEN, near);

    const pos = this.line.geometry.attributes.position as THREE.BufferAttribute;
    pos.setXYZ(0, from.x, from.y, from.z);
    pos.setXYZ(1, to.x, to.y, to.z);
    pos.needsUpdate = true;
    this.line.geometry.computeBoundingSphere();
    this.line.computeLineDistances();
  }

  hideCue() {
    this.ghost.visible = this.ghostRing.visible = this.handle.visible = this.line.visible = false;
  }

  /** Small grab dots on every draggable handle (explore mode). */
  showDots(points: THREE.Vector3[], color: number) {
    while (this.dots.length < points.length) {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.03, 0.045, 24),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthTest: false }),
      );
      m.renderOrder = 8;
      this.r.overlay.add(m);
      this.dots.push(m);
    }
    this.dots.forEach((m, i) => {
      m.visible = i < points.length;
      if (!m.visible) return;
      m.position.copy(points[i]);
      m.quaternion.copy(this.r.camera.quaternion);
      (m.material as THREE.MeshBasicMaterial).color.setHex(color);
    });
  }

  hideDots() {
    for (const m of this.dots) m.visible = false;
  }
}

// Headless physics smoke test: every position must settle without exploding,
// and stay roughly where it was put.
import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics, Sim } from '../src/physics/sim';
import { POSITIONS } from '../src/content/positions';

beforeAll(async () => {
  await initPhysics();
});

describe('positions settle', () => {
  for (const pos of POSITIONS) {
    it(pos.id, () => {
      const sim = new Sim();
      sim.setup(pos.setup, 1.0);
      const p0 = sim.top.segPos('pelvis').clone();
      const b0 = sim.bottom.segPos('pelvis').clone();
      for (let i = 0; i < 240; i++) sim.stepOnce();
      const ke = sim.top.kineticEnergy() + sim.bottom.kineticEnergy();
      const dt = sim.top.segPos('pelvis').distanceTo(p0);
      const db = sim.bottom.segPos('pelvis').distanceTo(b0);
      if (process.env.DIAG) {
        const f = (v: { x: number; y: number; z: number }) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
        console.log(pos.id, { ke: ke.toFixed(2), dt: dt.toFixed(3), db: db.toFixed(3), top: f(sim.top.segPos('pelvis')), topHead: f(sim.top.segPos('head')), bot: f(sim.bottom.segPos('pelvis')), botHead: f(sim.bottom.segPos('head')) });
      }
      expect(Number.isFinite(ke)).toBe(true);
      expect(ke).toBeLessThan(30);
      expect(dt).toBeLessThan(0.25);
      expect(db).toBeLessThan(0.25);
    });
  }
});

import { beforeAll, it } from 'vitest';
import { Vector3 } from 'three';
import { initPhysics, Sim } from '../src/physics/sim';
import { positionById } from '../src/content/positions';
beforeAll(async () => { await initPhysics(); });
const f = (v: Vector3) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
// Debug aid: POS=<id> TRACE=1 npx vitest run tests/trace.test.ts
it.skipIf(!process.env.TRACE)('trace', () => {
  const sim = new Sim();
  sim.setup(positionById(process.env.POS ?? 'back').setup, 0);
  for (let i = 0; i <= 240; i++) {
    if (i % 30 === 0) {
      const worst = [...sim.top.bodies.map((b, k) => ['T' + k, b] as const), ...sim.bottom.bodies.map((b, k) => ['B' + k, b] as const)]
        .map(([n, b]) => { const v = b.linvel(); return [n, Math.hypot(v.x, v.y, v.z)] as const; }).sort((a, b) => b[1] - a[1]).slice(0, 3);
      console.log((i / 120).toFixed(2), 'KE', (sim.top.kineticEnergy() + sim.bottom.kineticEnergy()).toFixed(1), worst.map((w) => `${w[0]}:${w[1].toFixed(2)}`).join(' '), 'tPel', f(sim.top.segPos('pelvis')));
    }
    sim.stepOnce();
  }
});

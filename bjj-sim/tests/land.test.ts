// Debug aid: POS=<id> LAND=1 npx vitest run tests/land.test.ts — dumps limb landmarks after setup.
import { beforeAll, it } from 'vitest';
import { Vector3 } from 'three';
import { initPhysics, Sim } from '../src/physics/sim';
import { positionById } from '../src/content/positions';
beforeAll(async () => { await initPhysics(); });
const f = (v: Vector3) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;
it.skipIf(!process.env.LAND)('land', () => {
  const sim = new Sim();
  sim.setup(positionById(process.env.POS ?? 'north-south').setup, 1);
  for (const who of ['top', 'bottom'] as const) {
    const r = sim.athlete(who);
    console.log(who, ['hipL', 'hipR'].map((j) => `${j} ${f(r.jointWorld(j as never))}`).join(' | '), '| kneeL', f(r.jointWorld('kneeL')), 'kneeR', f(r.jointWorld('kneeR')), '| heelL', f(r.landmark('heelL')), 'heelR', f(r.landmark('heelR')), '| elbowL', f(r.jointWorld('elbowL')), 'elbowR', f(r.jointWorld('elbowR')), '| handL', f(r.landmark('handL')), 'handR', f(r.landmark('handR')));
  }
});

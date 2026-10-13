// The base setups should pass the "good position" checks they are built to show,
// and the deliberate-mistake tweaks should fail them.
import { beforeAll, describe, expect, it } from 'vitest';
import { initPhysics, Sim, STEP } from '../src/physics/sim';
import { POSITIONS, positionById } from '../src/content/positions';
import { Director } from '../src/game/director';

beforeAll(async () => { await initPhysics(); });

function run(id: string, tweak?: string) {
  const sim = new Sim();
  const d = new Director(sim, { step: () => {}, stepDone: () => {}, finished: () => {}, checks: () => {}, caption: () => {} });
  const p = positionById(id);
  d.explore(p);
  if (tweak) d.tweak(p.tweaks!.find((t) => t.label === tweak)!.key);
  for (let i = 0; i < 240; i++) { sim.stepOnce(); d.update(STEP); }
  return Object.fromEntries(p.checks.map((c) => [c.id, c.test(d.ctx)]));
}

describe('checks', () => {
  it('report for every position', () => {
    for (const p of POSITIONS) if (process.env.DIAG) console.log(p.id, JSON.stringify(run(p.id)));
  });
  it('mount: low mount is pinched and heavy, not high', () => {
    const r = run('mount');
    expect(r.M2).toBe(true);
    expect(r.M5).toBe(true);
    expect(r.M3).toBe(false);
    expect(r.M8).toBe(true);
  });
  it('mount: high mount tweak passes the high-mount check', () => {
    expect(run('mount', 'High mount').M3).toBe(true);
  });
});

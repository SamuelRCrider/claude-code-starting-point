// Debug aid: CALIB=1 npx vitest run tests/calib.test.ts — raw numbers behind the checks.
import { beforeAll, it } from 'vitest';
import { initPhysics, Sim, STEP } from '../src/physics/sim';
import { positionById } from '../src/content/positions';
import { Director } from '../src/game/director';
beforeAll(async () => { await initPhysics(); });
it.skipIf(!process.env.CALIB)('calib', () => {
  const ctx = (id: string) => {
    const sim = new Sim();
    const d = new Director(sim, { step: () => {}, stepDone: () => {}, finished: () => {}, checks: () => {}, caption: () => {} });
    d.explore(positionById(id));
    for (let i = 0; i < 240; i++) { sim.stepOnce(); d.update(STEP); }
    return d.ctx;
  };
  const r = (n: number) => n.toFixed(2);
  let c = ctx('mount');
  const along = (cc: typeof c, p: ReturnType<typeof c.lm>) => cc.local('bottom', 'pelvis', p).y;
  const m3 = (cc: typeof c) => `knees ${r(along(cc, cc.lm('top', 'kneeL')))} ${r(along(cc, cc.lm('top', 'kneeR')))} elbows ${r(along(cc, cc.lm('bottom', 'elbowL')))} ${r(along(cc, cc.lm('bottom', 'elbowR')))} armpit ${r(along(cc, cc.lm('bottom', 'armpitL')))}`;
  console.log('M3 low', m3(c));
  {
    const sim = new Sim();
    const d = new Director(sim, { step: () => {}, stepDone: () => {}, finished: () => {}, checks: () => {}, caption: () => {} });
    const p = positionById('mount');
    d.explore(p);
    d.tweak(p.tweaks!.find((t) => t.label === 'High mount')!.key);
    for (let i = 0; i < 300; i++) { sim.stepOnce(); d.update(STEP); }
    console.log('M3 high', m3(d.ctx));
  }
  const kl = c.local('bottom', 'abdomen', c.lm('top', 'kneeL')), kr = c.local('bottom', 'abdomen', c.lm('top', 'kneeR'));
  console.log('M2 knees x', r(kl.x), r(kr.x));
  c = ctx('closed-guard');
  console.log('G1 heel dist', r(c.lm('bottom', 'heelL').distanceTo(c.lm('bottom', 'heelR'))), 'z behind', r(c.local('top', 'pelvis', c.lm('bottom', 'heelL')).z), r(c.local('top', 'pelvis', c.lm('bottom', 'heelR')).z));
  c = ctx('side-control');
  for (const h of ['handL', 'handR'] as const) { const p = c.local('bottom', 'chest', c.lm('top', h)); console.log('S4', h, r(p.x), r(p.y), r(p.z)); }
  console.log('S5 knee-hip', r(c.lm('top', 'kneeL').distanceTo(c.lm('bottom', 'hipL'))), r(c.lm('top', 'kneeR').distanceTo(c.lm('bottom', 'hipL'))));
  c = ctx('half-guard');
  console.log('H3 chestUp', r(c.axis('bottom', 'chest', [0, 0, 1]).y));
  c = ctx('knee-on-belly');
  console.log('K1 knee-belly', r(c.lm('top', 'kneeL').distanceTo(c.lm('bottom', 'belly'))), r(c.lm('top', 'kneeR').distanceTo(c.lm('bottom', 'belly'))), 'hips', c.lm('top', 'hipsCenter').toArray().map(r).join(','), 'kneeL', c.lm('top', 'kneeL').toArray().map(r).join(','));
  c = ctx('back');
  console.log('B2 heelL-kneeL', r(c.lm('top', 'heelL').distanceTo(c.lm('bottom', 'kneeL'))), 'heelR-kneeR', r(c.lm('top', 'heelR').distanceTo(c.lm('bottom', 'kneeR'))), 'B4 hands', r(c.lm('top', 'handL').distanceTo(c.lm('top', 'handR'))), 'handR-sternum', r(c.lm('top', 'handR').distanceTo(c.lm('bottom', 'sternum'))));
  c = ctx('turtle');
  console.log('T2 elbow-knee', r(c.lm('bottom', 'elbowL').distanceTo(c.lm('bottom', 'kneeL'))), r(c.lm('bottom', 'elbowR').distanceTo(c.lm('bottom', 'kneeR'))), 'T4 hands', r(c.lm('top', 'handL').distanceTo(c.lm('top', 'handR'))));
  c = ctx('north-south');
  for (const h of ['handL', 'handR'] as const) { const p = c.local('bottom', 'chest', c.lm('top', h)); console.log('N3', h, r(p.x), r(p.y), r(p.z)); }
});

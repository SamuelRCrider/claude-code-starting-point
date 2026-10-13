import { beforeAll, it } from 'vitest';
import { initPhysics, Sim, STEP } from '../src/physics/sim';
import { positionById } from '../src/content/positions';
import { Director } from '../src/game/director';
beforeAll(async () => { await initPhysics(); });
it.skipIf(!process.env.HM)('hm', () => {
  const sim = new Sim();
  const d = new Director(sim, { step: () => {}, stepDone: () => {}, finished: () => {}, checks: () => {}, caption: () => {} });
  const p = positionById('mount');
  d.explore(p);
  const along = (w: 'top' | 'bottom', lm: 'kneeL' | 'kneeR' | 'hipsCenter') => d.ctx.local('bottom', 'pelvis', d.ctx.lm(w, lm)).y.toFixed(2);
  console.log('before', along('top', 'hipsCenter'), along('top', 'kneeL'), along('top', 'kneeR'));
  d.tweak(p.tweaks!.find((t) => t.label === 'High mount')!.key);
  for (let i = 0; i < 300; i++) { sim.stepOnce(); d.update(STEP); if (i % 50 === 0) console.log(i, along('top', 'hipsCenter'), along('top', 'kneeL'), along('top', 'kneeR'), 'gliding', sim.gliding, 'hold', !!sim.ctl.top.holdPose); }
});

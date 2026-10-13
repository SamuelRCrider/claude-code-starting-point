// Headless technique report: for every step, how close each commanded limb and
// the hips got to their targets. Run: TECH=upa npx vitest run tests/tech.test.ts
import { beforeAll, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { initPhysics, Sim, STEP } from '../src/physics/sim';
import { Director, resolveTarget } from '../src/game/director';
import { TECHNIQUES } from '../src/content/techniques';
import { positionById } from '../src/content/positions';
import { handlePos } from '../src/game/interaction';
import type { DragPart } from '../src/content/types';
import type { Who } from '../src/physics/sim';

beforeAll(async () => { await initPhysics(); });
const f = (v: Vector3) => `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`;

const ids = (process.env.TECH ?? TECHNIQUES.map((t) => t.id).join(',')).split(',');
for (const id of ids) {
  it(id, () => {
    const t = TECHNIQUES.find((x) => x.id === id)!;
    const sim = new Sim();
    const lines: string[] = [];
    const d = new Director(sim, { step: () => {}, stepDone: () => {}, finished: () => {}, checks: () => {}, caption: () => {} });
    d.begin(positionById(t.from), t, 'watch');
    let worst = 0;
    let maxKE = 0;
    t.steps.forEach((s, i) => {
      // wait for this step to start, then perform and let it play out
      let guard = 0;
      while (d.stepIndex === i && guard++ < 2000) { sim.stepOnce(); d.update(STEP); }
      const parts: string[] = [];
      for (const who of ['top', 'bottom'] as Who[]) {
        const g = s.key[who];
        if (!g) continue;
        const list: DragPart[] = [...(Object.keys(g.limbs ?? {}) as DragPart[]), ...(g.root ? ['hips' as DragPart] : [])];
        for (const p of list) {
          const tgt = resolveTarget(sim, s.key, who, p);
          if (!tgt) continue;
          const lg = p === 'hips' ? null : g.limbs![p as 'armL'];
          const mode = p === 'hips' ? 'end' : lg?.to ? 'end' : 'mid';
          const at = handlePos(sim, who, p, mode);
          const e = at.distanceTo(tgt);
          worst = Math.max(worst, e);
          parts.push(`${who[0]}.${p}${mode === 'mid' ? '(mid)' : ''} err=${e.toFixed(2)}${e > 0.15 ? ' !!' : ''} at=${f(at)} tgt=${f(tgt)}`);
        }
      }
      const ke = sim.top.kineticEnergy() + sim.bottom.kineticEnergy();
      maxKE = Math.max(maxKE, ke);
      lines.push(`#${i} ${s.say.slice(0, 50)} | KE=${ke.toFixed(1)}\n    ${parts.join('\n    ')}`);
    });
    lines.push(`end: top pelvis ${f(sim.top.segPos('pelvis'))} head ${f(sim.top.segPos('head'))} | bottom pelvis ${f(sim.bottom.segPos('pelvis'))} head ${f(sim.bottom.segPos('head'))}`);
    if (process.env.DIAG) console.log(`=== ${id}\n` + lines.join('\n'));
    // Every step should come to rest without anyone being launched.
    expect(maxKE).toBeLessThan(60);
  });
}

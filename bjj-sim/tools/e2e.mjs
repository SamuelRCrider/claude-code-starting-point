// End-to-end check on a phone viewport: home → position → lesson, with a real drag.
import { chromium } from 'playwright-core';
const W = +(process.env.W || 390), H = +(process.env.H || 844);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
const adv = (s) => page.evaluate((s) => window.__advance(s), s);
await page.goto('http://localhost:5199/');
await page.waitForTimeout(1500);
await page.evaluate(() => { window.__sim.paused = true; });
await adv(0.5);
await page.screenshot({ path: 'shots/e2e-1-home.png' });

await page.click('.path-item >> nth=0');
await adv(1.0);
await page.waitForTimeout(200);
await page.screenshot({ path: 'shots/e2e-2-position.png' });
const chips = await page.$$eval('.chip', (els) => els.map((e) => `${e.textContent}:${e.classList.contains('ok')}`));
console.log('chips', chips.join(', '));

// Learn the first technique of the learner role.
await page.click('.tech .btn.primary >> nth=0');
await adv(1.2);
await page.waitForTimeout(150);
await page.screenshot({ path: 'shots/e2e-3-lesson.png' });

// Drive the lesson: drag when there is a cue, otherwise wait for auto steps.
for (let guard = 0; guard < 14; guard++) {
  const st = await page.evaluate(() => {
    const d = window.__app.director;
    const c = d.cue();
    const proj = (v) => { const p = v.clone().project(window.__r.camera); return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight]; };
    return { i: d.stepIndex, n: d.technique.steps.length, busy: d.busy, cue: c ? { from: proj(c.from), to: proj(c.to) } : null };
  });
  if (st.i >= st.n) break;
  if (st.cue && !st.busy) {
    const [fx, fy] = st.cue.from; const [tx, ty] = st.cue.to;
    await page.mouse.move(fx, fy);
    await page.mouse.down();
    for (let k = 1; k <= 12; k++) { await page.mouse.move(fx + (tx - fx) * k / 12, fy + (ty - fy) * k / 12); await adv(0.06); }
    await adv(0.6);
    const after = await page.evaluate(() => window.__app.director.stepIndex);
    if (after === st.i && !(await page.evaluate(() => window.__app.director.busy))) {
      console.log(`step ${st.i}: drag did not reach target, using intent button`);
      await page.mouse.up();
      await page.click('.step-actions .btn.primary');
    } else {
      console.log(`step ${st.i}: completed by drag`);
      await page.mouse.up();
    }
  } else if (!st.busy) {
    const btn = await page.$('.step-actions .btn.primary');
    if (btn) await btn.click();
  }
  await adv(1.6);
  if (guard === 1) await page.screenshot({ path: 'shots/e2e-4-mid.png' });
}
await adv(1.0);
await page.waitForTimeout(150);
await page.screenshot({ path: 'shots/e2e-5-done.png' });
console.log('final text:', await page.$eval('.step', (e) => e.textContent.slice(0, 120)));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();

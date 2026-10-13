// Contact sheet of every technique's end position. Usage: node tools/finals.mjs [ids]
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 420, height: 320 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('http://localhost:5199/');
await page.waitForTimeout(1500);
const ids = process.argv[2] ? process.argv[2].split(',') : await page.evaluate(() => window.__techIds());
let i = 0;
for (const id of ids) {
  const total = await page.evaluate((id) => {
    const from = window.__techFrom(id);
    window.__app.go({ kind: 'lesson', pos: from, tech: id, mode: 'watch' });
    window.__sim.paused = true;
    document.getElementById('ui').style.display = 'none';
    document.querySelector('.caption').style.display = 'none';
    return window.__techTime(id);
  }, id);
  await page.evaluate((t) => window.__advance(t), total);
  await page.evaluate(() => {
    const s = window.__sim, r = window.__r;
    const c = s.top.segPos('pelvis').add(s.bottom.segPos('pelvis')).multiplyScalar(0.5); c.y = 0.25;
    window.__app.follow = false;
    r.flyTo(c.clone().add({ x: 1.3, y: 1.0, z: 0.9 }), c, true);
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: `shots/fin-${i++}.png` });
  console.log(i - 1, id);
}
await browser.close();

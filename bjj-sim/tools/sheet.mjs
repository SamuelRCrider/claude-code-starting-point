// Contact sheet: play a technique in watch mode and grab frames.
// Usage: node scripts-sheet.mjs <techId> <outPrefix> [frames=8] [intervalMs=900] [cam x,y,z]
import { chromium } from 'playwright-core';
const [, , tech, out = 'shots/sheet', n = '8', every = '900', cam = ''] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) console.log('console:', m.text()); });
await page.goto('http://localhost:5199/');
await page.waitForTimeout(1500);
if (process.env.GLIDE) await page.evaluate(() => window.__glide(true));
await page.evaluate((tech) => {
  const app = window.__app; const t = tech;
  const pos = window.__techFrom?.(t);
  app.go({ kind: 'lesson', pos, tech: t, mode: 'watch' }); window.__sim.paused = true;
  document.getElementById('ui').style.display = 'none';
}, tech);
for (let i = 0; i < +n; i++) {
  await page.evaluate(([ms, cam]) => {
    window.__advance(ms / 1000);
    const s = window.__sim, r = window.__r;
    const a = s.top.segPos('pelvis'), b = s.bottom.segPos('pelvis');
    const c = a.clone().add(b).multiplyScalar(0.5); c.y = 0.25;
    const off = cam ? cam.split(',').map(Number) : [1.7, 0.85, 0.5];
    window.__app.follow = false;
    r.controls.target.copy(c);
    r.camera.position.set(c.x + off[0], c.y + off[1], c.z + off[2]);
    r.flyTo(r.camera.position.clone(), c, true);
  }, [+every, cam]);
  await page.waitForTimeout(120);
  const cap = await page.evaluate(() => document.querySelector('.caption')?.textContent ?? '');
  await page.screenshot({ path: `${out}-${i}.png` });
  console.log(i, cap);
}
await browser.close();

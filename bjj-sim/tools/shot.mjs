// Usage: node scripts-shot.mjs "<query>" out.png [w h] [cam x,y,z] [wait ms]
import { chromium } from 'playwright-core';
const [, , q = '', out = 'shots/shot.png', w = '900', h = '700', cam = '', wait = '2500'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('[dbg]')) console.log('console:', m.text()); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('http://localhost:5199/?' + q);
await page.waitForTimeout(+wait);
if (cam) {
  const [x, y, z] = cam.split(',').map(Number);
  await page.evaluate(([x, y, z]) => { const r = window.__r; r.camera.position.set(x, y, z); }, [x, y, z]);
  await page.waitForTimeout(300);
}
await page.screenshot({ path: out });
await browser.close();

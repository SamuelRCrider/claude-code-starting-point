// Screenshot every position after it settles. Usage: node scripts-positions.mjs [ids,comma] [settleSec]
import { chromium } from 'playwright-core';
const ids = (process.argv[2] || 'mount,closed-guard,side-control,half-guard,knee-on-belly,back,turtle,north-south').split(',');
const settle = +(process.argv[3] || 1.5);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('http://localhost:5199/');
await page.waitForTimeout(1500);
let i = 0;
for (const id of ids) {
  await page.evaluate(([id, settle]) => {
    window.__app.go({ kind: 'position', id });
    window.__sim.paused = true;
    document.getElementById('ui').style.display = 'none';
    window.__advance(settle);
    const s = window.__sim, r = window.__r;
    const c = s.top.segPos('pelvis').add(s.bottom.segPos('pelvis')).multiplyScalar(0.5); c.y = 0.25;
    window.__app.follow = false;
    r.flyTo(c.clone().add({ x: 1.5, y: 0.9, z: 0.9 }), c, true);
  }, [id, settle]);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `shots/pos-${i++}.png` });
}
await browser.close();

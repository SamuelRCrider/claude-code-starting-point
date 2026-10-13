import './ui/style.css';
import { initPhysics, Sim, STEP } from './physics/sim';
import { Renderer } from './render/scene';
import { App } from './ui/app';
import { TECHNIQUES } from './content/techniques';
import { setForceGlide } from './game/director';

async function boot() {
  await initPhysics();
  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const r = new Renderer(canvas);
  r.addAthlete('top');
  r.addAthlete('bottom');
  const sim = new Sim();
  const app = new App(sim, r);
  Object.assign(window as object, { __sim: sim, __r: r, __app: app, __techFrom: (id: string) => TECHNIQUES.find((t) => t.id === id)?.from });
  // Deterministic stepping for automated captures.
  Object.assign(window as object, {
    __glide: setForceGlide,
    __advance: (sec: number) => {
      for (let i = 0; i < Math.round(sec / STEP); i++) { sim.stepOnce(); app.frame(STEP); }
      r.sync(sim.top, sim.bottom);
    },
  });
  document.getElementById('boot')?.remove();

  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    sim.advance(dt);
    app.frame(dt);
    r.sync(sim.top, sim.bottom);
    r.render(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
boot().catch((e) => {
  const el = document.getElementById('boot');
  if (el) el.textContent = `Could not start the physics engine: ${e?.message ?? e}. Try a recent Chrome, Safari or Firefox.`;
});

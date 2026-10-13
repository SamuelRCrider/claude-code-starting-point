import * as THREE from 'three';
import { POSITIONS, positionById } from '../content/positions';
import { TECHNIQUES, techniquesFor } from '../content/techniques';
import type { Position, Step, TechKind, Technique } from '../content/types';
import { Director } from '../game/director';
import { handlePos, Interaction } from '../game/interaction';
import type { Sim, Who } from '../physics/sim';
import { CueOverlay } from '../render/overlay';
import { COLORS, type Renderer } from '../render/scene';
import { h, icon, put, swap } from './dom';
import { progress } from './progress';

type Screen = { kind: 'home' } | { kind: 'position'; id: string } | { kind: 'lesson'; pos: string; tech: string; mode: 'learn' | 'watch' };

const KIND_LABEL: Record<TechKind, string> = {
  escape: 'Escape', sweep: 'Sweep', submission: 'Submission', pass: 'Pass', transition: 'Transition', control: 'Control',
};

/** Learning path order (survival first, after Gracie Combatives). */
const PATH = ['mount', 'closed-guard', 'side-control', 'half-guard', 'knee-on-belly', 'back', 'turtle', 'north-south'];

export class App {
  private screen: Screen = { kind: 'home' };
  private readonly root: HTMLElement;
  private readonly director: Director;
  private readonly cues: CueOverlay;
  private readonly interaction: Interaction;
  private checkEls = new Map<string, HTMLElement>();
  private stepEl: HTMLElement | null = null;
  private captionEl: HTMLElement;
  private toastEl: HTMLElement;
  private slowmo = false;
  private follow = true;
  private camCenter = new THREE.Vector3(0, 0.25, -0.2);

  constructor(readonly sim: Sim, readonly r: Renderer) {
    this.root = document.getElementById('ui')!;
    this.cues = new CueOverlay(r);
    this.captionEl = h('div', { class: 'caption', hidden: true });
    this.toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(this.captionEl, this.toastEl);

    this.director = new Director(sim, {
      step: (i, s) => this.onStep(i, s),
      stepDone: () => this.buzz(18),
      finished: () => this.onFinished(),
      checks: (res) => this.onChecks(res),
      caption: (t) => this.caption(t),
    });

    this.interaction = new Interaction(r, sim, {
      snapFor: (who, part) => this.director.targetFor(who, part),
      canDrag: (who) => this.screen.kind !== 'home' && !(this.director.mode === 'watch' && this.screen.kind === 'lesson') && (this.screen.kind !== 'lesson' || this.director.step?.drag?.who === who || !this.director.step?.drag),
      onSnap: () => this.buzz(8),
      onDragStart: () => this.hideGestureHint(),
    });

    // Double-tap empty space re-frames the action.
    let lastTap = 0;
    r.canvas.addEventListener('pointerup', () => {
      const now = performance.now();
      if (now - lastTap < 300 && !this.interaction.drag) this.frameCamera();
      lastTap = now;
    });

    window.addEventListener('popstate', () => this.go(this.parseHash(), false));
    this.go(this.parseHash(), false);
  }

  // ---------------------------------------------------------------- routing

  private parseHash(): Screen {
    const parts = location.hash.replace(/^#/, '').split('.');
    if (parts[0] === 'p' && parts[1] && POSITIONS.some((p) => p.id === parts[1])) return { kind: 'position', id: parts[1] };
    if (parts[0] === 't' && parts[1] && TECHNIQUES.some((t) => t.id === parts[1])) {
      const t = TECHNIQUES.find((x) => x.id === parts[1])!;
      return { kind: 'lesson', pos: t.from, tech: t.id, mode: 'learn' };
    }
    return { kind: 'home' };
  }

  go(s: Screen, push = true) {
    this.screen = s;
    if (push) {
      const hash = s.kind === 'home' ? '' : s.kind === 'position' ? `#p.${s.id}` : `#t.${s.tech}`;
      try { history.pushState(null, '', hash || location.pathname); } catch { /* sandboxed */ }
    }
    this.cues.hideCue();
    this.cues.hideDots();
    this.caption(null);
    this.root.replaceChildren();
    this.checkEls.clear();
    this.stepEl = null;
    if (s.kind === 'home') this.renderHome();
    else if (s.kind === 'position') this.renderPosition(positionById(s.id));
    else this.renderLesson(positionById(s.pos), TECHNIQUES.find((t) => t.id === s.tech)!, s.mode);
  }

  // ---------------------------------------------------------------- home

  private renderHome() {
    const demo = positionById('mount');
    this.director.explore(demo);
    this.frameCamera(true);
    const done = progress.doneCount();
    const total = TECHNIQUES.length;

    const list = h('ol', { class: 'path' });
    PATH.forEach((id) => {
      const p = POSITIONS.find((x) => x.id === id);
      if (!p) return;
      const techs = techniquesFor(p.id);
      const finished = techs.filter((t) => progress.isDone(t.id)).length;
      list.append(
        h('li', {},
          h('button', { class: 'path-item', onclick: () => this.go({ kind: 'position', id: p.id }) },
            h('span', { class: 'path-glyph', 'aria-hidden': 'true' }, positionGlyph(p.id)),
            h('span', { class: 'path-text' },
              h('span', { class: 'path-name' }, p.name, p.points ? h('span', { class: 'pts' }, `${p.points} pts`) : null),
              h('span', { class: 'path-blurb' }, p.blurb),
            ),
            h('span', { class: 'path-meter', 'aria-label': `${finished} of ${techs.length} techniques done` },
              h('span', { class: 'stripes' }, ...techs.map((t) => h('i', { class: progress.isDone(t.id) ? 'on' : '' }))),
              h('small', {}, `${finished}/${techs.length}`),
            ),
          ),
        ),
      );
    });

    put(this.root, 
      h('header', { class: 'home-head' },
        h('div', { class: 'brand' }, h('span', { class: 'brand-mark', 'aria-hidden': 'true' }), 'Mat Lab'),
        h('span', { class: 'belt-count' }, `${done}/${total} techniques`),
      ),
      h('section', { class: 'sheet home-sheet' },
        h('div', { class: 'grip', 'aria-hidden': 'true' }),
        h('h1', {}, 'Learn jiu-jitsu by moving real bodies.'),
        h('p', { class: 'lede' }, 'Two physics athletes with real weight. Drag a knee, win an underhook, feel why the position works. Start with mount, the way most academies do: survival first.'),
        list,
      ),
    );
  }

  // ---------------------------------------------------------------- position

  private renderPosition(p: Position) {
    this.director.explore(p);
    this.frameCamera(true);
    let role: Who = progress.role();
    this.director.focus = role;

    const techList = h('div', { class: 'tech-list' });
    const checks = h('div', { class: 'checks', role: 'list' });
    const tweaks = h('div', { class: 'tweaks' });
    const concepts = h('ul', { class: 'concepts' });

    const renderRole = () => {
      this.director.focus = role;
      progress.setRole(role);
      checks.replaceChildren();
      this.checkEls.clear();
      for (const c of p.checks.filter((c) => c.who === role)) {
        const el = h('div', { class: 'chip', role: 'listitem', title: c.why }, h('span', { class: 'dot', 'aria-hidden': 'true' }), c.label);
        el.addEventListener('click', () => this.toast(c.why));
        this.checkEls.set(c.id, el);
        checks.append(el);
      }
      tweaks.replaceChildren(...(p.tweaks ?? []).filter((t) => t.who === role).map((t) =>
        h('button', { class: 'btn ghost small', onclick: () => { this.director.tweak(t.key); this.buzz(10); } }, t.label)));
      concepts.replaceChildren(...p.concepts.filter((c) => c.who === role).map((c) => h('li', {}, c.text)));
      techList.replaceChildren(...techniquesFor(p.id).sort((a, b) => (a.role === role ? 0 : 1) - (b.role === role ? 0 : 1)).map((t) => this.techCard(p, t, role)));
      seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.role === role)));
    };

    const seg = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Which athlete you play' },
      h('button', { 'data-role': 'top', onclick: () => { role = 'top'; renderRole(); } }, h('i', { class: 'swatch top' }), p.topName),
      h('button', { 'data-role': 'bottom', onclick: () => { role = 'bottom'; renderRole(); } }, h('i', { class: 'swatch bottom' }), p.bottomName),
    );

    put(this.root, 
      this.topBar(p.name, () => this.go({ kind: 'home' }), p.points ? h('span', { class: 'pts' }, `${p.points} pts`) : null),
      this.gestureHint(),
      this.toolRail(),
      h('section', { class: 'sheet' },
        h('div', { class: 'grip', 'aria-hidden': 'true' }),
        seg,
        h('h2', { class: 'label' }, 'Live checks'),
        checks,
        tweaks,
        h('details', { class: 'more' }, h('summary', {}, 'Key concepts'), concepts),
        h('h2', { class: 'label' }, 'Techniques'),
        techList,
      ),
    );
    renderRole();
  }

  private techCard(p: Position, t: Technique, role: Who) {
    const done = progress.isDone(t.id);
    return h('article', { class: `tech ${t.role === role ? '' : 'other-role'}` },
      h('div', { class: 'tech-head' },
        h('span', { class: `kind k-${t.kind}` }, KIND_LABEL[t.kind]),
        h('span', { class: `as ${t.role}` }, t.role === 'top' ? `as ${COLORS.top.name}` : `as ${COLORS.bottom.name}`),
        done ? h('span', { class: 'done', 'aria-label': 'completed' }, icon('check')) : null,
      ),
      h('h3', {}, t.name),
      h('p', {}, t.summary),
      h('div', { class: 'tech-actions' },
        h('button', { class: 'btn primary', onclick: () => this.go({ kind: 'lesson', pos: p.id, tech: t.id, mode: 'learn' }) }, icon('hand'), 'Learn it'),
        h('button', { class: 'btn ghost', onclick: () => this.go({ kind: 'lesson', pos: p.id, tech: t.id, mode: 'watch' }) }, icon('play'), 'Watch'),
      ),
    );
  }

  // ---------------------------------------------------------------- lesson

  private renderLesson(p: Position, t: Technique, mode: 'learn' | 'watch') {
    const dots = h('div', { class: 'dots', 'aria-hidden': 'true' }, ...t.steps.map(() => h('i')));
    this.stepEl = h('div', { class: 'step' });
    put(this.root, 
      this.topBar(t.name, () => this.go({ kind: 'position', id: p.id }), dots),
      mode === 'learn' ? this.gestureHint() : null,
      this.toolRail(true),
      h('section', { class: 'sheet lesson-sheet' }, h('div', { class: 'grip', 'aria-hidden': 'true' }), this.stepEl),
    );
    this.director.begin(p, t, mode);
    this.frameCamera(true);
  }

  private onStep(i: number, s: Step | null) {
    if (this.screen.kind !== 'lesson' || !this.stepEl) return;
    const t = this.director.technique!;
    const dots = this.root.querySelectorAll('.dots i');
    dots.forEach((d, k) => d.className = k < i ? 'on' : k === i ? 'now' : '');
    if (!s) return;
    const learner = t.role;
    const isYou = !s.auto;
    const actor = s.drag?.who ?? learner;
    const watch = this.director.mode === 'watch';
    swap(this.stepEl, 
      h('div', { class: 'step-meta' },
        h('span', {}, `Step ${i + 1} of ${t.steps.length}`),
        h('span', { class: `who ${s.auto ? (learner === 'top' ? 'bottom' : 'top') : actor}` }, s.auto ? 'Opponent reacts' : watch ? (actor === 'top' ? COLORS.top.name : COLORS.bottom.name) : 'Your move'),
      ),
      h('p', { class: 'say' }, s.say),
      s.why ? h('p', { class: 'why' }, s.why) : null,
      isYou && !watch
        ? h('div', { class: 'step-actions' },
            h('button', { class: 'btn primary', onclick: () => this.director.perform() }, icon('bolt'), s.intent ?? 'Do it'),
            s.drag ? h('span', { class: 'hint' }, 'or drag the ', h('b', { class: 'amber' }, 'glowing ring'), ' onto the ', h('b', { class: 'green' }, 'target')) : null,
          )
        : h('div', { class: 'step-actions' }, h('span', { class: 'hint' }, watch ? 'Watching. Tap a body part any time to interfere.' : 'Watch the reaction…')),
    );
    if (s.auto || watch) this.caption(s.say);
    else this.caption(null);
  }

  private onFinished() {
    if (this.screen.kind !== 'lesson' || !this.stepEl) return;
    const t = this.director.technique!;
    this.caption(null);
    if (this.director.mode === 'watch') {
      swap(this.stepEl, h('p', { class: 'say' }, `${t.name}. Replaying…`), h('div', { class: 'step-actions' },
        h('button', { class: 'btn primary', onclick: () => this.go({ kind: 'lesson', pos: t.from, tech: t.id, mode: 'learn' }) }, icon('hand'), 'Now you try')));
      return;
    }
    progress.markDone(t.id);
    this.buzz([20, 40, 30]);
    const siblings = techniquesFor(t.from);
    const next = siblings[(siblings.indexOf(t) + 1) % siblings.length];
    swap(this.stepEl, 
      h('div', { class: 'step-meta' }, h('span', { class: 'stripe-award' }, h('i'), 'Stripe earned')),
      h('p', { class: 'say' }, `${t.name}: done.`),
      t.mistakes?.length ? h('div', { class: 'mistakes' }, h('h2', { class: 'label' }, 'Watch out for'), h('ul', {}, ...t.mistakes.map((m) => h('li', {}, m)))) : null,
      h('div', { class: 'step-actions' },
        h('button', { class: 'btn primary', onclick: () => this.go({ kind: 'lesson', pos: t.from, tech: t.id, mode: 'learn' }) }, icon('replay'), 'Again'),
        next !== t ? h('button', { class: 'btn ghost', onclick: () => this.go({ kind: 'lesson', pos: next.from, tech: next.id, mode: 'learn' }) }, 'Next: ', next.name) : null,
        h('button', { class: 'btn ghost', onclick: () => this.go({ kind: 'position', id: t.from }) }, 'Free play'),
      ),
    );
  }

  // ---------------------------------------------------------------- shared chrome

  private topBar(title: string, back: () => void, extra?: Node | null) {
    return h('header', { class: 'topbar' },
      h('button', { class: 'icon-btn', 'aria-label': 'Back', onclick: back }, icon('back')),
      h('div', { class: 'title' }, h('span', {}, title), extra ?? null),
    );
  }

  private toolRail(lesson = false) {
    const slow = h('button', { class: 'icon-btn', 'aria-label': 'Slow motion', 'aria-pressed': String(this.slowmo), onclick: () => {
      this.slowmo = !this.slowmo;
      this.sim.timeScale = this.slowmo ? 0.3 : 1;
      slow.setAttribute('aria-pressed', String(this.slowmo));
      this.toast(this.slowmo ? 'Slow motion on' : 'Normal speed');
    } }, icon('slow'));
    return h('div', { class: 'rail' },
      h('button', { class: 'icon-btn', 'aria-label': lesson ? 'Restart this step' : 'Reset position', onclick: () => { this.director.restartStep(); this.toast(lesson ? 'Step restarted' : 'Position reset'); } }, icon('replay')),
      slow,
      h('button', { class: 'icon-btn', 'aria-label': 'Reframe camera', onclick: () => this.frameCamera() }, icon('camera')),
    );
  }

  private gestureHint() {
    if (progress.flag('gestures')) return null;
    return h('div', { class: 'gesture-hint' },
      h('span', { class: 'finger', 'aria-hidden': 'true' }),
      h('span', {}, h('b', {}, 'Drag a body part'), ' to move it. Drag empty space to orbit, pinch to zoom, double-tap to reframe.'),
      h('button', { class: 'icon-btn small', 'aria-label': 'Dismiss', onclick: () => this.hideGestureHint() }, icon('close')),
    );
  }

  private hideGestureHint() {
    progress.setFlag('gestures');
    this.root.querySelector('.gesture-hint')?.remove();
  }

  private onChecks(res: { id: string; ok: boolean }[]) {
    for (const r of res) {
      const el = this.checkEls.get(r.id);
      if (!el) continue;
      if (el.classList.contains('ok') !== r.ok) {
        el.classList.toggle('ok', r.ok);
        if (r.ok) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
      }
    }
  }

  private caption(text: string | null) {
    this.captionEl.hidden = !text;
    if (text) this.captionEl.textContent = text;
  }

  private toastTimer = 0;
  toast(text: string) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 2200);
  }

  private buzz(p: number | number[]) {
    if (!progress.flag('nohaptics')) try { navigator.vibrate?.(p); } catch { /* unsupported */ }
  }

  // ---------------------------------------------------------------- camera

  private center(out = new THREE.Vector3()) {
    return out.copy(this.sim.top.segPos('pelvis')).add(this.sim.bottom.segPos('pelvis')).multiplyScalar(0.5).setY(0.25);
  }

  frameCamera(instant = false) {
    const c = this.center();
    const portrait = this.r.canvas.clientWidth < this.r.canvas.clientHeight;
    const off = portrait ? new THREE.Vector3(2.0, 2.2, 1.5) : new THREE.Vector3(2.1, 1.35, 1.05);
    // In portrait the sheet covers the lower screen, so aim a little low to lift the athletes.
    const target = c.clone().add(new THREE.Vector3(0, portrait ? -0.35 : 0, 0));
    this.r.flyTo(c.clone().add(off), target, instant);
    this.camCenter.copy(c);
  }

  /** Per-frame: camera follow, cues, director tick. */
  frame(dt: number) {
    this.director.update(dt * this.sim.timeScale);
    if (this.follow && this.screen.kind !== 'home') {
      // Gently keep the action centred without fighting the user's orbit.
      const c = this.center();
      const d = c.clone().sub(this.camCenter).multiplyScalar(Math.min(1, dt * 1.5));
      this.camCenter.add(d);
      this.r.camera.position.add(d);
      this.r.controls.target.add(d);
    }
    if (this.screen.kind === 'home') {
      // Slow turntable behind the home sheet.
      const t = this.r.controls.target;
      this.r.camera.position.sub(t).applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.12).add(t);
    }
    const cue = this.director.cue();
    if (cue && this.screen.kind === 'lesson') {
      const from = this.interaction.drag ? handlePos(this.sim, cue.who, cue.part, cue.mode) : cue.from;
      this.cues.showCue(from, cue.to, dt);
    } else this.cues.hideCue();
    if (this.screen.kind === 'position') {
      const who = this.director.focus;
      const pts = (['armL', 'armR', 'legL', 'legR'] as const).flatMap((l) => [handlePos(this.sim, who, l, 'end'), ...(l.startsWith('leg') ? [handlePos(this.sim, who, l, 'mid')] : [])]);
      pts.push(handlePos(this.sim, who, 'hips', 'end'));
      this.cues.showDots(pts, who === 'top' ? 0x7fb0ff : 0xfff3d6);
    }
  }
}

function positionGlyph(id: string): string {
  // Two-letter shorthand, like a whiteboard abbreviation in an academy.
  return ({ mount: 'MT', 'side-control': 'SC', 'closed-guard': 'CG', 'half-guard': 'HG', back: 'BK', 'knee-on-belly': 'KB', 'north-south': 'NS', turtle: 'TT' } as Record<string, string>)[id] ?? id.slice(0, 2).toUpperCase();
}

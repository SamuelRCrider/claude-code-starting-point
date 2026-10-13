type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | boolean | ((e: Event) => void) | undefined>;

/** Tiny hyperscript helper. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v as EventListener);
    else if (k === 'hidden') el.hidden = Boolean(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  if (el instanceof HTMLButtonElement && !attrs.type) el.type = 'button';
  return el;
}

const PATHS: Record<string, string> = {
  back: 'M15 18l-6-6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  play: 'M8 5.5v13l11-6.5z',
  hand: 'M8 13V5.5a1.5 1.5 0 013 0V11m0-1V4.5a1.5 1.5 0 013 0V11m0-.5V6a1.5 1.5 0 013 0v7.5c0 4-2.7 6.5-6.2 6.5-2.6 0-4.1-1.2-5.6-3.4L4.4 13.4a1.5 1.5 0 012.4-1.8L8 13',
  bolt: 'M13 3L5 13.5h6L10 21l8-10.5h-6z',
  replay: 'M4 12a8 8 0 108-8 8.2 8.2 0 00-6 2.7M4 4v3.5h3.5',
  slow: 'M12 7v5l3 2M12 21a9 9 0 110-18 9 9 0 010 18z',
  camera: 'M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10H4zM12 16a3 3 0 100-6 3 3 0 000 6z',
};

export function icon(name: keyof typeof PATHS | string): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'ico');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', PATHS[name] ?? '');
  p.setAttribute('fill', name === 'play' || name === 'bolt' ? 'currentColor' : 'none');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '1.8');
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  svg.append(p);
  return svg;
}

/** append / replaceChildren that skip null and false children. */
export const put = (el: Element, ...c: Child[]) => el.append(...(c.filter((x) => x !== null && x !== undefined && x !== false) as (Node | string)[]));
export const swap = (el: Element, ...c: Child[]) => el.replaceChildren(...(c.filter((x) => x !== null && x !== undefined && x !== false) as (Node | string)[]));

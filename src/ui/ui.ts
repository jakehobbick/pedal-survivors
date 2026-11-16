/**
 * Minimal DOM screen manager with controller-friendly navigation:
 * every .btn / .card / .upg / [data-nav] in the top screen is reachable with the
 * steering buttons (spatial nearest), Confirm clicks, Pause triggers [data-back].
 */
import { input } from '../core/input';
import { Action } from '../core/settings';

const root = () => document.getElementById('ui')!;
const stack: HTMLElement[] = [];
let sel: HTMLElement | null = null;

export function h(html: string): HTMLElement {
  const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild as HTMLElement;
}
export function openScreen(html: string, cls = 'dim', replace = true): HTMLElement {
  if (replace) closeAll(); else if (stack.length) stack[stack.length - 1].classList.add('under');
  const el = document.createElement('div');
  el.className = 'screen ' + cls; el.innerHTML = html;
  root().appendChild(el); stack.push(el);
  sel = null; input.menu = menuHandler;
  return el;
}
export function closeTop() {
  const el = stack.pop(); if (el) el.remove(); sel = null; if (stack.length) stack[stack.length - 1].classList.remove('under');
  if (!stack.length) input.menu = null;
}
export function closeAll() { while (stack.length) stack.pop()!.remove(); sel = null; input.menu = null; }
export function hasScreen() { return stack.length > 0; }
export function topScreen() { return stack[stack.length - 1] || null; }

function navs(): HTMLElement[] {
  const top = topScreen(); if (!top) return [];
  return Array.from(top.querySelectorAll<HTMLElement>('.btn:not(:disabled), .card:not(.nonav), .upg, [data-nav], .seg button'))
    .filter((e) => e.offsetParent !== null);
}
function mark(e: HTMLElement | null) {
  if (sel) sel.classList.remove('navsel');
  sel = e; if (sel) { sel.classList.add('navsel'); sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}
export function select(e: HTMLElement | null) { mark(e); }
function move(dx: number, dy: number) {
  const L = navs(); if (!L.length) return;
  if (!sel || !L.includes(sel)) { mark(L.find((e) => e.dataset.default != null) || L[0]); return; }
  const r = sel.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let best: HTMLElement | null = null, bs = 1e9;
  for (const e of L) {
    if (e === sel) continue;
    const q = e.getBoundingClientRect(); const ex = q.left + q.width / 2, ey = q.top + q.height / 2;
    const vx = ex - cx, vy = ey - cy; const along = vx * dx + vy * dy; if (along <= 4) continue;
    const perp = Math.abs(vx * dy - vy * dx); const s = along + perp * 2.2;
    if (s < bs) { bs = s; best = e; }
  }
  if (!best) { // wrap around in reading order
    const i = L.indexOf(sel); best = L[(i + (dx + dy > 0 ? 1 : -1) + L.length) % L.length];
  }
  mark(best);
}
function menuHandler(a: Action): boolean {
  if (!stack.length) return false;
  const top = topScreen()!;
  if (top.dataset.passthrough) return false;
  switch (a) {
    case 'up': move(0, -1); return true;
    case 'down': move(0, 1); return true;
    case 'left': move(-1, 0); return true;
    case 'right': move(1, 0); return true;
    case 'confirm': case 'dash': {
      const L = navs();
      const target = sel && L.includes(sel) ? sel : (L.find((e) => e.dataset.default != null) || null);
      if (target) target.click(); else move(1, 0);
      return true;
    }
    case 'pause': case 'ult': {
      const b = top.querySelector<HTMLElement>('[data-back]'); if (b) b.click(); return true;
    }
    case 'shiftUp': case 'shiftDown': return false;
  }
  return false;
}

let toastN = 0;
export function toast(msg: string, cls = '', ms = 2600) {
  const t = document.getElementById('toast')!;
  const d = document.createElement('div'); d.className = cls; d.innerHTML = msg; t.appendChild(d);
  if (t.children.length > 4) t.firstElementChild?.remove();
  const id = ++toastN; void id;
  setTimeout(() => d.remove(), ms);
}
export function esc(s: string) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!)); }
export function on(el: HTMLElement, sel2: string, ev: string, fn: (e: Event, t: HTMLElement) => void) {
  el.querySelectorAll<HTMLElement>(sel2).forEach((t) => t.addEventListener(ev, (e) => fn(e, t)));
}

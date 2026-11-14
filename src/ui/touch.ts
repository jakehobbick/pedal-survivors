/**
 * Touch / mouse fallback controls: floating joystick on the left half,
 * dash / ultimate / gear buttons on the right, pause top-right.
 */
import { input } from '../core/input';
import { settings } from '../core/settings';
import { trainer } from '../trainer/control';

let root: HTMLElement; let stick: HTMLElement; let knob: HTMLElement;
const btn: Record<string, HTMLElement> = {};
export const touchActions = { dash: () => {}, ult: () => {}, shift: (_d: number) => {}, pause: () => {} };

export function initTouch() {
  root = document.getElementById('touch')!;
  root.innerHTML = `
    <div class="zone" id="tz"></div><div class="stick" id="ts"><i></i></div>
    <div class="tb" id="tb-pause" style="right:calc(14px + var(--safe-r));top:calc(150px + var(--safe-t));width:56px;height:56px;font-size:22px">⏸</div>
    <div class="tb" id="tb-dash">💨<small>DASH</small></div>
    <div class="tb" id="tb-ult">✨<small>ULT</small></div>
    <div class="tb" id="tb-up" style="width:62px;height:62px;font-size:24px">▲<small>GEAR</small></div>
    <div class="tb" id="tb-down" style="width:62px;height:62px;font-size:24px">▼</div>`;
  stick = root.querySelector('#ts')!; knob = stick.querySelector('i')!;
  for (const id of ['tb-pause', 'tb-dash', 'tb-ult', 'tb-up', 'tb-down']) btn[id] = root.querySelector('#' + id)!;
  layout();
  const zone = root.querySelector<HTMLElement>('#tz')!;
  let pid = -1, ox = 0, oy = 0;
  zone.addEventListener('pointerdown', (e) => {
    if (pid !== -1) return; pid = e.pointerId; zone.setPointerCapture(pid);
    ox = e.clientX; oy = e.clientY; stick.style.display = 'block'; stick.style.left = ox + 'px'; stick.style.top = oy + 'px';
    knob.style.transform = ''; input.joy.active = true; input.joy.x = 0; input.joy.y = 0;
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid) return;
    let dx = e.clientX - ox, dy = e.clientY - oy; const l = Math.hypot(dx, dy); const R = 55;
    if (l > R) { dx = dx / l * R; dy = dy / l * R; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    if (l > 10) { input.joy.x = dx / R; input.joy.y = dy / R; input.lastSteer = performance.now(); }
  });
  const end = (e: PointerEvent) => { if (e.pointerId !== pid) return; pid = -1; stick.style.display = 'none'; input.joy.active = false; input.joy.x = input.joy.y = 0; };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  const tap = (id: string, fn: () => void) => btn[id].addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
  tap('tb-dash', () => touchActions.dash()); tap('tb-ult', () => touchActions.ult());
  tap('tb-up', () => touchActions.shift(1)); tap('tb-down', () => touchActions.shift(-1)); tap('tb-pause', () => touchActions.pause());
  addEventListener('resize', layout);
}
function layout() {
  const right = settings.hand === 'right';
  const side = right ? 'right' : 'left'; const other = right ? 'left' : 'right';
  const place = (id: string, x: number, y: number) => { const b = btn[id]; b.style[side] = `calc(${x}px + var(--safe-${side[0]}))`; b.style[other] = ''; b.style.bottom = `calc(${y}px + var(--safe-b))`; };
  place('tb-dash', 130, 40); place('tb-ult', 34, 110); place('tb-up', 30, 300); place('tb-down', 30, 220);
  const z = root.querySelector<HTMLElement>('#tz')!; z.style[right ? 'left' : 'right'] = '0'; z.style[right ? 'right' : 'left'] = '';
}
let shown = false;
export function showTouch(on: boolean) {
  const coarse = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  shown = on; root.classList.toggle('hidden', !on);
  root.querySelector<HTMLElement>('#tz')!.style.display = coarse ? '' : 'none';
  for (const id of ['tb-dash', 'tb-ult', 'tb-up', 'tb-down']) btn[id].style.display = coarse ? '' : 'none';
}
export function updateTouch(dashReady: boolean, ultReady: boolean) {
  if (!shown) return;
  btn['tb-dash'].classList.toggle('ready', dashReady); btn['tb-ult'].classList.toggle('ready', ultReady);
  const g = trainer.mode === 'gear'; btn['tb-up'].style.visibility = g ? '' : 'hidden'; btn['tb-down'].style.visibility = g ? '' : 'hidden';
}

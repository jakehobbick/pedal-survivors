import { settings, Action } from './settings';

const ACTIONS: Action[] = ['up', 'down', 'left', 'right', 'dash', 'ult', 'shiftUp', 'shiftDown', 'confirm', 'pause'];
export const input = {
  held: { up: false, down: false, left: false, right: false, dash: false, ult: false, shiftUp: false, shiftDown: false, confirm: false, pause: false } as Record<Action, boolean>,
  presses: { up: 0, down: 0, left: 0, right: 0, dash: 0, ult: 0, shiftUp: 0, shiftDown: 0, confirm: 0, pause: 0 } as Record<Action, number>,
  /** time of last key-down per action (ms) — used to detect "tap only" controllers */
  downAt: { up: 0, down: 0, left: 0, right: 0, dash: 0, ult: 0, shiftUp: 0, shiftDown: 0, confirm: 0, pause: 0 } as Record<Action, number>,
  joy: { active: false, x: 0, y: 0 },
  lastSteer: 0,
  /** when set, receives the next key (for rebinding) */
  capture: null as null | ((key: string) => void),
  /** UI menus get first refusal on discrete actions */
  menu: null as null | ((a: Action) => boolean),
  /** extra raw key hook (sim + debug keys) */
  raw: null as null | ((e: KeyboardEvent, down: boolean) => boolean),
};
export function consume(a: Action) { const n = input.presses[a]; input.presses[a] = 0; return n > 0; }
export function clearPresses() { for (const a of ACTIONS) input.presses[a] = 0; }

function actionsFor(key: string): Action[] {
  const k = key.length === 1 ? key.toLowerCase() : key;
  const out: Action[] = [];
  for (const a of ACTIONS) {
    const b = settings.keys[a];
    for (const x of b) if (x && (x.length === 1 ? x.toLowerCase() : x) === k) { out.push(a); break; }
  }
  return out;
}
function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') && (t as HTMLInputElement).type !== 'range';
}
export function initInput() {
  addEventListener('keydown', (e) => {
    if (input.capture) { e.preventDefault(); const c = input.capture; input.capture = null; c(e.key); return; }
    if (isTyping(e)) return;
    const acts = actionsFor(e.key);
    if (!acts.length) { if (input.raw && input.raw(e, true)) e.preventDefault(); return; }
    e.preventDefault();
    for (const a of acts) {
      if (!e.repeat) {
        input.downAt[a] = performance.now();
        if (input.menu && input.menu(a)) continue;
        input.presses[a]++;
      }
      input.held[a] = true;
      if (a === 'up' || a === 'down' || a === 'left' || a === 'right') input.lastSteer = performance.now();
    }
  });
  addEventListener('keyup', (e) => {
    if (input.raw) input.raw(e, false);
    for (const a of actionsFor(e.key)) input.held[a] = false;
  });
  addEventListener('blur', () => { for (const a of ACTIONS) input.held[a] = false; });
}

/* ---------- Gamepad API (standard mapping) — some controller bridges present as gamepads ---------- */
const PAD_MAP: [number, Action][] = [[12, 'up'], [13, 'down'], [14, 'left'], [15, 'right'], [0, 'confirm'], [1, 'dash'], [2, 'ult'], [3, 'ult'], [4, 'shiftDown'], [5, 'shiftUp'], [6, 'shiftDown'], [7, 'shiftUp'], [9, 'pause'], [8, 'pause']];
const padPrev = new Uint8Array(32);
let padStick = false;
export function pollGamepads() {
  const pads = (navigator.getGamepads ? navigator.getGamepads() : []) as (Gamepad | null)[];
  for (const gp of pads) {
    if (!gp || !gp.connected) continue;
    for (const [bi, a] of PAD_MAP) {
      const b = gp.buttons[bi]; if (!b) continue;
      const down = b.pressed ? 1 : 0;
      if (down && !padPrev[bi]) {
        input.downAt[a] = performance.now();
        if (!(input.menu && input.menu(a))) input.presses[a]++;
        if (a === 'up' || a === 'down' || a === 'left' || a === 'right') input.lastSteer = performance.now();
      }
      if (down !== padPrev[bi]) input.held[a] = !!down;
      padPrev[bi] = down;
    }
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    if (Math.hypot(ax, ay) > 0.35) { input.joy.active = true; input.joy.x = ax; input.joy.y = ay; padStick = true; input.lastSteer = performance.now(); }
    else if (padStick) { input.joy.active = false; input.joy.x = input.joy.y = 0; padStick = false; }
    break;
  }
}

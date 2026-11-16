/** Debug overlay: FPS, frame time, entity/pool counts. Toggle with ` (backquote) or Settings. */
import { settings } from '../core/settings';
export const dbg = { work: 0,
  fps: 0, ms: 0, worst: 0, frames: 0, acc: 0, worstAcc: 0,
  counts: {} as Record<string, number>,
  timeScale: 1,
  extra: '',
};
let el: HTMLElement | null = null;
let last = 0;
export function dbgFrame(dtReal: number, workMs: number) {
  dbg.frames++; dbg.acc += dtReal; dbg.worstAcc = Math.max(dbg.worstAcc, workMs);
  dbg.ms = dbg.ms * 0.95 + workMs * 0.05; dbg.work = workMs;
  if (dbg.acc >= 0.5) { dbg.fps = dbg.frames / dbg.acc; dbg.worst = dbg.worstAcc; dbg.frames = 0; dbg.acc = 0; dbg.worstAcc = 0; }
  const now = performance.now();
  if (!settings.debug) { if (el && !el.classList.contains('hidden')) el.classList.add('hidden'); return; }
  if (now - last < 250) return; last = now;
  el = el || document.getElementById('debug');
  if (!el) return;
  el.classList.remove('hidden');
  const c = Object.entries(dbg.counts).map(([k, v]) => `${k.padEnd(10)} ${v}`).join('\n');
  el.textContent = `FPS        ${dbg.fps.toFixed(0)}\nwork ms    ${dbg.ms.toFixed(2)} (worst ${dbg.worst.toFixed(1)})\nscale      x${dbg.timeScale}\n${c}${dbg.extra ? '\n' + dbg.extra : ''}`;
}

/** On-screen simulated-trainer controls (visible when no trainer is paired). */
import { sim } from '../trainer/sim';
import { sensors } from '../trainer/sensors';
import { trainer } from '../trainer/control';
import { FTP } from '../core/settings';
import { input } from '../core/input';
import { dbg } from './debug';

let el: HTMLElement;
export function initSimPanel() {
  el = document.getElementById('sim')!;
  el.innerHTML = `
    <button class="btn sm cyan always" id="simBot" title="Scripted rider that follows the workout">🤖 Bot</button>
    <label>Watts <input type="range" id="simW" min="0" max="900" step="5"> <span class="v" id="simWv"></span></label>
    <label>Cadence <input type="range" id="simC" min="0" max="140" step="1"> <span class="v" id="simCv"></span></label>
    <button class="btn sm gold" id="simSpr">⚡ Sprint</button>
    <button class="btn sm sec always" id="simMin" title="Hide sim controls">–</button>`;
  const w = el.querySelector<HTMLInputElement>('#simW')!, c = el.querySelector<HTMLInputElement>('#simC')!;
  w.value = String(sim.watts); c.value = String(sim.cad);
  w.oninput = () => { sim.watts = +w.value; sim.bot = false; };
  c.oninput = () => { sim.cad = +c.value; sim.bot = false; };
  const bot = el.querySelector<HTMLButtonElement>('#simBot')!;
  bot.onclick = () => { sim.bot = !sim.bot; };
  const spr = el.querySelector<HTMLButtonElement>('#simSpr')!;
  const on = (e: Event) => { e.preventDefault(); sim.sprint = true; }, off = () => { sim.sprint = false; };
  spr.addEventListener('pointerdown', on); spr.addEventListener('pointerup', off); spr.addEventListener('pointerleave', off); spr.addEventListener('pointercancel', off);
  el.querySelector<HTMLButtonElement>('#simMin')!.onclick = () => { el.classList.toggle('min'); };
  // keyboard sim controls: + / - watts, < > cadence, X hold sprint, B bot, ` debug, 1-5 time scale (debug)
  input.raw = (e, down) => {
    if (e.key === 'x' || e.key === 'X') { sim.sprint = down; return true; }
    if (!down) return false;
    const st = e.shiftKey ? 50 : 10;
    if (e.key === '=' || e.key === '+') { sim.watts = Math.min(1500, sim.watts + st); sim.bot = false; return true; }
    if (e.key === '-' || e.key === '_') { sim.watts = Math.max(0, sim.watts - st); sim.bot = false; return true; }
    if (e.key === '.' || e.key === '>') { sim.cad = Math.min(160, sim.cad + 5); return true; }
    if (e.key === ',' || e.key === '<') { sim.cad = Math.max(0, sim.cad - 5); return true; }
    if (e.key === 'b' || e.key === 'B') { sim.bot = !sim.bot; return true; }
    if (e.key === '`' || e.key === '~') { (window as any).__ps?.toggleDebug(); return true; }
    if (dbgKeys && /^[1-6]$/.test(e.key) && e.altKey) { dbg.timeScale = [1, 1, 2, 4, 8, 16, 0.25][+e.key]; return true; }
    return false;
  };
}
const dbgKeys = true;
let lastUpd = 0;
export function updateSimPanel(visible: boolean) {
  el.classList.toggle('hidden', !visible || sensors.src !== 'sim');
  const now = performance.now(); if (now - lastUpd < 120) return; lastUpd = now;
  if (!visible) return;
  const w = el.querySelector<HTMLInputElement>('#simW')!, c = el.querySelector<HTMLInputElement>('#simC')!;
  if (document.activeElement !== w) w.value = String(Math.round(trainer.mode === 'erg' ? sensors.power : sim.watts));
  if (document.activeElement !== c) c.value = String(Math.round(sensors.cadence));
  el.querySelector('#simWv')!.textContent = `${Math.round(sensors.power)}W`;
  el.querySelector('#simCv')!.textContent = `${Math.round(sensors.cadence)}`;
  const bot = el.querySelector('#simBot')!; bot.classList.toggle('gold', sim.bot); bot.classList.toggle('cyan', !sim.bot);
  bot.textContent = sim.bot ? '🤖 Bot ON' : '🤖 Bot';
  void FTP;
}

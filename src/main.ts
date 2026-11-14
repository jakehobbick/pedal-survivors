import './styles.css';
import { initInput, input } from './core/input';
import { settings, saveSettings, FTP } from './core/settings';
import { clamp } from './core/math';
import { sensors, updateSensors } from './trainer/sensors';
import { simTick, sim } from './trainer/sim';
import { trainer, setErg } from './trainer/control';
import { initSimPanel, updateSimPanel } from './ui/simpanel';
import { dbg, dbgFrame } from './ui/debug';
import { openScreen, closeAll } from './ui/ui';
import { buildArenaArt, drawGround } from './art/arena';
import { buildRiderSheet } from './art/rider';
import { CHARACTERS } from './data/characters';

const cv = document.getElementById('cv') as HTMLCanvasElement;
const ctx = cv.getContext('2d', { alpha: false })!;
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
}
addEventListener('resize', resize); resize();
initInput(); initSimPanel();

const arena = buildArenaArt('sakura');
const sheet = buildRiderSheet(CHARACTERS[0].look);
const P = { x: 0, y: 0, hx: 1, hy: 0, anim: 0, face: 1 };
let playing = false;

function title() {
  const el = openScreen(`
    <div class="logo">PEDAL<br>SURVIVORS</div>
    <div class="tag">A smart-trainer horde survival game · milestone 1 preview</div>
    <div class="panel mid col">
      <p class="note">Scaffold build: ride around with the simulated trainer (watts slider, or press <kbd>B</kbd> for the bot). Steer with <kbd>WASD</kbd>/arrows. Toggle the debug overlay with <kbd>\`</kbd>.</p>
      <div class="row"><button class="btn" data-default id="go">Ride (simulated trainer)</button></div>
    </div>`);
  el.querySelector<HTMLButtonElement>('#go')!.onclick = () => { closeAll(); playing = true; setErg(0.6); };
}
title();

(window as any).__ps = { toggleDebug: () => { settings.debug = !settings.debug; saveSettings(); }, sensors, sim, trainer, dbg };

let last = performance.now();
function frame(now: number) {
  const t0 = performance.now();
  const dtReal = Math.min(0.05, (now - last) / 1000); last = now;
  const dt = dtReal * dbg.timeScale;
  simTick(dtReal); updateSensors(dtReal);
  if (playing) {
    let dx = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0), dy = (input.held.down ? 1 : 0) - (input.held.up ? 1 : 0);
    if (dx || dy) { const l = Math.hypot(dx, dy); P.hx = dx / l; P.hy = dy / l; }
    const pct = sensors.p3 / FTP();
    const sp = 230 * (0.35 + 0.65 * clamp(pct, 0, 1) + 0.5 * clamp(pct - 1, 0, 0.8));
    P.x += P.hx * sp * dt; P.y += P.hy * sp * dt;
    if (Math.abs(P.hx) > 0.2) P.face = P.hx > 0 ? 1 : -1;
    P.anim += dt * (sensors.cadSm / 60) * 8;
  }
  // draw
  const zoom = Math.min(W, H) / 720;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#0b0716'; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(DPR * zoom, 0, 0, DPR * zoom, DPR * (W / 2 - P.x * zoom), DPR * (H / 2 - P.y * zoom));
  drawGround(ctx, arena, P.x, P.y, W / zoom + 4, H / zoom + 4);
  const f = sensors.cadSm > 5 ? sheet.run[Math.floor(P.anim) % 8] : sheet.idle[Math.floor(now / 300) % 4];
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(P.x, P.y, 30, 7, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(P.x, P.y); ctx.scale(P.face, 1); ctx.drawImage(f.c, -f.ax, -f.ay, f.w, f.h); ctx.restore();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (playing) {
    ctx.fillStyle = 'rgba(12,6,26,.75)'; ctx.fillRect(10, 10, 220, 74);
    ctx.fillStyle = '#fff'; ctx.font = '700 34px Rajdhani, sans-serif'; ctx.fillText(`${Math.round(sensors.p3)} W`, 20, 46);
    ctx.font = '700 18px Rajdhani, sans-serif'; ctx.fillStyle = '#b7a6d6';
    ctx.fillText(`${Math.round(sensors.p3 / FTP() * 100)}% FTP · ${Math.round(sensors.cadSm)} rpm · ${sensors.hr || '--'} bpm`, 20, 72);
  }
  updateSimPanel(playing);
  dbg.counts = { enemies: 0, projectiles: 0 };
  dbgFrame(dtReal, performance.now() - t0);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

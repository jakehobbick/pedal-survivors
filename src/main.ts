import { save } from './core/save';
import '@fontsource/bungee/latin-400.css';
import '@fontsource/rajdhani/latin-600.css';
import '@fontsource/rajdhani/latin-700.css';
import '@fontsource/m-plus-rounded-1c/latin-500.css';
import '@fontsource/m-plus-rounded-1c/latin-700.css';
import '@fontsource/m-plus-rounded-1c/latin-800.css';
import './styles.css';
import { initInput, pollGamepads } from './core/input';
import { settings, saveSettings } from './core/settings';
import { updateSensors, sensors } from './trainer/sensors';
import { simTick, sim } from './trainer/sim';
import { trainer, trainerTick } from './trainer/control';
import { initSimPanel, updateSimPanel } from './ui/simpanel';
import { dbg, dbgFrame } from './ui/debug';
import { showGallery } from './ui/gallery';
import { closeAll } from './ui/ui';
import { initHud } from './ui/hud';
import { initTouch } from './ui/touch';
import { openTitle } from './ui/screens';
import { game, updateGame, startRun } from './game/game';
import { renderWorld, ensureArenaArt } from './game/render';
import { particleCount } from './game/fx';
import { buildFxArt } from './art/fxart';
import './ui/runscreens';
import { initAudio } from './audio/sfx';
import { initBle } from './trainer/ble';
import { ARENA_BY_ID } from './data/arenas';

const cv = document.getElementById('cv') as HTMLCanvasElement;
const ctx = cv.getContext('2d', { alpha: false })!;
let W = 0, H = 0, DPR = 1, autoScale = Math.min(window.devicePixelRatio || 1, 2);
function targetDPR() { return settings.renderScale > 0 ? Math.min(settings.renderScale, Math.max(1, window.devicePixelRatio || 1)) : autoScale; }
function resize() {
  DPR = targetDPR(); W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
}
addEventListener('resize', resize); resize();
initInput(); initSimPanel(); initHud(); initTouch(); initBle();
buildFxArt();
addEventListener('pointerdown', () => initAudio(), { once: true });
addEventListener('keydown', () => initAudio(), { once: true });
game.world.reset(ARENA_BY_ID.sakura);

(window as any).__ps = {
  toggleDebug: () => { settings.debug = !settings.debug; saveSettings(); },
  sensors, sim, trainer, dbg, game, startRun, settings, closeAll,
  /** debug: set the loadout to exactly these weapons/passives */
  loadout(ws: [string, number][], ps: [string, number][] = []) {
    const P = game.world.player; P.weapons = []; P.passives = [];
    for (const [id, lv] of ws) { const w = P.addWeapon(id); w.lv = lv; w.recompute(); }
    for (const [id, lv] of ps) P.passives.push({ id, lv });
    P.recompute();
  },
  chest(rank = 1) { game.world.pendingChests.push(rank); },
  get save() { return save; },
};

if (location.search.includes('gallery')) { setTimeout(() => showGallery(ctx, W, H, DPR), 200); }
else {
  openTitle();
  ensureArenaArt('sakura');
  requestAnimationFrame(frame);
}

let menuX = 0;
let last = performance.now();
let slowT = 0, fastT = 0;
function frame(now: number) {
  const t0 = performance.now();
  const dtReal = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  const dt = dtReal * dbg.timeScale;
  const running = game.state === 'run';
  pollGamepads();
  trainerTick();
  if (running) {
    // fixed-ish sub-steps keep physics stable under the debug time-scale
    const n = Math.max(1, Math.ceil(dt / 0.034)); const h = dt / n;
    for (let i = 0; i < n && game.state === 'run'; i++) { simTick(game.paused ? dtReal / n : h); updateSensors(h); updateGame(h); }
    if (game.state === 'run') renderWorld(ctx, game.world, W, H, DPR, now);
  } else {
    simTick(dtReal); updateSensors(dtReal);
    menuX += dtReal * 40;
    renderBackdrop();
  }
  updateSimPanel(running);
  dbg.counts.particles = particleCount();
  const work = performance.now() - t0;
  dbgFrame(dtReal, work);
  // adaptive resolution (Auto): drop when frames run long, recover when there is headroom
  if (settings.renderScale === 0 && running) {
    if (dtReal > 1 / 50) { slowT += dtReal; fastT = 0; } else if (dtReal < 1 / 58) { fastT += dtReal; slowT = Math.max(0, slowT - dtReal * 0.5); }
    const max = Math.min(window.devicePixelRatio || 1, 2);
    if (slowT > 2.5 && autoScale > 1) { autoScale = Math.max(1, +(autoScale - 0.25).toFixed(2)); slowT = 0; resize(); }
    else if (fastT > 12 && autoScale < max) { autoScale = Math.min(max, +(autoScale + 0.25).toFixed(2)); fastT = 0; resize(); }
  }
  if (Math.abs(DPR - targetDPR()) > 0.01) resize();
  dbg.extra = `dpr        ${DPR.toFixed(2)}\nsrc        ${sensors.src}${sim.bot ? ' (bot)' : ''}\ntrainer    ${trainer.mode} ${trainer.mode === 'erg' ? Math.round(trainer.ergFrac * settings.ftp) + 'W' : 'g' + trainer.gear}`;
  requestAnimationFrame(frame);
}
function renderBackdrop() {
  const id = game.opts?.arena || 'sakura';
  const zoom = Math.min(W, H) / 900;
  const cx = menuX, cy = Math.sin(menuX / 600) * 200;
  ctx.setTransform(DPR * zoom, 0, 0, DPR * zoom, DPR * (W / 2 - cx * zoom), DPR * (H / 2 - cy * zoom));
  const art = ensureArenaArt(id);
  const T = art.tileSize; const vw = W / zoom, vh = H / zoom;
  const x0 = Math.floor((cx - vw / 2) / T) * T, y0 = Math.floor((cy - vh / 2) / T) * T;
  for (let y = y0; y < cy + vh / 2; y += T) for (let x = x0; x < cx + vw / 2; x += T) ctx.drawImage(art.tile, x, y, T + 0.5, T + 0.5);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = 'rgba(8,3,18,.5)'; ctx.fillRect(0, 0, W, H);
}

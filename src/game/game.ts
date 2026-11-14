/**
 * Run controller: glues the workout, the world, the trainer and the UI together.
 */
import { World } from './world';
import { Director } from './director';
import { WorkoutRuntime } from './workout';
import { Step, TEMPLATE_BY_ID } from '../data/workouts';
import { CHAR_BY_ID, CharacterDef } from '../data/characters';
import { ARENA_BY_ID } from '../data/arenas';
import { BOSSES } from '../data/enemies';
import { buildRiderSheet, RiderSheet } from '../art/rider';
import { input, consume, clearPresses } from '../core/input';
import { settings, FTP } from '../core/settings';
import { rng, clamp } from '../core/math';
import { save } from '../core/save';
import { metaStats } from '../data/meta';
import { sensors, recorder, resetSensorAvg } from '../trainer/sensors';
import { sim, BotTarget } from '../trainer/sim';
import { trainer, setErg, setGearMode, gearFor, shift } from '../trainer/control';
import { banner, updateHud, showHud } from '../ui/hud';
import { showTouch, updateTouch, touchActions } from '../ui/touch';
import { burst, ring, shake, flash, screen } from './fx';
import { ZK, Enemy } from './entities';
import { sfx, initAudio } from '../audio/sfx';
import { music } from '../audio/music';
import { ultFx } from './weapons';
import { dbg } from '../ui/debug';
import { hasScreen } from '../ui/ui';
import { achEvent } from '../meta/achievements';
import type { RunUI } from '../ui/runscreens';

export interface RunOpts { char: string; arena: string; tpl: string; min: number; stress?: boolean }
export const game = {
  state: 'menu' as 'menu' | 'run' | 'post',
  paused: false,
  world: new World(),
  director: null as unknown as Director,
  wk: null as WorkoutRuntime | null,
  opts: null as RunOpts | null,
  char: null as CharacterDef | null,
  sheets: new Map<string, RiderSheet>(),
  banned: new Set<string>(),
  menuOpen: false,
  ui: null as unknown as RunUI,
  boss: { phase: 'none' as 'none' | 'intro' | 'sprint' | 'fight' | 'recover' | 'dead' | 'fled', t: 0, sprintT: 0, attempts: 0, best: 0, peakW: 0, key: '' },
  miniIdx: 0,
  stress: false,
  startedAt: 0,
  ergLast: 0,
  btPaused: false,
};
game.director = new Director(game.world);

export function sheetFor(id: string) {
  let s = game.sheets.get(id); if (!s) { s = buildRiderSheet(CHAR_BY_ID[id].look); game.sheets.set(id, s); } return s;
}

export function startRun(o: RunOpts) {
  initAudio();
  const W = game.world, D = game.director;
  const arena = ARENA_BY_ID[o.arena] || ARENA_BY_ID.sakura; const c = CHAR_BY_ID[o.char] || CHAR_BY_ID.kai;
  game.opts = o; game.char = c; game.banned = new Set(); game.miniIdx = 0; game.stress = !!o.stress;
  W.reset(arena); D.reset(); D.enabled = true; D.spawnScale = 1;
  const m = metaStats(save.upgrades);
  W.player.init(c, sheetFor(c.id), m.stats, m.extra);
  W.player.dashMax *= 1 - m.extra.dashcd;
  W.ev = {
    levelUp: () => {}, chest: () => {},
    banner: (t, s, ms) => banner(t, s, ms),
    enemyKilled: (e) => onKill(e),
    playerDown: () => { banner('KNOCKED DOWN', 'Second wind in a few seconds…', 2200); achEvent('fall'); },
    bossSpawned: () => {}, bossKilled: () => {},
  };
  const tpl = TEMPLATE_BY_ID[o.tpl] || TEMPLATE_BY_ID.sweetspot;
  const wk = new WorkoutRuntime(tpl, o.min); game.wk = wk;
  wk.surgeMult = (c.style === 'tt' ? 1.5 : 1) * (settings.intervalMode === 'gears' ? 1.25 : 1);
  wk.stepStarted = (s, i) => onStep(s, i);
  game.boss = { phase: 'none', t: 0, sprintT: 0, attempts: 0, best: 0, peakW: 0, key: arena.boss };
  sim.getTarget = botTarget;
  recorder.reset(); recorder.start = Date.now();
  game.startedAt = Date.now();
  game.state = 'run'; game.paused = false; game.menuOpen = false;
  resetSensorAvg();
  if (game.stress) { wk.steps = [{ kind: 'free', dur: 3600, lo: 0, hi: 0, label: 'STRESS TEST', wave: 'normal', mode: 'gear' }]; wk.total = 3600; D.enabled = false; W.player.invuln = 1e9; }
  wk.start();
  showHud(true); showTouch(true);
  music.start(arena.music);
  achEvent('runStart', { char: c.id, arena: arena.id, tpl: tpl.id });
  try { (navigator as any).wakeLock?.request('screen').catch(() => {}); } catch { /* ignore */ }
}

function botTarget(): BotTarget | null {
  const wk = game.wk; if (!wk || game.state !== 'run') return { lo: 0.6, hi: 0.7, sprint: false };
  if (game.boss.phase === 'sprint') return { lo: 1.6, hi: 2, sprint: true };
  const s = wk.step;
  if (s.kind === 'sprint') return { lo: 1.6, hi: 2, sprint: true };
  if (s.kind === 'free') return { lo: 0, hi: 0, sprint: false, free: true };
  if (s.kind === 'boss') return { lo: 0.72, hi: 0.82, sprint: false };
  const b = wk.targetBand(); if (!b) return { lo: 0.6, hi: 0.7, sprint: false };
  return { lo: b[0], hi: Math.min(b[1], b[0] + 0.1), sprint: false };
}

/** trainer target follows the step */
function applyTrainer(s: Step) {
  if (!game.wk) return;
  if (s.kind === 'boss') return; // boss logic drives the trainer
  const band = game.wk.targetBand();
  const gearsForIntervals = settings.intervalMode === 'gears' && s.kind !== 'recovery' && s.kind !== 'warmup' && s.kind !== 'cooldown';
  if (s.mode === 'gear' || !band || gearsForIntervals) {
    const mid = band ? (band[1] >= 9 ? band[0] * 1.1 : (band[0] + band[1]) / 2) : 0.75;
    setGearMode(gearFor(s.kind === 'sprint' ? 1.0 : mid));
  } else setErg((band[0] + band[1]) / 2);
}

function onStep(s: Step, i: number) {
  const D = game.director, W = game.world, wk = game.wk!;
  D.kind = s.wave; D.intensity = wk.targetMid();
  if (s.banner && i >= 0) banner(s.banner, s.sub || '', s.kind === 'interval' ? 3600 : 2600);
  if (s.kind === 'interval' || s.kind === 'sprint') sfx.warn();
  applyTrainer(s);
  music.setIntensity(s.kind === 'interval' || s.kind === 'sprint' ? 2 : s.kind === 'boss' ? 3 : s.kind === 'recovery' || s.kind === 'cooldown' || s.kind === 'warmup' ? 0 : 1);
  if (s.mini && game.opts && !game.stress) spawnMini();
  if (s.shop) setTimeout(() => { if (game.state === 'run') game.ui.openShop(); }, 1200);
  if (s.kind === 'recovery' && !s.shop) dropChestNear(1);
  if (s.chest) { dropChestNear(1); }
  if (s.kind === 'boss') { game.boss.phase = 'intro'; game.boss.t = 0; wk.holdBoss = true; setGearMode(gearFor(1.0)); D.kind = 'boss'; }
  if (s.kind === 'cooldown' && game.boss.phase !== 'dead' && game.boss.phase !== 'fled' && game.boss.phase !== 'none') bossFlee();
  achEvent('step', { kind: s.kind });
  void W;
}
function dropChestNear(rank: number) {
  const P = game.world.player; const a = rng.next() * Math.PI * 2;
  game.world.pickup(5, P.x + Math.cos(a) * 160, P.y + Math.sin(a) * 120, rank);
}
function spawnMini() {
  const W = game.world; const ids = W.arena.minis; const id = ids[game.miniIdx % ids.length]; game.miniIdx++;
  const P = W.player; const a = Math.atan2(P.hy, P.hx);
  const e = W.spawnEnemy(id, P.x + Math.cos(a) * 520, P.y + Math.sin(a) * 420, 2);
  if (!e) return;
  e.maxHp = e.hp = e.def.hp * (1 + W.t / 60 * 0.12) * W.arena.hpMult; e.rank = 2;
  banner(`⚠ ${BOSSES[id].name.toUpperCase()}`, 'A mini-boss joins the race', 2600); sfx.roar(); shake(8);
}
function spawnBoss() {
  const W = game.world; const P = W.player; const id = W.arena.boss; const a = Math.atan2(P.hy, P.hx);
  const e = W.spawnEnemy(id, P.x + Math.cos(a) * 380, P.y + Math.sin(a) * 300, 3);
  if (!e) return null;
  // HP scales with the build you brought
  const dps = W.player.weapons.reduce((acc, w) => acc + w.dmgDone, 0) / Math.max(60, W.t);
  e.maxHp = e.hp = Math.max(e.def.hp * W.arena.hpMult * (game.opts!.min / 30), dps * 75);
  e.rank = 3; e.shield = 1; W.boss = e;
  sfx.roar(); shake(14); flash('#ff4d5e', 0.4);
  return e;
}
function bossFlee() {
  const W = game.world; const b = W.boss;
  if (b && !b.dead) { burst(b.x, b.y - 40, 40, '#ffffff', 400, 18); b.dead = true; W.boss = null; }
  game.boss.phase = 'fled'; game.wk!.holdBoss = false;
  banner('THE BOSS ESCAPED', 'It fled into the mist. Next time!', 3000);
}
function onKill(e: Enemy) {
  achEvent('kill', { id: e.def.id, rank: e.rank });
  if (e.rank === 2) { game.world.stats.minis++; banner('MINI-BOSS DOWN!', 'Grab the chest', 2000); }
  if (e.rank === 3) {
    game.world.stats.bosses++; game.boss.phase = 'dead'; game.wk!.holdBoss = false;
    banner('BOSS DEFEATED!', 'Victory lap — scoop the loot', 3500);
    flash('#ffd166', 0.7); shake(16); ring(e.x, e.y, 60, '#ffd166', 700, 18); sfx.evolve();
    for (let i = 0; i < 25; i++) game.world.pickup(1, e.x + (rng.next() - 0.5) * 120, e.y + (rng.next() - 0.5) * 80, 5);
    game.director.kind = 'calm'; setErg(0.6);
    achEvent('bossKill', { id: e.def.id });
    // jump straight to the victory lap; the cooldown absorbs the remaining boss time
    const wk = game.wk!; const rest = Math.max(0, wk.step.dur - wk.stepT);
    const next = wk.steps[wk.idx + 1]; if (next) next.dur += rest; wk.skip();
  }
}

/** boss sequence: intro countdown → sprint to break the shield → fight (→ retry sprint) */
function updateBossSeq(dt: number) {
  const B = game.boss; const W = game.world; const ftp = FTP();
  B.t += dt;
  if (B.phase === 'intro') {
    const left = 8 - B.t;
    if (Math.ceil(left) !== Math.ceil(left + dt) && left > 0 && left <= 5) { sfx.count(false); banner(`SPRINT IN ${Math.ceil(left)}`, 'Shift up a few gears now ⬆', 900); }
    if (left <= 0) {
      const e = spawnBoss(); if (!e) return;
      B.phase = 'sprint'; B.t = 0; B.sprintT = 0; B.attempts++; B.peakW = 0;
      sfx.count(true); banner(`${BOSSES[e.def.id].name.toUpperCase()}`, 'SPRINT! ≥150% FTP to break the shield', 2600);
      achEvent('sprintStart');
    }
  } else if (B.phase === 'sprint') {
    const b = W.boss; if (!b) { B.phase = 'dead'; return; }
    B.sprintT += dt;
    const pct = sensors.pFast / ftp; B.peakW = Math.max(B.peakW, sensors.pFast);
    // ~20 s at 150% FTP, ~12.5 s at 200%+, nothing below 120%
    const rate = clamp((pct - 1.2) / 0.3, 0, 1.6) / 20;
    if (rate > 0) { b.shield = Math.max(0, b.shield - rate * dt); if (Math.random() < 0.3) burst(b.x, b.y - b.r, 3, '#9ff0ff', 240, 10); sfx.shieldHit(); }
    if (b.shield <= 0) {
      B.phase = 'fight'; B.t = 0; B.best = B.sprintT;
      sfx.shieldBreak(); flash('#9ff0ff', 0.8); shake(16); ring(b.x, b.y - b.r, 64, '#9ff0ff', 900, 20); b.stunT = 3;
      banner('SHIELD BROKEN!', 'Now finish it — hold steady tempo', 2600);
      setErg(0.78); music.setIntensity(3);
      achEvent('shieldBreak', { secs: B.sprintT, peak: B.peakW });
    } else if (B.sprintT >= 30) {
      B.phase = 'recover'; B.t = 0; b.shield = Math.max(b.shield, 0.55);
      banner('THE SHIELD HOLDS', 'Recover 40 s, then sprint again', 2600);
      setErg(0.55);
    }
  } else if (B.phase === 'recover') {
    if (B.t > 40) { B.phase = 'intro'; B.t = 3; setGearMode(gearFor(1.0)); banner('SECOND ATTEMPT', 'Shift up — sprint incoming', 2000); B.attempts++; game.boss.phase = 'intro'; }
  }
  // spawn the boss here if intro already used once and boss exists (second attempt): handled by spawnBoss guard
  if (B.phase === 'intro' && W.boss && B.t >= 8) { B.phase = 'sprint'; B.t = 0; B.sprintT = 0; banner('SPRINT!', '≥150% FTP to break the shield', 2000); sfx.count(true); }
}

function useDash() {
  const P = game.world.player; if (P.dashCd > 0 || P.downT > 0 || game.menuOpen) return;
  P.dashT = 0.3; P.dashCd = P.dashMax; P.invuln = Math.max(P.invuln, 0.35); game.world.stats.dashes++;
  sfx.dash(); screen.zoomPunch = 0.6; achEvent('dash');
}
function useUlt() {
  const W = game.world; const P = W.player; if (P.ultCharge < 1 || P.downT > 0 || game.menuOpen) return;
  P.ultCharge = 0; W.stats.ults++; sfx.ult(); flash('#ffffff', 0.5);
  const dmg = (60 + P.level * 6) * P.stats.might;
  switch (P.char.ult) {
    case 'leadout': { ultFx(W, '#fff3a0'); let n = 0; for (let i = 0; i < W.enemies.n && n < 60; i++) { const e = W.enemies.items[i]; if (e.dead || Math.abs(e.x - W.camX) > W.viewW * 0.55 || Math.abs(e.y - W.camY) > W.viewH * 0.55) continue; const z = W.zone(ZK.BOLT, e.x, e.y - e.r * 0.5, 30, 0.35, 0, false); if (z) { z.vx = e.x + (rng.next() - 0.5) * 80; z.vy = e.y - 500; } W.damage(e, dmg * 1.4, e.x, e.y - 30, 60, -1); n++; } break; }
    case 'summit': { ultFx(W, '#c9b6ff'); const z = W.zone(ZK.SHOCK, P.x, P.y, 20, 0.8, 0, false); if (z) z.grow = 700; const n = W.query(P.x, P.y, 520, W.qres2); for (let k = 0; k < n; k++) { const e = W.enemies.items[W.qres2[k]]; W.damage(e, dmg * 1.6, P.x, P.y, 400, -1); e.stunT = 2.5; } shake(18); break; }
    case 'tempo': { ultFx(W, '#4cc9f0'); W.slowMo = 0.3; P.rateMult = 2; P.ultT = 6; break; }
    case 'peloton': { ultFx(W, '#9b5de5'); P.ultT = 6.5; break; }
    case 'bottles': { ultFx(W, '#5ef38c'); P.ultT = 3; break; }
  }
  achEvent('ult');
}
let ultTick = 0;
function ultUpdate(dt: number) {
  const W = game.world; const P = W.player;
  if (P.ultT <= 0) { if (W.slowMo !== 1 || P.rateMult !== 1) { W.slowMo = 1; P.rateMult = 1; } return; }
  ultTick -= dt;
  if (P.char.ult === 'peloton' && ultTick <= 0) {
    ultTick = 0.25; const n = W.query(P.x, P.y - 20, 210, W.qres2);
    for (let k = 0; k < n; k++) W.damage(W.enemies.items[W.qres2[k]], (14 + P.level * 1.5) * P.stats.might, P.x, P.y, 90, -1);
  }
  if (P.char.ult === 'bottles' && ultTick <= 0) {
    ultTick = 0.2; const e = W.randomOnScreen(); const tx = e ? e.x : P.x + (rng.next() - 0.5) * 400, ty = e ? e.y : P.y + (rng.next() - 0.5) * 300;
    W.explode(tx, ty, 80, (40 + P.level * 4) * P.stats.might, false, -1, '#5ef38c', 120); W.healPlayer(2);
  }
}

let pausedTrainer: { mode: 'erg' | 'gear'; erg: number } | null = null;
/** after a pause, put the resistance back where the workout wants it */
export function resumeTrainer() {
  const wk = game.wk; if (!wk || game.state !== 'run') return;
  const ph = game.boss.phase;
  if (ph === 'intro' || ph === 'sprint') setGearMode();
  else if (ph === 'fight') setErg(0.78);
  else if (ph === 'recover') setErg(0.55);
  else if (pausedTrainer && wk.step.kind === 'boss') { if (pausedTrainer.mode === 'erg') setErg(pausedTrainer.erg); else setGearMode(); }
  else applyTrainer(wk.step);
  pausedTrainer = null;
}
export function togglePause(on?: boolean) {
  if (game.state !== 'run') return;
  const v = on ?? !game.paused; if (v === game.paused) return;
  game.paused = v;
  if (v) { pausedTrainer = { mode: trainer.mode, erg: trainer.ergFrac }; setErg(0.45); game.ui.openPause(); music.duck(true); }
  else { music.duck(false); resumeTrainer(); }
}

/** per-frame update; dt is real seconds (already scaled by debug time scale) */
export function updateGame(dt: number) {
  if (game.state !== 'run') return;
  const W = game.world, wk = game.wk!, P = W.player;
  if (game.paused) { if (!hasScreen() && !game.btPaused) { game.paused = false; music.duck(false); resumeTrainer(); } updateHud(W, wk); return; }
  // input
  if (consume('pause')) { togglePause(true); return; }
  if (consume('dash')) useDash();
  if (consume('ult')) useUlt();
  if (consume('shiftUp')) { if (trainer.mode === 'gear' && shift(1)) sfx.shift(true); }
  if (consume('shiftDown')) { if (trainer.mode === 'gear' && shift(-1)) sfx.shift(false); }
  consume('confirm');
  // workout clock (real time)
  wk.update(dt);
  if (wk.done) { endRun(); return; }
  const s = wk.step;
  // ERG ramps (warmup/cooldown) follow the target continuously
  if (trainer.mode === 'erg' && s.kind !== 'boss') { const b = wk.targetBand(); if (b && b[1] < 9) { const mid = (b[0] + b[1]) / 2; if (Math.abs(mid - trainer.ergFrac) * FTP() >= 3) setErg(mid); } }
  // director intensity / pressure
  const D = game.director;
  D.intensity = s.kind === 'boss' ? 0.8 : wk.targetMid(); D.progress = wk.progress();
  if (wk.belowT > 6 && D.pressure < 2.2) { D.pressure = Math.min(2.2, D.pressure + 0.18); wk.belowT = 0; const b = wk.targetBand(); if (b) banner('THE HORDE SMELLS WEAKNESS', `Get back to ${Math.round(b[0] * FTP())} W — the wave is getting harder`, 2200); sfx.warn(); achEvent('missed'); }
  if (wk.inBand || !wk.targetBand()) D.pressure = Math.max(1, D.pressure - dt * 0.03);
  // surge → overdrive
  if (wk.surge >= 1 && wk.overdriveT <= 0) {
    wk.overdriveT = 8; W.stats.overdrives++; banner('OVERDRIVE!', '+100% damage · Surge maxed', 1800); sfx.surge(); flash('#ffd166', 0.4);
    W.explode(P.x, P.y - 20, 300, (50 + P.level * 5) * P.stats.might, false, -1, '#ffd166', 260); achEvent('overdrive');
  }
  if (wk.inBand) W.stats.surgeTime += dt;
  P.updateDyn(wk.surge, wk.inBand);
  if (wk.overdriveT > 0) P.dyn.dmg *= 2;
  // boss
  if (s.kind === 'boss' || game.boss.phase === 'sprint' || game.boss.phase === 'fight' || game.boss.phase === 'recover') updateBossSeq(dt);
  // level ups & chests open menus; world runs in slow motion while a menu is up
  if (!game.menuOpen && !hasScreen()) {
    if (W.pendingChests.length) { game.menuOpen = true; game.ui.openChest(W.pendingChests.shift()!); }
    else if (W.pendingLevels > 0) { game.menuOpen = true; W.pendingLevels--; game.ui.openLevelUp(); }
  }
  const wdt = (game.menuOpen ? 0.06 : 1) * dt;
  W.invulnMenu = game.menuOpen;
  P.steer(wdt, autopilot);
  ultUpdate(wdt);
  W.update(wdt, D);
  if (game.stress) stressFill();
  // ride recording (1 Hz)
  const tgtW = trainer.mode === 'erg' ? trainer.ergFrac * FTP() : 0;
  recorder.tick(dt, tgtW);
  updateHud(W, wk);
  updateTouch(P.dashCd <= 0, P.ultCharge >= 1);
  music.update(dt, wk.inBand, wk.overdriveT > 0);
  dbg.counts = { enemies: W.enemies.n, projectiles: W.projs.n, zones: W.zones.n, pickups: W.pickups.n, particles: (dbg.counts.particles || 0) };
}
touchActions.dash = () => useDash();
touchActions.ult = () => useUlt();
touchActions.shift = (d) => { if (trainer.mode === 'gear' && shift(d)) sfx.shift(d > 0); };
touchActions.pause = () => togglePause(true);

/** autopilot: steer away from crowds, toward gems/chests */
function autopilot(o: { x: number; y: number }) {
  const W = game.world, P = W.player; let ax = 0, ay = 0;
  const n = W.query(P.x, P.y, 260, W.qres2);
  for (let k = 0; k < n; k++) { const e = W.enemies.items[W.qres2[k]]; const dx = P.x - e.x, dy = P.y - e.y; const d2 = dx * dx + dy * dy + 100; ax += dx / d2 * 900 * (e.rank ? 3 : 1); ay += dy / d2 * 900 * (e.rank ? 3 : 1); }
  let best = 1e12, bx = 0, by = 0;
  for (let i = 0; i < W.pickups.n; i += 3) { const p = W.pickups.items[i]; if (p.dead) continue; const dx = p.x - P.x, dy = p.y - P.y; const d2 = dx * dx + dy * dy; const w = p.kind === 5 ? d2 * 0.1 : d2; if (w < best && d2 < 600 * 600) { best = w; bx = dx; by = dy; } }
  if (best < 1e12) { const l = Math.hypot(bx, by) || 1; ax += bx / l * 1.2; ay += by / l * 1.2; }
  else { ax += P.hx * 0.6; ay += P.hy * 0.6; }
  // gentle pull back toward origin so you don't drift forever
  ax -= P.x * 0.00015; ay -= P.y * 0.00015;
  o.x = ax; o.y = ay; return true;
}
function stressFill() {
  const W = game.world; const P = W.player;
  while (W.enemies.n < 400) { const a = rng.next() * 6.28, r = 200 + rng.next() * 500; const ids = ['goblin', 'gnat', 'slime', 'boar', 'wisp', 'knight', 'golem', 'phantom']; const e = W.spawnEnemy(ids[W.enemies.n % ids.length], P.x + Math.cos(a) * r, P.y + Math.sin(a) * r); if (!e) break; e.hp = e.maxHp = 1e9; }
  let hostile = 0; for (let i = 0; i < W.projs.n; i++) if (W.projs.items[i].hostile) hostile++;
  while (W.projs.n < 200 + hostile) { const a = rng.next() * 6.28; const p = W.proj(1, 'dart', P.x, P.y - 26, Math.cos(a) * 500, Math.sin(a) * 500, 6, 1, 1.2, false, -1); if (!p) break; p.pierce = 9999; }
}

export function endRun(quit = false) {
  if (game.state !== 'run') return;
  game.state = 'post'; game.paused = false; game.menuOpen = false;
  showHud(false); showTouch(false); music.stop();
  setErg(0.5);
  game.ui.openPostRun(quit);
}
export function abandonToMenu() { game.state = 'menu'; showHud(false); showTouch(false); music.stop(); }
void input; void clearPresses;

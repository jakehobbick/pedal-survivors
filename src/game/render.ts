/** Draws the world: ground, decor, y-sorted actors, projectiles, zones, fx and screen overlays. */
import type { World } from './world';
import { PK, ZK, PU, Enemy } from './entities';
import { buildArenaArt, drawGround, decorAt, DECOR_CELL, ArenaArt } from '../art/arena';
import { fxFrames, tintedGlow } from '../art/fxart';
import { drawParticles, drawNumbers, screen, particle, frameId } from './fx';
import { dronePositions } from './weapons';
import { rng } from '../core/math';
import { drawBoss } from '../art/bosses';
import { sensors } from '../trainer/sensors';

let art: ArenaArt | null = null; let artId = '';
const FX = () => fxFrames();
const MAXS = 1200;
const keyY = new Float32Array(MAXS), refs = new Int32Array(MAXS), order = new Int32Array(MAXS);
const BUCKETS = 96; const bcount = new Int32Array(BUCKETS + 1);
const dronePos = new Float32Array(32);
let vgW = 0, vgH = 0; let vgDark: CanvasGradient | null = null, vgHurt: CanvasGradient | null = null;
const props: { k: number; x: number; y: number }[] = [];
for (let i = 0; i < 64; i++) props.push({ k: 0, x: 0, y: 0 });

export function ensureArenaArt(id: string) { if (artId !== id) { art = buildArenaArt(id); artId = id; } return art!; }

export function renderWorld(g: CanvasRenderingContext2D, w: World, W: number, H: number, DPR: number, now: number) {
  const A = ensureArenaArt(w.arena.id);
  const P = w.player;
  const zoom = Math.min(W, H) / 760 * (1 + screen.zoomPunch * 0.04);
  const vw = W / zoom, vh = H / zoom; w.viewW = vw; w.viewH = vh;
  // camera with look-ahead
  const lx = P.x + P.hx * 70, ly = P.y - 20 + P.hy * 55;
  w.camX += (lx - w.camX) * 0.12; w.camY += (ly - w.camY) * 0.12;
  const cx = w.camX + screen.shX, cy = w.camY + screen.shY;
  g.setTransform(DPR * zoom, 0, 0, DPR * zoom, DPR * (W / 2 - cx * zoom), DPR * (H / 2 - cy * zoom));
  const x0 = cx - vw / 2 - 80, x1 = cx + vw / 2 + 80, y0 = cy - vh / 2 - 120, y1 = cy + vh / 2 + 120;
  drawGround(g, A, cx, cy, vw + 8, vh + 8);
  const F = FX();

  /* zones under actors */
  for (let i = 0; i < w.zones.n; i++) { const z = w.zones.items[i]; if (z.dead) continue; drawZoneUnder(g, z, now); }

  /* pickups */
  for (let i = 0; i < w.pickups.n; i++) {
    const p = w.pickups.items[i]; if (p.dead || p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    let f; let s = 1;
    switch (p.kind) {
      case PU.GEM: f = p.v >= 40 ? F.gem3 : p.v >= 10 ? F.gem2 : p.v >= 3 ? F.gem1 : F.gem0; break;
      case PU.GOLD: f = F.coin; break; case PU.HEAL: f = F.heal; break; case PU.MAGNET: f = F.magnet; break; case PU.BOMB: f = F.bomb; break;
      default: f = F.chest; s = 1.5;
    }
    const bob = Math.sin(now * 0.005 + i) * 2;
    if (p.kind === PU.CHEST) {
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + 0.2 * Math.sin(now * 0.006);
      g.drawImage(tintedGlow('#ffd166'), p.x - 50, p.y - 90, 100, 120); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    g.drawImage(f.c, p.x - f.w * s / 2, p.y - f.h * s / 2 + bob, f.w * s, f.h * s);
  }

  /* collect sortable actors: enemies, player, props */
  let n = 0;
  for (let i = 0; i < w.enemies.n && n < MAXS - 70; i++) { const e = w.enemies.items[i]; if (e.dead || e.x < x0 || e.x > x1 || e.y < y0 || e.y > y1 + 60) continue; keyY[n] = e.y; refs[n] = i; n++; }
  keyY[n] = P.y; refs[n] = -1; n++;
  let pc = 0;
  const c0x = Math.floor((x0 - 150) / DECOR_CELL), c1x = Math.floor((x1 + 150) / DECOR_CELL), c0y = Math.floor((y0 - 100) / DECOR_CELL), c1y = Math.floor((y1 + 250) / DECOR_CELL);
  for (let gy = c0y; gy <= c1y; gy++) for (let gx = c0x; gx <= c1x; gx++) {
    const d = decorAt(gx, gy); if (!d || pc >= props.length) continue;
    props[pc].k = d.kind; props[pc].x = d.x; props[pc].y = d.y; keyY[n] = d.y; refs[n] = -2 - pc; n++; pc++;
  }
  // bucket sort by y
  bcount.fill(0); const span = (y1 + 120 - y0) / BUCKETS;
  for (let i = 0; i < n; i++) { const b = Math.max(0, Math.min(BUCKETS - 1, ((keyY[i] - y0) / span) | 0)); bcount[b + 1]++; }
  for (let b = 0; b < BUCKETS; b++) bcount[b + 1] += bcount[b];
  for (let i = 0; i < n; i++) { const b = Math.max(0, Math.min(BUCKETS - 1, ((keyY[i] - y0) / span) | 0)); order[bcount[b]++] = i; }

  /* shadows first (one pass, cheap) */
  const sh = F.shadow.c;
  for (let k = 0; k < n; k++) {
    const r = refs[order[k]];
    if (r >= 0) { const e = w.enemies.items[r]; const s = e.rank >= 2 ? e.r * 2.6 : e.r * 2.4; g.globalAlpha = e.phase > 0.5 ? 0.25 : 0.9; g.drawImage(sh, e.x - s / 2, e.y - s * 0.16, s, s * 0.32); }
    else if (r === -1) { g.globalAlpha = 1; g.drawImage(sh, P.x - 34, P.y - 9, 68, 20); }
  }
  g.globalAlpha = 1;
  for (let k = 0; k < n; k++) {
    const r = refs[order[k]];
    if (r >= 0) drawEnemy(g, w.enemies.items[r], now);
    else if (r === -1) drawPlayer(g, w, now);
    else { const p = props[-2 - r]; const im = A.props[p.k]; const s = A.propScale[p.k]; g.drawImage(im, p.x - im.width * s / 2, p.y - im.height * s + 10 * s, im.width * s, im.height * s); }
  }

  /* drones */
  for (const wi of P.weapons) {
    if (wi.def.behavior !== 'orbit') continue;
    const m = dronePositions(w, wi, dronePos); const f = F.drone; const sc = wi.def.evolved ? 1.3 : 1.05;
    for (let i = 0; i < m; i++) g.drawImage(f.c, dronePos[i * 2] - f.w * sc / 2, dronePos[i * 2 + 1] - f.h * sc / 2 + Math.sin(now * 0.01 + i) * 2, f.w * sc, f.h * sc);
  }

  /* projectiles */
  for (let i = 0; i < w.projs.n; i++) {
    const p = w.projs.items[i]; if (p.dead || !p.frame || p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    const f = p.frame; const s = p.scale;
    if (p.kind === PK.BOTTLE) {
      const u = Math.min(1, p.t / p.arc); const hgt = Math.sin(u * Math.PI) * 90;
      g.globalAlpha = 0.5; g.drawImage(sh, p.x - 10, p.y - 3, 20, 7); g.globalAlpha = 1;
      g.save(); g.translate(p.x, p.y - hgt); g.rotate(p.rot); g.drawImage(f.c, -f.w * s / 2, -f.h * s / 2, f.w * s, f.h * s); g.restore();
      continue;
    }
    if (p.hostile) { g.globalCompositeOperation = 'lighter'; g.drawImage(f.c, p.x - f.w * 0.75, p.y - f.h * 0.75, f.w * 1.5, f.h * 1.5); g.globalCompositeOperation = 'source-over'; continue; }
    g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.drawImage(f.c, -f.w * s / 2, -f.h * s / 2, f.w * s, f.h * s); g.restore();
  }

  /* zones above actors (beams, slashes, bolts, blasts) */
  for (let i = 0; i < w.zones.n; i++) { const z = w.zones.items[i]; if (z.dead) continue; drawZoneOver(g, z, now, w); }

  drawParticles(g, x0, y0, x1, y1);
  drawNumbers(g);

  /* ambient particles */
  if (rng.next() < 0.35) {
    const ax = cx + (rng.next() - 0.5) * vw, ay = cy - vh / 2 - 20 + rng.next() * vh * 0.3;
    if (A.particle === 'petal') particle(2, frameId('petal'), ax, ay, -30 + rng.next() * 20, 30 + rng.next() * 30, 6, 9 + rng.next() * 5, 0.1);
    else if (A.particle === 'ember') particle(0, frameId('ember'), ax, cy + vh / 2 * rng.next(), (rng.next() - 0.5) * 20, -40 - rng.next() * 40, 3, 6, 0.1);
    else particle(1, frameId('spark'), ax, ay, -60, 520, 1.2, 10, 0);
  }

  /* screen-space overlays */
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  // fog / tint
  g.fillStyle = A.fog; g.fillRect(0, 0, W, H);
  // vignette
  if (vgW !== W || vgH !== H || !vgDark) {
    vgW = W; vgH = H;
    vgDark = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); vgDark.addColorStop(0, 'rgba(0,0,0,0)'); vgDark.addColorStop(1, 'rgba(8,0,20,0.55)');
    vgHurt = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7); vgHurt.addColorStop(0, 'rgba(255,0,40,0)'); vgHurt.addColorStop(1, 'rgba(255,0,40,1)');
  }
  g.fillStyle = vgDark; g.fillRect(0, 0, W, H);
  if (screen.vignetteHurt > 0 || P.hp < P.maxHp * 0.25) {
    const a = Math.max(screen.vignetteHurt * 0.6, P.hp < P.maxHp * 0.25 ? 0.25 + 0.15 * Math.sin(now * 0.008) : 0);
    g.globalAlpha = Math.min(1, a); g.fillStyle = vgHurt!; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  }
  if (screen.flash > 0) { g.globalAlpha = screen.flash; g.fillStyle = screen.flashCol; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  // offscreen indicators for chests, elites, bosses
  indicators(g, w, W, H, zoom, cx, cy, now);
  void sensors;
}

function drawEnemy(g: CanvasRenderingContext2D, e: Enemy, now: number) {
  if (e.rank >= 2) { drawBoss(g, e, now); return; }
  const S = e.spr; const b = e.def.behavior;
  let f = S.run[Math.floor(e.anim) & 3];
  if ((b === 'charger' && e.st >= 1) || (b === 'ranged' && e.st === 1) || (b === 'exploder' && e.st === 1) || (b === 'healer' && e.st === 1) || (b === 'shielded' && e.flash > 0)) f = S.pose[Math.floor(now / 90) & 1] || f;
  let sc = e.r / e.def.r;
  if (e.spawnT > 0) sc *= 1 - e.spawnT / 0.35 * 0.8;
  const fy = S.fly ? S.fly + Math.sin(e.t * 5 + e.uid) * 3 : 0;
  let alpha = 1; if (b === 'phaser') alpha = 1 - e.phase * 0.78;
  if (e.rank === 1) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55 + 0.2 * Math.sin(now * 0.008 + e.uid); const gs = e.r * 4.2; g.drawImage(tintedGlow('#ffd166'), e.x - gs / 2, e.y - e.r - gs / 2, gs, gs); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; }
  if (b === 'exploder' && e.st === 1 && (Math.floor(now / 70) & 1)) sc *= 1.12;
  const flip = (b === 'shielded' ? (e.sx >= 0 ? 1 : -1) : e.face);
  g.globalAlpha = alpha;
  const w = f.w * sc, h = f.h * sc;
  if (flip < 0) { g.save(); g.translate(e.x, 0); g.scale(-1, 1); g.drawImage(f.c, -f.ax * sc, e.y - f.ay * sc - fy, w, h); if (e.flash > 0 && f.white) { g.globalAlpha = Math.min(1, e.flash * 9) * alpha; g.drawImage(f.white, -f.ax * sc, e.y - f.ay * sc - fy, w, h); } g.restore(); }
  else { g.drawImage(f.c, e.x - f.ax * sc, e.y - f.ay * sc - fy, w, h); if (e.flash > 0 && f.white) { g.globalAlpha = Math.min(1, e.flash * 9) * alpha; g.drawImage(f.white, e.x - f.ax * sc, e.y - f.ay * sc - fy, w, h); } }
  g.globalAlpha = 1;
  if (e.burnT > 0 && (Math.floor(now / 60 + e.uid) & 1)) { const fl = fxFrames().flame; g.globalCompositeOperation = 'lighter'; g.drawImage(fl.c, e.x - 10, e.y - e.r * 2.2, 20, 24); g.globalCompositeOperation = 'source-over'; }
  if (e.stunT > 0) { g.fillStyle = '#ffd166'; for (let k = 0; k < 3; k++) { const a = now * 0.006 + k * 2.1; g.beginPath(); g.arc(e.x + Math.cos(a) * e.r * 0.8, e.y - e.r * 2.2 + Math.sin(a) * 4, 2.4, 0, 7); g.fill(); } }
  if (e.rank === 1) hpBar(g, e.x, e.y - e.r * 2.6 - fy, e.r * 2.4, e.hp / e.maxHp, '#ffd166');
  if (b === 'charger' && e.st === 1) { g.strokeStyle = 'rgba(255,60,60,.5)'; g.lineWidth = e.r * 1.4; g.beginPath(); g.moveTo(e.x, e.y - e.r * 0.5); g.lineTo(e.x + e.sx * 300, e.y - e.r * 0.5 + e.sy * 300); g.stroke(); }
}
export function hpBar(g: CanvasRenderingContext2D, x: number, y: number, w: number, f: number, col: string) {
  g.fillStyle = 'rgba(10,4,20,.8)'; g.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
  g.fillStyle = col; g.fillRect(x - w / 2, y, w * Math.max(0, f), 4);
}

function drawPlayer(g: CanvasRenderingContext2D, w: World, now: number) {
  const P = w.player; const S = P.sheet;
  if (P.downT > 0) {
    const f = S.hit[0];
    g.save(); g.translate(P.x, P.y - 8); g.rotate(P.face * 1.35); g.globalAlpha = 0.85; g.drawImage(f.c, -f.ax, -f.ay + 20, f.w, f.h); g.restore(); g.globalAlpha = 1;
    // revive ring
    const k = 1 - P.downT / 4.5;
    g.strokeStyle = '#5ef38c'; g.lineWidth = 5; g.beginPath(); g.arc(P.x, P.y - 40, 26, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.stroke();
    return;
  }
  if (P.invuln > 0 && P.hitT <= 0 && (Math.floor(now / 80) & 1)) g.globalAlpha = 0.55;
  let f;
  if (P.hitT > 0) f = S.hit[Math.floor(now / 100) & 1];
  else if (sensors.cadSm < 15 && P.lastPct < 0.05) f = S.idle[Math.floor(now / 260) & 3];
  else f = S.run[Math.floor(P.anim) & 7];
  // dash afterimages
  if (P.dashT > 0) {
    g.globalCompositeOperation = 'lighter';
    for (let k = 1; k <= 3; k++) { g.globalAlpha = 0.25 / k; const ox = -P.hx * 22 * k, oy = -P.hy * 22 * k; drawFrame(g, f.white || f.c, f, P.x + ox, P.y + oy, P.face); }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }
  drawFrame(g, f.c, f, P.x, P.y, P.face);
  if (P.hitT > 0 && f.white) { g.globalAlpha = P.hitT * 2.5; drawFrame(g, f.white, f, P.x, P.y, P.face); }
  g.globalAlpha = 1;
  // hp bar under rider
  hpBar(g, P.x, P.y + 8, 52, P.hp / P.maxHp, P.hp < P.maxHp * 0.3 ? '#ff4d5e' : '#5ef38c');
}
function drawFrame(g: CanvasRenderingContext2D, im: HTMLCanvasElement, f: { w: number; h: number; ax: number; ay: number }, x: number, y: number, face: number) {
  if (face < 0) { g.save(); g.translate(x, y); g.scale(-1, 1); g.drawImage(im, -f.ax, -f.ay, f.w, f.h); g.restore(); }
  else g.drawImage(im, x - f.ax, y - f.ay, f.w, f.h);
}

function drawZoneUnder(g: CanvasRenderingContext2D, z: import('./entities').Zone, now: number) {
  const a = Math.min(1, z.life / 0.3, (z.max - z.life) / 0.12 + 0.2);
  switch (z.kind) {
    case ZK.PUDDLE: {
      g.globalAlpha = a * 0.75;
      const gr = g.createRadialGradient(z.x, z.y, 2, z.x, z.y, z.r);
      gr.addColorStop(0, 'rgba(180,255,210,.75)'); gr.addColorStop(0.7, z.special ? 'rgba(40,200,255,.55)' : 'rgba(60,230,130,.5)'); gr.addColorStop(1, 'rgba(60,230,130,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(z.x, z.y, Math.max(0.1, z.r), Math.max(0.1, z.r * 0.62), 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(220,255,240,.5)'; g.lineWidth = 1.5; const rr = Math.abs(now * 0.04 + z.x) % Math.max(1, z.r) + 0.1; g.beginPath(); g.ellipse(z.x, z.y, Math.max(0.1, rr), Math.max(0.1, rr * 0.62), 0, 0, 7); g.stroke();
      g.globalAlpha = 1; break;
    }
    case ZK.FIRE: {
      const fl = fxFrames().flame; const s = z.r * 2 * (0.7 + 0.3 * Math.sin(now * 0.02 + z.x));
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.85;
      g.drawImage(fl.c, z.x - s / 2, z.y - s * 1.1, s, s * 1.2);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; break;
    }
    case ZK.TELEGRAPH: {
      const k = Math.max(0.01, Math.min(1, 1 - Math.max(0, z.delay) / (z.max || 1)));
      g.fillStyle = 'rgba(255,40,60,.16)'; g.beginPath(); g.ellipse(z.x, z.y, Math.max(0.1, z.r), Math.max(0.1, z.r * 0.7), 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,40,60,.35)'; g.beginPath(); g.ellipse(z.x, z.y, Math.max(0.1, z.r * k), Math.max(0.1, z.r * 0.7 * k), 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,90,90,.9)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(z.x, z.y, Math.max(0.1, z.r), Math.max(0.1, z.r * 0.7), 0, 0, 7); g.stroke();
      break;
    }
    case ZK.HAZARD_PATCH: {
      g.globalAlpha = a * 0.8;
      const gr = g.createRadialGradient(z.x, z.y, 2, z.x, z.y, z.r);
      gr.addColorStop(0, z.col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(z.x, z.y, Math.max(0.1, z.r), Math.max(0.1, z.r * 0.65), 0, 0, 7); g.fill(); g.globalAlpha = 1; break;
    }
    case ZK.LASER_LINE: {
      const k = z.delay > 0 ? 1 - z.delay / z.max : 1;
      g.save(); g.translate(z.x, z.y); g.rotate(z.a);
      if (z.delay > 0) { g.fillStyle = `rgba(255,47,208,${0.15 + 0.2 * k})`; g.fillRect(-z.len / 2, -z.w / 2, z.len, z.w); g.strokeStyle = 'rgba(255,120,230,.8)'; g.lineWidth = 2; g.setLineDash([12, 10]); g.strokeRect(-z.len / 2, -z.w / 2, z.len, z.w); g.setLineDash([]); }
      g.restore(); break;
    }
  }
}
function drawZoneOver(g: CanvasRenderingContext2D, z: import('./entities').Zone, now: number, w: World) {
  const t = 1 - z.life / z.max;
  switch (z.kind) {
    case ZK.RING: {
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = z.col; g.globalAlpha = Math.max(0, 1 - t) * 0.9; g.lineWidth = 10 * (1 - t) + 2;
      g.beginPath(); g.ellipse(z.x, z.y, Math.max(0.1, z.r), Math.max(0.1, z.r * 0.8), 0, 0, 7); g.stroke();
      g.globalAlpha = Math.max(0, 1 - t) * 0.25; g.fillStyle = z.col; g.fill();
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; break;
    }
    case ZK.SLASH: {
      g.save(); g.translate(z.x, z.y); g.rotate(z.a); g.globalCompositeOperation = 'lighter';
      const k = Math.min(1, t * 3);
      g.globalAlpha = Math.max(0, 1 - t);
      const gr = g.createLinearGradient(0, 0, z.r, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, z.col); gr.addColorStop(1, '#ffffff');
      g.fillStyle = gr; g.beginPath();
      g.moveTo(8, 0); g.quadraticCurveTo(z.r * 0.5 * k, -z.w * 1.4 * z.special, z.r * k, -z.w * 0.2 * z.special);
      g.quadraticCurveTo(z.r * 0.55 * k, -z.w * 0.4 * z.special, 8, 0); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      g.restore(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; break;
    }
    case ZK.BEAM: {
      g.save(); g.translate(z.x, z.y); g.rotate(z.a); g.globalCompositeOperation = 'lighter';
      const fade = z.special ? Math.min(1, z.life * 4) : Math.max(0, 1 - t);
      const wv = z.w * (z.special ? 1 + 0.15 * Math.sin(now * 0.05) : 1 - t * 0.6);
      const gr = g.createLinearGradient(0, -wv, 0, wv); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, z.col); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.globalAlpha = fade; g.fillStyle = gr; g.fillRect(0, -wv, z.len, wv * 2);
      g.fillStyle = '#ffffff'; g.fillRect(0, -wv * 0.18, z.len, wv * 0.36);
      g.drawImage(tintedGlow(z.col), -wv * 1.5, -wv * 1.5, wv * 3, wv * 3);
      g.restore(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; break;
    }
    case ZK.BOLT: {
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.max(0, 1 - t);
      g.strokeStyle = '#fff6c8'; g.lineWidth = 3.5; g.shadowColor = '#fff3a0';
      g.beginPath(); g.moveTo(z.vx, z.vy);
      const segs = 7; for (let k = 1; k <= segs; k++) { const u = k / segs; g.lineTo(z.vx + (z.x - z.vx) * u + (k < segs ? (rng.next() - 0.5) * 26 : 0), z.vy + (z.y - z.vy) * u); }
      g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = 1.4; g.stroke();
      g.drawImage(tintedGlow('#fff3a0'), z.x - z.r * 1.4, z.y - z.r * 1.4, z.r * 2.8, z.r * 2.8);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; break;
    }
    case ZK.BLAST: {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = Math.max(0, 1 - t) * 0.8; g.drawImage(tintedGlow(z.col), z.x - z.r * 1.3, z.y - z.r * 1.3, z.r * 2.6, z.r * 2.6);
      g.strokeStyle = z.col; g.lineWidth = 6 * (1 - t); g.beginPath(); g.ellipse(z.x, z.y, Math.max(0.1, z.r * (0.4 + t * 0.8)), Math.max(0.1, z.r * (0.3 + t * 0.6)), 0, 0, 7); g.stroke();
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; break;
    }
    case ZK.SHOCK: {
      g.strokeStyle = `rgba(255,120,80,${Math.max(0, 1 - t)})`; g.lineWidth = 8 * (1 - t) + 2; g.beginPath(); g.ellipse(z.x, z.y, Math.max(0.1, z.r), Math.max(0.1, z.r * 0.65), 0, 0, 7); g.stroke(); break;
    }
    case ZK.LASER_LINE: {
      if (z.delay > 0) break;
      g.save(); g.translate(z.x, z.y); g.rotate(z.a); g.globalCompositeOperation = 'lighter';
      const gr = g.createLinearGradient(0, -z.w, 0, z.w); gr.addColorStop(0, 'rgba(255,47,208,0)'); gr.addColorStop(0.5, '#ff7ae8'); gr.addColorStop(1, 'rgba(255,47,208,0)');
      g.globalAlpha = Math.min(1, z.life * 5); g.fillStyle = gr; g.fillRect(-z.len / 2, -z.w, z.len, z.w * 2); g.fillStyle = '#fff'; g.fillRect(-z.len / 2, -z.w * 0.15, z.len, z.w * 0.3);
      g.restore(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; break;
    }
  }
  void w;
}

let IW = 0, IH = 0, IZ = 1, ICX = 0, ICY = 0, INOW = 0; let IG: CanvasRenderingContext2D | null = null;
function mark(x: number, y: number, col: string, big: boolean) {
  const g = IG!; const W = IW, H = IH;
  const sx = (x - ICX) * IZ + W / 2, sy = (y - ICY) * IZ + H / 2;
  if (sx > 0 && sx < W && sy > 0 && sy < H) return;
  const m = 34; const ax = Math.max(m, Math.min(W - m, sx)), ay = Math.max(m + 70, Math.min(H - m - 30, sy));
  const a = Math.atan2(sy - H / 2, sx - W / 2);
  g.save(); g.translate(ax, ay); g.rotate(a); g.globalAlpha = 0.75 + 0.25 * Math.sin(INOW * 0.008);
  g.fillStyle = col; g.beginPath(); const s = big ? 16 : 11; g.moveTo(s, 0); g.lineTo(-s * 0.7, -s * 0.7); g.lineTo(-s * 0.3, 0); g.lineTo(-s * 0.7, s * 0.7); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.stroke(); g.restore(); g.globalAlpha = 1;
}
function indicators(g: CanvasRenderingContext2D, w: World, W: number, H: number, zoom: number, cx: number, cy: number, now: number) {
  IG = g; IW = W; IH = H; IZ = zoom; ICX = cx; ICY = cy; INOW = now;
  for (let i = 0; i < w.pickups.n; i++) { const p = w.pickups.items[i]; if (!p.dead && p.kind === PU.CHEST) mark(p.x, p.y, '#ffd166', false); }
  for (let i = 0; i < w.enemies.n; i++) { const e = w.enemies.items[i]; if (!e.dead && e.rank >= 1) mark(e.x, e.y, e.rank >= 2 ? '#ff4d5e' : '#ffb000', e.rank >= 2); }
}

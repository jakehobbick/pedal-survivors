/** Particles (struct-of-arrays), floating damage numbers, screen shake & flashes. Allocation-free. */
import { settings } from '../core/settings';
import { rng } from '../core/math';
import { tintedGlow, tintedSpark, fxFrames } from '../art/fxart';

const MAXP = 1400;
const px = new Float32Array(MAXP), py = new Float32Array(MAXP), pvx = new Float32Array(MAXP), pvy = new Float32Array(MAXP);
const plife = new Float32Array(MAXP), pmax = new Float32Array(MAXP), psize = new Float32Array(MAXP), prot = new Float32Array(MAXP), pdrag = new Float32Array(MAXP);
const pspr = new Uint8Array(MAXP), pkind = new Uint8Array(MAXP); // kind 0 glow (additive), 1 spark (oriented), 2 petal/sprite (normal), 3 smoke
let pn = 0;
const sprites: HTMLCanvasElement[] = [];
const sprIdx = new Map<string, number>();
function spr(key: string, make: () => HTMLCanvasElement) { let i = sprIdx.get(key); if (i == null) { i = sprites.length; sprites.push(make()); sprIdx.set(key, i); } return i; }
const glowIds = new Map<string, number>(), sparkIds = new Map<string, number>();
export function glowId(col: string) { let i = glowIds.get(col); if (i == null) { i = spr('g' + col, () => tintedGlow(col)); glowIds.set(col, i); } return i; }
export function sparkId(col: string) { let i = sparkIds.get(col); if (i == null) { i = spr('s' + col, () => tintedSpark(col)); sparkIds.set(col, i); } return i; }
export function frameId(name: string) { return spr('f' + name, () => fxFrames()[name].c); }

export function particle(kind: number, sid: number, x: number, y: number, vx: number, vy: number, life: number, size: number, drag = 2) {
  if (pn >= MAXP) return;
  if (settings.reduceFx && rng.next() < 0.5) return;
  const i = pn++;
  px[i] = x; py[i] = y; pvx[i] = vx; pvy[i] = vy; plife[i] = life; pmax[i] = life; psize[i] = size; pspr[i] = sid; pkind[i] = kind; prot[i] = rng.next() * 6.28; pdrag[i] = drag;
}
export function burst(x: number, y: number, n: number, col: string, speed = 160, size = 10, life = 0.45) {
  const g = glowId(col), s = sparkId(col);
  for (let k = 0; k < n; k++) {
    const a = rng.next() * 6.283, v = speed * (0.3 + rng.next() * 0.9);
    if (k % 2) particle(1, s, x, y, Math.cos(a) * v, Math.sin(a) * v, life * (0.6 + rng.next() * 0.6), size * 0.9, 3);
    else particle(0, g, x, y, Math.cos(a) * v * 0.6, Math.sin(a) * v * 0.6, life * (0.6 + rng.next() * 0.8), size * (0.6 + rng.next() * 0.8), 3);
  }
}
export function ring(x: number, y: number, n: number, col: string, speed: number, size = 9) {
  const g = glowId(col);
  for (let k = 0; k < n; k++) { const a = (k / n) * 6.283; particle(0, g, x, y, Math.cos(a) * speed, Math.sin(a) * speed, 0.5, size, 1.5); }
}
export function updateParticles(dt: number) {
  let i = 0;
  while (i < pn) {
    plife[i] -= dt;
    if (plife[i] <= 0) {
      const j = --pn;
      px[i] = px[j]; py[i] = py[j]; pvx[i] = pvx[j]; pvy[i] = pvy[j]; plife[i] = plife[j]; pmax[i] = pmax[j]; psize[i] = psize[j]; pspr[i] = pspr[j]; pkind[i] = pkind[j]; prot[i] = prot[j]; pdrag[i] = pdrag[j];
      continue;
    }
    const d = Math.exp(-pdrag[i] * dt);
    pvx[i] *= d; pvy[i] *= d;
    if (pkind[i] === 2) { pvy[i] += 18 * dt; prot[i] += dt * 3; }
    if (pkind[i] === 3) { psize[i] += dt * 30; }
    px[i] += pvx[i] * dt; py[i] += pvy[i] * dt;
    i++;
  }
}
export function drawParticles(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  // normal blended first (petals, smoke), then additive glows/sparks
  for (let i = 0; i < pn; i++) {
    const k = pkind[i]; if (k < 2) continue;
    const x = px[i], y = py[i]; if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    const a = plife[i] / pmax[i]; const s = psize[i]; const im = sprites[pspr[i]];
    g.globalAlpha = k === 3 ? a * 0.6 : Math.min(1, a * 2);
    g.save(); g.translate(x, y); g.rotate(prot[i]); g.drawImage(im, -s / 2, -s / 2, s, s * (im.height / im.width)); g.restore();
  }
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < pn; i++) {
    const k = pkind[i]; if (k >= 2) continue;
    const x = px[i], y = py[i]; if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    const a = plife[i] / pmax[i]; const s = psize[i] * (k === 0 ? 0.5 + a * 0.7 : 1); const im = sprites[pspr[i]];
    g.globalAlpha = a;
    if (k === 1) {
      const ang = Math.atan2(pvy[i], pvx[i]); const len = s * 2.2;
      const c = Math.cos(ang), sn = Math.sin(ang);
      g.save(); g.transform(c, sn, -sn, c, x, y); g.drawImage(im, -len, -s * 0.25, len, s * 0.5); g.restore();
    } else g.drawImage(im, x - s, y - s, s * 2, s * 2);
  }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
}
export function particleCount() { return pn; }
export function clearParticles() { pn = 0; }

/* ---------- damage numbers ---------- */
const MAXN = 90;
const nx = new Float32Array(MAXN), ny = new Float32Array(MAXN), nlife = new Float32Array(MAXN), nval = new Int32Array(MAXN), nkind = new Uint8Array(MAXN);
let nn = 0, nHead = 0;
export function dmgNumber(x: number, y: number, v: number, kind: number) { // kind: 0 normal, 1 crit, 2 heal, 3 player hurt, 4 xp/gold text
  if (!settings.dmgNumbers && kind < 2) return;
  let i: number;
  if (nn < MAXN) i = nn++; else { i = nHead; nHead = (nHead + 1) % MAXN; }
  nx[i] = x + (rng.next() - 0.5) * 10; ny[i] = y; nlife[i] = kind === 1 ? 0.9 : 0.7; nval[i] = Math.round(v); nkind[i] = kind;
}
export function updateNumbers(dt: number) { for (let i = 0; i < nn; i++) { if (nlife[i] > 0) { nlife[i] -= dt; ny[i] -= dt * (nkind[i] === 1 ? 50 : 38); } } }
const COL = ['#ffffff', '#ffd166', '#5ef38c', '#ff4d5e', '#7fe0ff'];
const STR: string[] = [], STRP: string[] = [], STRM: string[] = []; for (let i = 0; i < 2000; i++) { STR.push(String(i)); STRP.push('+' + i); STRM.push('-' + i); }
const CRIT_FONT: string[] = []; for (let i = 0; i <= 60; i++) CRIT_FONT.push(`800 ${i}px Rajdhani, sans-serif`);
export function drawNumbers(g: CanvasRenderingContext2D) {
  g.textAlign = 'center'; g.lineJoin = 'round';
  for (let i = 0; i < nn; i++) {
    const L = nlife[i]; if (L <= 0) continue;
    const k = nkind[i]; const crit = k === 1;
    const pop = crit ? 1 + Math.max(0, L - 0.7) * 3 : 1;
    g.font = crit ? CRIT_FONT[Math.min(60, Math.round(24 * pop))] : '700 17px Rajdhani, sans-serif';
    g.globalAlpha = Math.min(1, L * 3);
    const v = nval[i]; const s = v < 2000 && v >= 0 ? STR[v] : String(v);
    const txt = v < 2000 && v >= 0 ? (k === 2 ? STRP[v] : k === 3 ? STRM[v] : s) : (k === 2 ? '+' + s : k === 3 ? '-' + s : s);
    g.lineWidth = 3.5; g.strokeStyle = 'rgba(20,8,30,.9)'; g.strokeText(txt, nx[i], ny[i]);
    g.fillStyle = COL[k]; g.fillText(txt, nx[i], ny[i]);
  }
  g.globalAlpha = 1;
}
export function clearNumbers() { nn = 0; nHead = 0; }

/* ---------- screen shake / flash ---------- */
export const screen = { shake: 0, shX: 0, shY: 0, flash: 0, flashCol: '#ffffff', hitstop: 0, vignetteHurt: 0, zoomPunch: 0 };
export function shake(amt: number) { if (!settings.shake) return; screen.shake = Math.min(18, Math.max(screen.shake, amt)); }
export function flash(col: string, a = 0.5) { screen.flash = Math.max(screen.flash, a); screen.flashCol = col; }
export function updateScreen(dt: number) {
  if (screen.shake > 0) { screen.shake = Math.max(0, screen.shake - dt * 30); const s = screen.shake; screen.shX = (rng.next() - 0.5) * 2 * s; screen.shY = (rng.next() - 0.5) * 2 * s; }
  else { screen.shX = screen.shY = 0; }
  screen.flash = Math.max(0, screen.flash - dt * 2.5);
  screen.vignetteHurt = Math.max(0, screen.vignetteHurt - dt * 1.5);
  screen.zoomPunch = Math.max(0, screen.zoomPunch - dt * 2);
  if (screen.hitstop > 0) screen.hitstop -= dt;
}

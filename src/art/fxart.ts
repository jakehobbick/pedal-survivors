/** Projectile, pickup and particle sprites (generated once). */
import { Ctx, Frame, renderFrame, shade, lin, rad, inked, ellipse, circle, line, rgba, INK, mkCanvas } from './common';

function glow(g: Ctx, x: number, y: number, r: number, col: string, a = 1) {
  g.fillStyle = rad(g, x, y, 0, r, [[0, rgba(col, a)], [0.4, rgba(col, a * 0.45)], [1, rgba(col, 0)]]); circle(g, x, y, r); g.fill();
}
const F: Record<string, Frame> = {};
const make = (id: string, w: number, h: number, fn: (g: Ctx) => void) => { F[id] = renderFrame(w, h, w / 2, h / 2, fn, false); };

export function buildFxArt() {
  if (F.dart) return F;
  make('dart', 30, 12, (g) => {
    glow(g, 10, 6, 8, '#7fe0ff', 0.7);
    g.beginPath(); g.moveTo(2, 6); g.lineTo(20, 4.4); g.lineTo(27, 6); g.lineTo(20, 7.6); g.closePath(); inked(g, lin(g, 0, 4, 0, 8, [[0, '#ffffff'], [1, '#9fb4c8']]), 1.2);
    g.fillStyle = '#ffd166'; g.fillRect(17, 4.6, 2.5, 2.8);
  });
  make('shuriken', 30, 30, (g) => {
    glow(g, 15, 15, 14, '#c9d6ff', 0.5);
    g.save(); g.translate(15, 15);
    g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); g.lineTo(Math.cos(a + 0.39) * 4.5, Math.sin(a + 0.39) * 4.5); } g.closePath();
    inked(g, lin(g, -12, -12, 12, 12, [[0, '#ffffff'], [0.5, '#b8c2dd'], [1, '#5c6585']]), 1.4);
    circle(g, 0, 0, 3); inked(g, '#ff5d8f', 1);
    g.restore();
  });
  make('wheel', 56, 56, (g) => {
    glow(g, 28, 28, 28, '#ffffff', 0.4);
    circle(g, 28, 28, 22); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#2b2635'; g.stroke();
    circle(g, 28, 28, 18); g.lineWidth = 3; g.strokeStyle = '#ff5d8f'; g.stroke();
    g.strokeStyle = '#e8ecff'; g.lineWidth = 1; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; line(g, 28, 28, 28 + Math.cos(a) * 17, 28 + Math.sin(a) * 17); }
    circle(g, 28, 28, 4); inked(g, '#ffd166', 1.2);
    // blades
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.beginPath(); g.moveTo(28 + Math.cos(a) * 22, 28 + Math.sin(a) * 22); g.lineTo(28 + Math.cos(a + 0.22) * 27, 28 + Math.sin(a + 0.22) * 27); g.lineTo(28 + Math.cos(a + 0.3) * 21, 28 + Math.sin(a + 0.3) * 21); inked(g, '#ffffff', 1); }
  });
  make('ball', 30, 30, (g) => {
    glow(g, 15, 15, 15, '#ff9f43', 0.6);
    circle(g, 15, 15, 9); inked(g, rad(g, 12, 12, 1, 10, [[0, '#8a8ea3'], [1, '#1d1f2b']]), 1.6);
    g.fillStyle = 'rgba(255,255,255,.55)'; ellipse(g, 12, 11, 3, 1.8, -0.6); g.fill();
    g.strokeStyle = '#ff9f43'; g.lineWidth = 1.2; g.beginPath(); g.arc(15, 15, 6.5, 0.4, 1.6); g.stroke();
  });
  make('bottle', 22, 30, (g) => {
    g.save(); g.translate(11, 15); g.rotate(0.3);
    g.beginPath(); g.roundRect(-5.5, -10, 11, 20, 4); inked(g, lin(g, -5, 0, 5, 0, [[0, '#a7f7c4'], [0.5, '#5ef38c'], [1, '#1f9e55']]), 1.4);
    g.fillStyle = '#ffffff'; g.fillRect(-5.5, -2, 11, 4); g.fillStyle = '#ff5d8f'; g.fillRect(-2, -2, 4, 4);
    g.beginPath(); g.roundRect(-3, -14, 6, 5, 1.5); inked(g, '#2b2440', 1.1);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(-3.8, -8, 1.6, 12);
    g.restore();
  });
  make('drone', 34, 34, (g) => {
    glow(g, 17, 17, 16, '#c9b6ff', 0.55);
    g.strokeStyle = 'rgba(220,210,255,.7)'; g.lineWidth = 1; ellipse(g, 17, 17, 14, 4); g.stroke();
    circle(g, 17, 17, 7.5); inked(g, lin(g, 17, 10, 17, 25, [[0, '#ffffff'], [1, '#7a68c8']]), 1.5);
    g.fillStyle = '#1b1233'; ellipse(g, 17, 17, 5, 2.4); g.fill(); g.fillStyle = '#5ef38c'; circle(g, 18.5, 17, 1.4); g.fill();
    for (const s of [-1, 1]) { g.fillStyle = 'rgba(255,255,255,.35)'; ellipse(g, 17 + s * 11, 12, 6, 1.6); g.fill(); }
  });
  make('boomer', 40, 40, (g) => {
    glow(g, 20, 20, 19, '#ff5d8f', 0.55);
    circle(g, 20, 20, 13); g.lineWidth = 4.6; g.strokeStyle = INK; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#ff5d8f'; g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 0.9; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; line(g, 20, 20, 20 + Math.cos(a) * 11, 20 + Math.sin(a) * 11); }
    circle(g, 20, 20, 3); inked(g, '#ffd166', 1);
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(20, 20, 16, 0.3, 1.5); g.stroke();
  });
  make('orb', 26, 26, (g) => {
    glow(g, 13, 13, 13, '#ff4dff', 0.9);
    circle(g, 13, 13, 6); g.fillStyle = rad(g, 11, 11, 0, 7, [[0, '#ffffff'], [0.5, '#ff9cf5'], [1, '#b100c4']]); g.fill();
  });
  make('orbFire', 26, 26, (g) => {
    glow(g, 13, 13, 13, '#ff6a1a', 0.9);
    circle(g, 13, 13, 6); g.fillStyle = rad(g, 11, 11, 0, 7, [[0, '#fffbe0'], [0.5, '#ffb000'], [1, '#c41a00']]); g.fill();
  });
  make('orbCyan', 26, 26, (g) => {
    glow(g, 13, 13, 13, '#22e5ff', 0.9);
    circle(g, 13, 13, 6); g.fillStyle = rad(g, 11, 11, 0, 7, [[0, '#ffffff'], [0.5, '#8ff4ff'], [1, '#0077b6']]); g.fill();
  });
  // gems
  const gem = (id: string, c: string, s: number) => make(id, 20 * s, 24 * s, (g) => {
    glow(g, 10 * s, 12 * s, 10 * s, c, 0.6);
    g.beginPath(); g.moveTo(10 * s, 3 * s); g.lineTo(16 * s, 10 * s); g.lineTo(10 * s, 21 * s); g.lineTo(4 * s, 10 * s); g.closePath();
    inked(g, lin(g, 4 * s, 3 * s, 16 * s, 21 * s, [[0, '#ffffff'], [0.35, shade(c, 40)], [1, shade(c, -60)]]), 1.2);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.moveTo(10 * s, 4.5 * s); g.lineTo(13 * s, 9.5 * s); g.lineTo(10 * s, 9.5 * s); g.closePath(); g.fill();
  });
  gem('gem0', '#4cc9f0', 1); gem('gem1', '#5ef38c', 1.15); gem('gem2', '#ff5d8f', 1.35); gem('gem3', '#ffd166', 1.6);
  make('coin', 20, 20, (g) => {
    glow(g, 10, 10, 10, '#ffd166', 0.5);
    circle(g, 10, 10, 6.5); inked(g, rad(g, 8, 8, 1, 7, [[0, '#fff4c2'], [0.6, '#ffd166'], [1, '#c98a00']]), 1.3);
    g.strokeStyle = '#a06a00'; g.lineWidth = 1; circle(g, 10, 10, 4); g.stroke(); g.fillStyle = '#a06a00'; g.fillRect(9.2, 7.5, 1.6, 5);
  });
  make('heal', 30, 30, (g) => { // onigiri
    glow(g, 15, 15, 15, '#5ef38c', 0.45);
    g.beginPath(); g.moveTo(15, 4); g.quadraticCurveTo(26, 20, 23, 24); g.quadraticCurveTo(15, 27, 7, 24); g.quadraticCurveTo(4, 20, 15, 4); g.closePath(); inked(g, rad(g, 13, 12, 1, 14, [[0, '#ffffff'], [1, '#dcdcdc']]), 1.6);
    g.beginPath(); g.roundRect(9.5, 17, 11, 9, 2); inked(g, '#1b2b1b', 1.1);
    g.fillStyle = '#ff5d8f'; circle(g, 15, 13, 1.8); g.fill();
  });
  make('magnet', 30, 30, (g) => {
    glow(g, 15, 15, 15, '#4cc9f0', 0.5);
    g.lineCap = 'butt'; g.beginPath(); g.arc(15, 14, 8, Math.PI, 0); g.lineWidth = 8; g.strokeStyle = INK; g.stroke(); g.lineWidth = 6; g.strokeStyle = '#ff4d5e'; g.stroke();
    for (const x of [7, 23]) { g.fillStyle = INK; g.fillRect(x - 4, 13, 8, 10); g.fillStyle = '#e6e8f0'; g.fillRect(x - 3, 17, 6, 5); g.fillStyle = '#ff4d5e'; g.fillRect(x - 3, 13.5, 6, 3.5); }
  });
  make('bomb', 30, 30, (g) => {
    glow(g, 15, 16, 15, '#ff9f43', 0.45);
    circle(g, 14, 17, 9); inked(g, rad(g, 11, 14, 1, 10, [[0, '#6b6e85'], [1, '#14151f']]), 1.6);
    g.fillStyle = 'rgba(255,255,255,.5)'; ellipse(g, 11, 13, 3, 1.6, -0.6); g.fill();
    g.strokeStyle = '#d9c38b'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(19, 9); g.quadraticCurveTo(23, 4, 26, 6); g.stroke(); glow(g, 26, 6, 5, '#ffd166', 1);
  });
  make('chest', 40, 34, (g) => {
    glow(g, 20, 18, 20, '#ffd166', 0.45);
    g.beginPath(); g.roundRect(5, 13, 30, 17, 3); inked(g, lin(g, 0, 13, 0, 30, [[0, '#b0602a'], [1, '#5c2a10']]), 1.8);
    g.beginPath(); g.moveTo(5, 15); g.quadraticCurveTo(20, 2, 35, 15); g.closePath(); inked(g, lin(g, 0, 4, 0, 15, [[0, '#d98a3a'], [1, '#8a4418']]), 1.8);
    g.fillStyle = '#ffd166'; g.fillRect(5, 14, 30, 3); g.fillRect(18, 9, 4, 21); g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(18, 9, 4, 21);
    circle(g, 20, 19, 2.6); inked(g, '#ffe9a8', 1);
  });
  // particles (white-ish so they can be tinted via globalAlpha + composite)
  make('glow', 32, 32, (g) => glow(g, 16, 16, 16, '#ffffff', 1));
  make('spark', 16, 4, (g) => { g.fillStyle = lin(g, 0, 0, 16, 0, [[0, 'rgba(255,255,255,0)'], [1, '#ffffff']]); g.beginPath(); g.roundRect(0, 0.5, 16, 3, 1.5); g.fill(); });
  make('petal', 10, 8, (g) => { g.beginPath(); g.ellipse(5, 4, 4.5, 2.6, 0.3, 0, 7); g.fillStyle = lin(g, 0, 0, 10, 8, [[0, '#ffe3f0'], [1, '#ff8fb8']]); g.fill(); });
  make('ember', 8, 8, (g) => glow(g, 4, 4, 4, '#ffb000', 1));
  make('smoke', 32, 32, (g) => { g.fillStyle = rad(g, 16, 16, 0, 16, [[0, 'rgba(200,190,210,.55)'], [1, 'rgba(200,190,210,0)']]); circle(g, 16, 16, 16); g.fill(); });
  make('shadow', 64, 20, (g) => { g.fillStyle = rad(g, 32, 10, 0, 32, [[0, 'rgba(10,0,20,.55)'], [0.7, 'rgba(10,0,20,.3)'], [1, 'rgba(10,0,20,0)']]); g.save(); g.scale(1, 20 / 64); circle(g, 32, 32, 32); g.restore(); g.fill(); });
  make('flame', 40, 48, (g) => {
    g.beginPath(); g.moveTo(20, 4); g.quadraticCurveTo(34, 24, 30, 36); g.quadraticCurveTo(26, 46, 20, 46); g.quadraticCurveTo(10, 46, 9, 36); g.quadraticCurveTo(8, 22, 20, 4);
    g.fillStyle = rad(g, 20, 36, 1, 26, [[0, '#fffbe0'], [0.3, '#ffd166'], [0.7, '#ff6a1a'], [1, 'rgba(200,30,0,0)']]); g.fill();
  });
  return F;
}
export function fxFrames() { return buildFxArt(); }

/** Tinted glow sprite cache keyed by color (for colored particles without per-frame compositing). */
const tintCache = new Map<string, HTMLCanvasElement>();
export function tintedGlow(col: string): HTMLCanvasElement {
  let c = tintCache.get(col); if (c) return c;
  const [cv, g] = mkCanvas(32, 32);
  g.fillStyle = rad(g, 16, 16, 0, 16, [[0, '#ffffff'], [0.2, col], [0.55, rgba(col, 0.35)], [1, rgba(col, 0)]]); circle(g, 16, 16, 16); g.fill();
  tintCache.set(col, cv); c = cv; return c;
}
export function tintedSpark(col: string): HTMLCanvasElement {
  const key = 's' + col; let c = tintCache.get(key); if (c) return c;
  const [cv, g] = mkCanvas(16, 4);
  g.fillStyle = lin(g, 0, 0, 16, 0, [[0, rgba(col, 0)], [0.6, col], [1, '#ffffff']]); g.beginPath(); g.roundRect(0, 0.5, 16, 3, 1.5); g.fill();
  tintCache.set(key, cv); return cv;
}

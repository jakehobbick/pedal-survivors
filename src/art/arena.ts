/**
 * Arena ground tiles + decor, generated procedurally per arena.
 * Ground is a large seamless tile; decor props are placed deterministically per grid cell.
 */
import { Ctx, mkCanvas, shade, lin, rad, inked, ellipse, circle, noiseTex, rgba, INK } from './common';
import { hash2 } from '../core/math';

export interface ArenaArt { tile: HTMLCanvasElement; tileSize: number; props: HTMLCanvasElement[]; propScale: number[]; fog: string; tint: string; particle: 'petal' | 'ember' | 'rain' }

function seeded(seed: number) { let s = seed >>> 0 || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

function sakuraTile(): HTMLCanvasElement {
  const N = 512; const [c, g] = mkCanvas(N, N); const R = seeded(11);
  g.fillStyle = lin(g, 0, 0, N, N, [[0, '#4f7d3a'], [0.5, '#5d8a40'], [1, '#4a7536']]); g.fillRect(0, 0, N, N);
  // mottled grass
  for (let i = 0; i < 60; i++) { const x = R() * N, y = R() * N, r = 30 + R() * 70; const col = R() < 0.5 ? 'rgba(120,170,70,.35)' : 'rgba(30,60,30,.3)'; for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { g.fillStyle = rad(g, x + dx, y + dy, 1, r, [[0, col], [1, 'rgba(0,0,0,0)']]); g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2); } }
  // dirt road band (diagonal-ish, tileable horizontally)
  g.save(); g.globalAlpha = 0.9;
  for (let pass = 0; pass < 2; pass++) {
    g.beginPath();
    for (let x = -10; x <= N + 10; x += 8) { const y = 300 + Math.sin(x / N * Math.PI * 2) * 40; if (x < 0) g.moveTo(x, y); else g.lineTo(x, y); }
    g.lineWidth = pass ? 54 : 66; g.strokeStyle = pass ? '#b99a6b' : '#7b6345'; g.lineCap = 'round'; g.stroke();
  }
  g.restore();
  // road pebbles + ruts
  for (let i = 0; i < 260; i++) { const x = R() * N; const y = 300 + Math.sin(x / N * Math.PI * 2) * 40 + (R() - 0.5) * 46; g.fillStyle = R() < 0.5 ? 'rgba(90,70,50,.6)' : 'rgba(230,210,170,.5)'; circle(g, x, y, 0.8 + R() * 2.2); g.fill(); }
  // grass blades
  for (let i = 0; i < 2200; i++) {
    const x = R() * N, y = R() * N; const yr = 300 + Math.sin(x / N * Math.PI * 2) * 40; if (Math.abs(y - yr) < 34) continue;
    const h = 3 + R() * 6; g.strokeStyle = R() < 0.5 ? 'rgba(150,200,90,.7)' : 'rgba(40,80,35,.7)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 3, y - h); g.stroke();
  }
  // fallen petals
  for (let i = 0; i < 380; i++) { const x = R() * N, y = R() * N; g.fillStyle = R() < 0.7 ? 'rgba(255,183,213,.85)' : 'rgba(255,240,250,.85)'; ellipse(g, x, y, 1.6 + R(), 1 + R() * 0.6, R() * 3); g.fill(); }
  // tiny flowers
  for (let i = 0; i < 70; i++) { const x = R() * N, y = R() * N; const col = R() < 0.5 ? '#fff6a8' : '#c9a7ff'; for (let k = 0; k < 5; k++) { g.fillStyle = col; circle(g, x + Math.cos(k * 1.256) * 2, y + Math.sin(k * 1.256) * 2, 1.4); g.fill(); } g.fillStyle = '#f7a11a'; circle(g, x, y, 1); g.fill(); }
  g.globalCompositeOperation = 'multiply'; g.drawImage(noiseTex(256, 3, 32, 0.5), 0, 0, N, N); g.globalCompositeOperation = 'source-over';
  return c;
}
function neonTile(): HTMLCanvasElement {
  const N = 512; const [c, g] = mkCanvas(N, N); const R = seeded(29);
  g.fillStyle = '#16122a'; g.fillRect(0, 0, N, N);
  // asphalt texture
  g.drawImage(noiseTex(256, 9, 8, 0.6, false), 0, 0, N, N);
  g.globalAlpha = 0.6; g.drawImage(noiseTex(256, 4, 40, 0.8), 0, 0, N, N); g.globalAlpha = 1;
  // panel grid (sidewalk slabs)
  g.strokeStyle = 'rgba(120,90,200,.18)'; g.lineWidth = 2;
  for (let i = 0; i <= N; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, N); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(N, i); g.stroke(); }
  // glowing lane lines
  for (const y of [96, 352]) {
    g.save(); g.shadowColor = '#ff2fd0'; g.shadowBlur = 14; g.strokeStyle = 'rgba(255,90,220,.9)'; g.lineWidth = 3; g.setLineDash([30, 22]);
    g.beginPath(); g.moveTo(0, y); g.lineTo(N, y); g.stroke(); g.restore();
  }
  g.save(); g.shadowColor = '#22e5ff'; g.shadowBlur = 12; g.strokeStyle = 'rgba(60,230,255,.75)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(256, 0); g.lineTo(256, N); g.stroke(); g.restore();
  // puddles reflecting neon
  for (let i = 0; i < 9; i++) { const x = R() * N, y = R() * N, rx = 20 + R() * 40; g.fillStyle = rad(g, x, y, 1, rx, [[0, R() < 0.5 ? 'rgba(255,60,200,.28)' : 'rgba(60,220,255,.25)'], [1, 'rgba(0,0,0,0)']]); ellipse(g, x, y, rx, rx * 0.45); g.fill(); }
  // manholes
  for (let i = 0; i < 3; i++) { const x = 60 + R() * 390, y = 150 + R() * 160; circle(g, x, y, 16); g.fillStyle = '#211a3a'; g.fill(); g.strokeStyle = '#3a2f60'; g.lineWidth = 2; g.stroke(); for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x - 12, y + k * 5); g.lineTo(x + 12, y + k * 5); g.stroke(); } }
  // litter specks
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${150 + R() * 100},${120 + R() * 80},255,${0.1 + R() * 0.2})`; g.fillRect(R() * N, R() * N, 1.5, 1.5); }
  return c;
}
function volcanoTile(): HTMLCanvasElement {
  const N = 512; const [c, g] = mkCanvas(N, N); const R = seeded(47);
  g.fillStyle = '#2a1a1a'; g.fillRect(0, 0, N, N);
  g.drawImage(noiseTex(256, 21, 24, 0.9), 0, 0, N, N);
  // basalt plates
  for (let i = 0; i < 70; i++) {
    const x = R() * N, y = R() * N, r = 18 + R() * 34; g.beginPath();
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + R() * 0.4; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8); }
    g.closePath(); g.fillStyle = `rgba(${50 + R() * 30},${32 + R() * 15},${30 + R() * 10},.8)`; g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2; g.stroke();
  }
  // glowing lava cracks (tile-safe by drawing wrapped)
  const crack = (x: number, y: number) => {
    let a = R() * 6.28; const pts: number[] = [x, y];
    for (let k = 0; k < 9; k++) { a += (R() - 0.5) * 1.3; x += Math.cos(a) * 16; y += Math.sin(a) * 16; pts.push(x, y); }
    for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) {
      g.save(); g.translate(dx, dy);
      g.beginPath(); g.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]);
      g.strokeStyle = 'rgba(255,80,20,.35)'; g.lineWidth = 9; g.stroke();
      g.strokeStyle = '#ff6a1a'; g.lineWidth = 3; g.stroke(); g.strokeStyle = '#ffe08a'; g.lineWidth = 1; g.stroke();
      g.restore();
    }
  };
  for (let i = 0; i < 7; i++) crack(R() * N, R() * N);
  // ash specks
  for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(${180 + R() * 70},${150 + R() * 60},${130},${0.08 + R() * 0.15})`; g.fillRect(R() * N, R() * N, 1.2, 1.2); }
  return c;
}

/* ---------- props ---------- */
function sakuraTree(): HTMLCanvasElement {
  const [c, g] = mkCanvas(240, 260); const R = seeded(5);
  g.fillStyle = 'rgba(20,30,10,.35)'; ellipse(g, 120, 236, 80, 20); g.fill();
  // trunk
  g.beginPath(); g.moveTo(108, 240); g.bezierCurveTo(112, 190, 96, 160, 84, 120); g.lineTo(98, 116); g.bezierCurveTo(112, 150, 122, 140, 132, 108); g.lineTo(142, 114);
  g.bezierCurveTo(130, 160, 130, 200, 134, 240); g.closePath();
  inked(g, lin(g, 100, 0, 140, 0, [[0, '#5a3426'], [0.5, '#7a4a34'], [1, '#3b2219']]), 3);
  // canopy blobs
  const blobs: [number, number, number][] = [];
  for (let i = 0; i < 16; i++) blobs.push([60 + R() * 120, 40 + R() * 80, 24 + R() * 22]);
  for (const [x, y, r] of blobs) { circle(g, x, y + 6, r); g.fillStyle = '#c45a8a'; g.fill(); }
  for (const [x, y, r] of blobs) { circle(g, x, y, r); g.fillStyle = rad(g, x - r * 0.3, y - r * 0.4, 1, r * 1.2, [[0, '#ffe3f0'], [0.45, '#ffb3d1'], [1, '#e77aa8']]); g.fill(); }
  g.globalCompositeOperation = 'source-atop'; g.drawImage(noiseTex(128, 12, 6, 0.6), 0, 0, 240, 260); g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 90; i++) { const x = 40 + R() * 160, y = 20 + R() * 130; g.fillStyle = R() < 0.5 ? '#fff' : '#ff8fb8'; circle(g, x, y, 1.2 + R() * 1.4); g.fill(); }
  g.lineWidth = 3; g.strokeStyle = rgba(INK, 0.6);
  return c;
}
function stoneLantern(): HTMLCanvasElement {
  const [c, g] = mkCanvas(80, 120);
  g.fillStyle = 'rgba(0,0,0,.3)'; ellipse(g, 40, 112, 26, 7); g.fill();
  const st = (y: number, w: number, h: number, col: string) => { g.beginPath(); g.roundRect(40 - w / 2, y, w, h, 3); inked(g, lin(g, 40 - w / 2, 0, 40 + w / 2, 0, [[0, shade(col, 25)], [1, shade(col, -30)]]), 2); };
  st(96, 44, 14, '#8f8a86'); st(70, 14, 28, '#a19c97'); st(56, 38, 16, '#8f8a86');
  g.fillStyle = rad(g, 40, 64, 1, 14, [[0, '#fff3b0'], [1, 'rgba(255,170,60,0)']]); circle(g, 40, 64, 14); g.fill();
  g.beginPath(); g.moveTo(10, 56); g.quadraticCurveTo(40, 30, 70, 56); g.closePath(); inked(g, lin(g, 0, 30, 0, 56, [[0, '#b7b1ac'], [1, '#6f6a66']]), 2);
  circle(g, 40, 36, 5); inked(g, '#8f8a86', 1.6);
  g.globalCompositeOperation = 'source-atop'; g.drawImage(noiseTex(64, 3, 5, 0.6), 0, 0); g.globalCompositeOperation = 'source-over';
  return c;
}
function rock(col: string, seed: number): HTMLCanvasElement {
  const [c, g] = mkCanvas(90, 70); const R = seeded(seed);
  g.fillStyle = 'rgba(0,0,0,.3)'; ellipse(g, 45, 60, 36, 8); g.fill();
  g.beginPath(); for (let k = 0; k < 9; k++) { const a = Math.PI + k / 8 * Math.PI; const r = 30 + R() * 10; g.lineTo(45 + Math.cos(a) * r, 58 + Math.sin(a) * r * 0.9); } g.closePath();
  inked(g, lin(g, 0, 20, 0, 60, [[0, shade(col, 35)], [1, shade(col, -35)]]), 2.4);
  g.globalCompositeOperation = 'source-atop'; g.drawImage(noiseTex(64, seed, 6, 0.7), 0, 0); g.fillStyle = 'rgba(255,255,255,.15)'; ellipse(g, 38, 34, 14, 5, -0.3); g.fill(); g.globalCompositeOperation = 'source-over';
  return c;
}
function neonSign(): HTMLCanvasElement {
  const [c, g] = mkCanvas(120, 150);
  g.fillStyle = 'rgba(0,0,0,.4)'; ellipse(g, 60, 140, 30, 8); g.fill();
  g.fillStyle = '#2a2440'; g.fillRect(56, 60, 8, 80); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(56, 60, 8, 80);
  g.beginPath(); g.roundRect(14, 10, 92, 56, 10); inked(g, '#1a1430', 3);
  g.save(); g.shadowColor = '#ff2fd0'; g.shadowBlur = 16; g.strokeStyle = '#ff7ae8'; g.lineWidth = 3; g.beginPath(); g.roundRect(20, 16, 80, 44, 8); g.stroke();
  g.shadowColor = '#22e5ff'; g.strokeStyle = '#8ff4ff'; g.lineWidth = 4;
  // bike glyph
  circle(g, 42, 44, 9); g.stroke(); circle(g, 78, 44, 9); g.stroke(); g.beginPath(); g.moveTo(42, 44); g.lineTo(54, 28); g.lineTo(70, 28); g.lineTo(78, 44); g.moveTo(54, 28); g.lineTo(60, 44); g.lineTo(70, 28); g.stroke();
  g.restore();
  return c;
}
function vending(): HTMLCanvasElement {
  const [c, g] = mkCanvas(80, 130);
  g.fillStyle = 'rgba(0,0,0,.4)'; ellipse(g, 40, 122, 30, 8); g.fill();
  g.beginPath(); g.roundRect(10, 8, 60, 112, 6); inked(g, lin(g, 10, 0, 70, 0, [[0, '#3b58c9'], [1, '#22337a']]), 2.5);
  g.fillStyle = '#0d0a1c'; g.fillRect(16, 16, 40, 60);
  const cols = ['#ff5d8f', '#ffd166', '#4cc9f0', '#5ef38c'];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { g.fillStyle = cols[(r + k) % 4]; g.fillRect(19 + k * 9, 20 + r * 14, 6, 10); }
  g.save(); g.shadowColor = '#9ff'; g.shadowBlur = 10; g.fillStyle = 'rgba(160,255,255,.25)'; g.fillRect(16, 16, 40, 60); g.restore();
  g.fillStyle = '#111'; g.fillRect(18, 90, 34, 10); g.fillStyle = '#ffd166'; g.fillRect(60, 30, 5, 14);
  return c;
}
function volcanoSpire(): HTMLCanvasElement {
  const [c, g] = mkCanvas(110, 170); const R = seeded(77);
  g.fillStyle = 'rgba(0,0,0,.45)'; ellipse(g, 55, 160, 40, 10); g.fill();
  g.beginPath(); g.moveTo(20, 160); g.lineTo(38, 70); g.lineTo(50, 20); g.lineTo(62, 60); g.lineTo(74, 40); g.lineTo(92, 160); g.closePath();
  inked(g, lin(g, 20, 0, 92, 0, [[0, '#5a3a32'], [0.5, '#3a2622'], [1, '#1c1110']]), 2.5);
  g.globalCompositeOperation = 'source-atop'; g.drawImage(noiseTex(64, 31, 5, 0.8), 0, 0);
  for (let i = 0; i < 5; i++) { const y = 70 + R() * 80; g.strokeStyle = '#ff6a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(40 + R() * 30, y); g.lineTo(44 + R() * 30, y + 14); g.stroke(); }
  g.globalCompositeOperation = 'source-over';
  return c;
}
function skull(): HTMLCanvasElement {
  const [c, g] = mkCanvas(70, 50);
  g.fillStyle = 'rgba(0,0,0,.35)'; ellipse(g, 35, 44, 24, 6); g.fill();
  g.beginPath(); g.ellipse(35, 24, 18, 15, 0, 0, Math.PI * 2); inked(g, lin(g, 0, 10, 0, 40, [[0, '#efe6d0'], [1, '#a89a7e']]), 2);
  g.fillStyle = INK; ellipse(g, 28, 24, 5, 6); g.fill(); ellipse(g, 42, 24, 5, 6); g.fill();
  g.fillStyle = '#ff6a1a'; circle(g, 28, 25, 1.6); g.fill(); circle(g, 42, 25, 1.6); g.fill();
  return c;
}

export function buildArenaArt(id: string): ArenaArt {
  if (id === 'neon') return { tile: neonTile(), tileSize: 512, props: [neonSign(), vending(), rock('#3d3560', 4)], propScale: [0.9, 0.85, 0.7], fog: 'rgba(40,10,80,.25)', tint: '#22e5ff', particle: 'rain' };
  if (id === 'volcano') return { tile: volcanoTile(), tileSize: 512, props: [volcanoSpire(), rock('#4a2f2a', 9), skull()], propScale: [1, 0.8, 0.7], fog: 'rgba(90,20,0,.22)', tint: '#ff6a1a', particle: 'ember' };
  return { tile: sakuraTile(), tileSize: 512, props: [sakuraTree(), stoneLantern(), rock('#7c7a86', 2)], propScale: [1.1, 0.75, 0.6], fog: 'rgba(255,200,230,.08)', tint: '#ff9ec7', particle: 'petal' };
}

/** Deterministic decor placement: one candidate per 360-unit cell. */
export const DECOR_CELL = 360;
export function decorAt(cx: number, cy: number): { kind: number; x: number; y: number } | null {
  const h = hash2(cx, cy);
  if (h > 0.55) return null;
  const kind = h < 0.18 ? 0 : h < 0.36 ? 1 : 2;
  return { kind, x: cx * DECOR_CELL + hash2(cx + 7, cy) * DECOR_CELL * 0.8, y: cy * DECOR_CELL + hash2(cx, cy + 3) * DECOR_CELL * 0.8 };
}
export function drawGround(g: Ctx, art: ArenaArt, camX: number, camY: number, vw: number, vh: number) {
  const T = art.tileSize;
  const x0 = Math.floor((camX - vw / 2) / T) * T, y0 = Math.floor((camY - vh / 2) / T) * T;
  for (let y = y0; y < camY + vh / 2; y += T) for (let x = x0; x < camX + vw / 2; x += T) g.drawImage(art.tile, x, y, T + 0.5, T + 0.5);
}

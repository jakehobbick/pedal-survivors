/**
 * Bespoke boss & mini-boss art (procedural, layered, textured). 4 move frames + 2 attack frames each,
 * plus a hex-shield bubble drawn live while the sprint shield is up.
 */
import { Ctx, Frame, renderFrame, shade, lin, rad, inked, ellipse, circle, limb, line, rgba, noiseTex, textureAtop, INK } from './common';
import type { Enemy } from '../game/entities';
import { tintedGlow } from './fxart';

function tex(g: Ctx, seed: number, a = 0.5) { textureAtop(g, noiseTex(64, seed, 5, a)); }
function glowEye(g: Ctx, x: number, y: number, r: number, col: string) {
  g.fillStyle = rad(g, x, y, 0, r * 3, [[0, col], [0.3, rgba(col, 0.6)], [1, rgba(col, 0)]]); circle(g, x, y, r * 3); g.fill();
  g.fillStyle = '#fff'; circle(g, x, y, r * 0.6); g.fill();
}
function animeEyeBig(g: Ctx, x: number, y: number, s: number, iris: string, flip = 1) {
  g.save(); g.translate(x, y); g.scale(flip, 1);
  g.beginPath(); g.moveTo(-6 * s, 0); g.quadraticCurveTo(0, -5 * s, 7 * s, -1 * s); g.quadraticCurveTo(1 * s, 4 * s, -6 * s, 0); inked(g, '#fff6e0', 1.4);
  circle(g, 1 * s, -0.5 * s, 2.6 * s); g.fillStyle = iris; g.fill(); circle(g, 1.3 * s, -0.5 * s, 1.1 * s); g.fillStyle = INK; g.fill();
  circle(g, 0, -1.6 * s, 0.7 * s); g.fillStyle = '#fff'; g.fill();
  g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(-7 * s, -3 * s); g.lineTo(7 * s, -5.5 * s); g.stroke();
  g.restore();
}

/* ---------------- Gravel Colossus ---------------- */
function colossus(g: Ctx, p: number, pose: number) {
  const cx = 75, base = 146; const step = Math.sin(p * Math.PI * 2); const bob = Math.abs(step) * 2;
  const st = '#8d867a';
  for (const s of [-1, 1]) { g.beginPath(); g.roundRect(cx + s * 24 - 13 + (s > 0 ? step : -step) * 4, base - 34, 26, 34, 8); inked(g, lin(g, 0, base - 34, 0, base, [[0, shade(st, 10)], [1, shade(st, -50)]]), 3); }
  // body boulder
  g.beginPath(); g.moveTo(cx - 52, base - 30 - bob); g.bezierCurveTo(cx - 64, base - 100 - bob, cx - 20, base - 124 - bob, cx + 10, base - 120 - bob);
  g.bezierCurveTo(cx + 56, base - 116 - bob, cx + 62, base - 70 - bob, cx + 52, base - 30 - bob); g.closePath();
  inked(g, lin(g, cx - 40, base - 120, cx + 40, base - 20, [[0, shade(st, 45)], [0.5, st], [1, shade(st, -55)]]), 3.4);
  g.save(); g.clip(); tex(g, 61, 0.8);
  g.strokeStyle = 'rgba(30,20,10,.55)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(cx - 50 + i * 20, base - 120 - bob); g.lineTo(cx - 44 + i * 18, base - 80 - bob); g.lineTo(cx - 52 + i * 21, base - 40 - bob); g.stroke(); }
  g.restore();
  // crystal spikes
  const cry = [[-34, -112, -0.5, 26], [-12, -126, -0.15, 32], [12, -124, 0.15, 28], [34, -110, 0.5, 22]];
  for (const [ox, oy, a, L] of cry) { g.save(); g.translate(cx + ox, base + oy - bob); g.rotate(a); g.beginPath(); g.moveTo(-7, 6); g.lineTo(0, -L); g.lineTo(7, 6); g.closePath(); inked(g, lin(g, -7, 0, 7, 0, [[0, '#d7f7ff'], [0.5, '#6fd6ff'], [1, '#2a6c9a']]), 2); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(-2, 2); g.lineTo(0, -L * 0.7); g.lineTo(1, 2); g.fill(); g.restore(); }
  // glowing core + face
  glowEye(g, cx, base - 70 - bob, 10, pose ? '#ffffff' : '#6fd6ff');
  glowEye(g, cx - 18, base - 92 - bob, 4, '#6fd6ff'); glowEye(g, cx + 18, base - 92 - bob, 4, '#6fd6ff');
  g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 26, base - 101 - bob); g.lineTo(cx - 10, base - 96 - bob); g.moveTo(cx + 26, base - 101 - bob); g.lineTo(cx + 10, base - 96 - bob); g.stroke();
  // arms
  const ar = pose ? -1.4 : step * 0.3;
  for (const s of [-1, 1]) {
    g.save(); g.translate(cx + s * 54, base - 92 - bob); g.rotate(s * (0.25 + (s > 0 ? ar : -ar * 0.3)));
    g.beginPath(); g.roundRect(-12, 0, 24, 48, 10); inked(g, lin(g, -12, 0, 12, 0, [[0, shade(st, 30)], [1, shade(st, -45)]]), 3);
    circle(g, 0, 58, 18); inked(g, rad(g, -5, 52, 2, 20, [[0, shade(st, 35)], [1, shade(st, -50)]]), 3); g.save(); circle(g, 0, 58, 18); g.clip(); tex(g, 62, 0.8); g.restore();
    g.restore();
  }
  // moss tufts
  g.fillStyle = '#6aa84f'; for (const [x, y] of [[-40, -60], [30, -48], [-10, -40]]) { ellipse(g, cx + x, base + y - bob, 9, 4); g.fill(); }
}

/* ---------------- Nine-Tails Matriarch ---------------- */
function ninetails(g: Ctx, p: number, pose: number) {
  const cx = 82, base = 124; const step = Math.sin(p * Math.PI * 2);
  for (let i = 0; i < 9; i++) {
    const a = -2.75 + i * 0.2 + Math.sin(p * 6.28 + i * 0.7) * 0.08;
    g.save(); g.translate(cx - 26, base - 44); g.rotate(a);
    g.beginPath(); g.moveTo(0, -6); g.bezierCurveTo(22, -22, 46, -12, 58, 2); g.bezierCurveTo(44, 6, 22, 12, 0, 6); g.closePath();
    inked(g, lin(g, 0, 0, 58, 0, [[0, '#fff3e6'], [0.65, '#ffd8a8'], [1, '#ff6a1a']]), 2);
    g.save(); g.clip(); g.fillStyle = 'rgba(255,120,30,.6)'; ellipse(g, 54, 0, 10, 10); g.fill(); g.restore();
    g.restore();
  }
  for (const [lx, ph] of [[-22, 1], [-10, -1], [18, 1], [30, -1]] as [number, number][]) limb(g, [cx + lx, base - 26, cx + lx + step * ph * 6, base - 2], 7, '#e8d6c4');
  ellipse(g, cx, base - 36, 38, 20); inked(g, lin(g, 0, base - 56, 0, base - 16, [[0, '#fffaf2'], [1, '#d9b99a']]), 3);
  g.save(); ellipse(g, cx, base - 36, 38, 20); g.clip(); tex(g, 71, 0.4); g.strokeStyle = '#c23b4e'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 20, base - 52); g.quadraticCurveTo(cx, base - 40, cx + 24, base - 54); g.stroke(); g.restore();
  // neck ruff + head
  const hx = cx + 36, hy = base - 64 + (pose ? -6 : 0);
  g.beginPath(); for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3; g.lineTo(hx - 12 + Math.cos(a) * (i % 2 ? 18 : 26), hy + 14 + Math.sin(a) * (i % 2 ? 18 : 26)); } g.closePath(); inked(g, '#fff6ec', 2);
  g.beginPath(); g.moveTo(hx - 16, hy - 4); g.lineTo(hx - 14, hy - 30); g.lineTo(hx - 4, hy - 14); g.lineTo(hx + 6, hy - 32); g.lineTo(hx + 10, hy - 10);
  g.quadraticCurveTo(hx + 32, hy - 2, hx + 34, hy + 6); g.quadraticCurveTo(hx + 12, hy + 18, hx - 14, hy + 12); g.closePath();
  inked(g, lin(g, 0, hy - 30, 0, hy + 16, [[0, '#ffffff'], [1, '#e0c7ac']]), 2.6);
  g.fillStyle = '#ff9ec0'; g.beginPath(); g.moveTo(hx - 12, hy - 8); g.lineTo(hx - 12, hy - 24); g.lineTo(hx - 6, hy - 14); g.fill();
  // kitsune mask markings
  g.strokeStyle = '#c23b4e'; g.lineWidth = 2.4; line(g, hx - 2, hy - 6, hx + 12, hy - 4); line(g, hx, hy + 2, hx + 14, hy + 3);
  animeEyeBig(g, hx + 6, hy - 1, 1, '#ffb000');
  g.fillStyle = INK; circle(g, hx + 33, hy + 5, 2.6); g.fill();
  if (pose) { g.fillStyle = '#7a0f1e'; g.beginPath(); g.moveTo(hx + 14, hy + 9); g.lineTo(hx + 30, hy + 8); g.lineTo(hx + 18, hy + 16); g.fill(); }
  // foxfire orbs
  for (let i = 0; i < 3; i++) { const a = p * 6.28 + i * 2.09; const ox = cx + Math.cos(a) * 52, oy = base - 92 + Math.sin(a) * 12; g.fillStyle = rad(g, ox, oy, 0, 10, [[0, '#ffffff'], [0.4, '#9ff0ff'], [1, 'rgba(60,140,255,0)']]); circle(g, ox, oy, 10); g.fill(); }
}

/* ---------------- Mecha Domestique ---------------- */
function mecha(g: Ctx, p: number, pose: number) {
  const cx = 70, base = 146; const spin = p * Math.PI * 2;
  // wheel legs
  for (const s of [-1, 1]) {
    const wx = cx + s * 30, wy = base - 18;
    circle(g, wx, wy, 17); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#2b2f40'; g.stroke();
    g.strokeStyle = '#7fe0ff'; g.lineWidth = 1.2; for (let i = 0; i < 8; i++) { const a = spin + i * 0.785; line(g, wx, wy, wx + Math.cos(a) * 13, wy + Math.sin(a) * 13); }
    circle(g, wx, wy, 4); inked(g, '#ffd166', 1.5);
    limb(g, [wx, wy, cx + s * 18, base - 50], 7, '#5c6585');
  }
  // torso
  g.beginPath(); g.moveTo(cx - 34, base - 52); g.lineTo(cx - 40, base - 104); g.quadraticCurveTo(cx, base - 120, cx + 40, base - 104); g.lineTo(cx + 34, base - 52); g.closePath();
  inked(g, lin(g, cx - 40, 0, cx + 40, 0, [[0, '#c9d2f0'], [0.45, '#7a86b0'], [1, '#2e3450']]), 3);
  g.save(); g.clip(); tex(g, 81, 0.4);
  g.fillStyle = '#ffd166'; g.fillRect(cx - 40, base - 84, 80, 8); g.fillStyle = INK; for (let i = 0; i < 8; i++) g.fillRect(cx - 40 + i * 11, base - 84, 5, 8);
  g.restore();
  // bidon tanks on back
  for (const s of [-1, 1]) { g.beginPath(); g.roundRect(cx + s * 44 - 7, base - 112, 14, 34, 6); inked(g, lin(g, 0, 0, 14, 0, [[0, '#a7f7c4'], [1, '#1f9e55']]), 2); }
  // head / visor
  g.beginPath(); g.roundRect(cx - 24, base - 142, 48, 30, 12); inked(g, lin(g, 0, base - 142, 0, base - 112, [[0, '#e8edff'], [1, '#6b7394']]), 3);
  g.beginPath(); g.roundRect(cx - 18, base - 133, 36, 12, 6); inked(g, '#0b0f1e', 2);
  g.fillStyle = lin(g, cx - 18, 0, cx + 18, 0, [[0, pose ? '#ff4d5e' : '#22e5ff'], [1, pose ? '#ffd166' : '#ff2fd0']]); g.fillRect(cx - 14, base - 130, 28, 5);
  g.strokeStyle = INK; g.lineWidth = 2; line(g, cx + 14, base - 142, cx + 22, base - 156); glowEye(g, cx + 22, base - 156, 2.4, '#5ef38c');
  // arms with laser cannons
  for (const s of [-1, 1]) {
    g.save(); g.translate(cx + s * 40, base - 98); g.rotate(s * (pose ? -0.6 : 0.4));
    limb(g, [0, 0, s * 10, 26], 9, '#5c6585');
    g.beginPath(); g.roundRect(s * 10 - 8, 24, 16, 26, 5); inked(g, '#2e3450', 2);
    glowEye(g, s * 10, 52, pose ? 5 : 3, '#ff2fd0');
    g.restore();
  }
  g.fillStyle = '#ff5d8f'; g.beginPath(); g.roundRect(cx - 22, base - 72, 44, 14, 4); g.fill(); g.fillStyle = '#fff'; g.font = '800 11px Rajdhani, sans-serif'; g.textAlign = 'center'; g.fillText('TEAM 01', cx, base - 61);
}

/* ---------------- Oni Shogun ---------------- */
function oni(g: Ctx, p: number, pose: number) {
  const cx = 95, base = 196; const step = Math.sin(p * Math.PI * 2); const bob = Math.abs(step) * 2;
  const skin = '#d9363e', armor = '#2a1c22', gold = '#e8b84a';
  // legs with hakama
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 8, base - 64 - bob); g.lineTo(cx + s * 40 + (s > 0 ? step : -step) * 6, base - 4); g.lineTo(cx + s * 12, base - 4); g.closePath(); inked(g, lin(g, 0, base - 64, 0, base, [[0, '#4a2a5a'], [1, '#22102b']]), 3); }
  // torso armor (do)
  g.beginPath(); g.moveTo(cx - 44, base - 66 - bob); g.lineTo(cx - 50, base - 132 - bob); g.quadraticCurveTo(cx, base - 150 - bob, cx + 50, base - 132 - bob); g.lineTo(cx + 44, base - 66 - bob); g.closePath();
  inked(g, lin(g, cx - 50, 0, cx + 50, 0, [[0, shade(armor, 40)], [1, shade(armor, -10)]]), 3.4);
  g.save(); g.clip();
  for (let i = 0; i < 6; i++) { g.strokeStyle = gold; g.lineWidth = 2; line(g, cx - 52, base - 120 + i * 10 - bob, cx + 52, base - 120 + i * 10 - bob); g.strokeStyle = '#7a1b2a'; g.lineWidth = 6; line(g, cx - 52, base - 115 + i * 10 - bob, cx + 52, base - 115 + i * 10 - bob); }
  tex(g, 91, 0.5); g.restore();
  // shoulder plates (sode)
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 40, base - 140 - bob); g.lineTo(cx + s * 76, base - 126 - bob); g.lineTo(cx + s * 70, base - 96 - bob); g.lineTo(cx + s * 38, base - 108 - bob); g.closePath(); inked(g, lin(g, 0, base - 140, 0, base - 96, [[0, '#9a2a36'], [1, '#4a0f18']]), 3); g.strokeStyle = gold; g.lineWidth = 2; line(g, cx + s * 42, base - 128 - bob, cx + s * 72, base - 116 - bob); }
  // head (oni face) + kabuto
  const hy = base - 160 - bob;
  circle(g, cx, hy, 26); inked(g, rad(g, cx - 8, hy - 8, 2, 30, [[0, shade(skin, 30)], [1, shade(skin, -40)]]), 3);
  animeEyeBig(g, cx - 10, hy + 2, 1.15, '#ffd166', -1); animeEyeBig(g, cx + 10, hy + 2, 1.15, '#ffd166', 1);
  // fangs + mouth
  g.fillStyle = '#3a0a10'; g.beginPath(); g.moveTo(cx - 14, hy + 14); g.quadraticCurveTo(cx, hy + (pose ? 28 : 20), cx + 14, hy + 14); g.closePath(); g.fill();
  g.fillStyle = '#fff'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 11, hy + 14); g.lineTo(cx + s * 8, hy + 23); g.lineTo(cx + s * 6, hy + 14); g.fill(); }
  // kabuto helmet + horns
  g.beginPath(); g.moveTo(cx - 32, hy - 2); g.bezierCurveTo(cx - 34, hy - 36, cx + 34, hy - 36, cx + 32, hy - 2); g.lineTo(cx + 26, hy - 8); g.quadraticCurveTo(cx, hy - 20, cx - 26, hy - 8); g.closePath();
  inked(g, lin(g, 0, hy - 30, 0, hy, [[0, '#4a3a42'], [1, '#141014']]), 3);
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 10, hy - 24); g.bezierCurveTo(cx + s * 40, hy - 40, cx + s * 52, hy - 70, cx + s * 38, hy - 82); g.bezierCurveTo(cx + s * 40, hy - 60, cx + s * 26, hy - 40, cx + s * 4, hy - 30); g.closePath(); inked(g, lin(g, 0, hy - 80, 0, hy - 24, [[0, '#fff6c8'], [1, gold]]), 2.4); }
  g.fillStyle = gold; circle(g, cx, hy - 26, 6); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
  // wild hair
  g.fillStyle = '#f2f2f2'; for (let i = 0; i < 7; i++) { const a = Math.PI * 0.75 + i * 0.25; g.beginPath(); g.moveTo(cx + Math.cos(a) * 26, hy + Math.sin(a) * 26); g.lineTo(cx + Math.cos(a) * 46, hy + Math.sin(a) * 40 + 10); g.lineTo(cx + Math.cos(a + 0.18) * 26, hy + Math.sin(a + 0.18) * 26); g.fill(); }
  // kanabo club arm
  const sw = pose ? -2.2 : -0.7 + step * 0.15;
  g.save(); g.translate(cx + 56, base - 116 - bob); g.rotate(sw);
  limb(g, [0, 0, 22, 30], 13, skin);
  g.beginPath(); g.moveTo(16, 30); g.lineTo(30, 30); g.lineTo(40, 120); g.lineTo(6, 120); g.closePath(); inked(g, lin(g, 6, 0, 40, 0, [[0, '#5a3a2a'], [1, '#2a1a10']]), 3);
  g.fillStyle = '#c0c6d8'; for (let i = 0; i < 6; i++) { circle(g, 12 + (i % 2) * 16, 50 + i * 12, 3.5); g.fill(); g.strokeStyle = INK; g.lineWidth = 1; g.stroke(); }
  g.restore();
  // other arm
  limb(g, [cx - 56, base - 116 - bob, cx - 70, base - 76 - bob], 12, skin); circle(g, cx - 70, base - 72 - bob, 9); inked(g, skin, 2);
}

/* ---------------- Neon Leviathan ---------------- */
function leviathan(g: Ctx, p: number, pose: number) {
  const cx = 110, base = 188; const t = p * Math.PI * 2;
  // serpentine armored body (tail → neck), drawn as tapered stroke passes
  const pts: number[] = [];
  for (let i = 0; i <= 26; i++) { const u = i / 26; pts.push(cx - 96 + u * 120 + Math.sin(u * 7 + t) * 22 * (1 - u * 0.5), base - 22 - u * 82 + Math.cos(u * 6 + t) * 16 * (1 - u)); }
  const pass = (wf: (u: number) => number, col: string | ((i: number) => string)) => {
    for (let i = 0; i < 26; i++) { const u = i / 26; g.strokeStyle = typeof col === 'string' ? col : col(i); g.lineWidth = wf(u); g.lineCap = 'round'; g.beginPath(); g.moveTo(pts[i * 2], pts[i * 2 + 1]); g.lineTo(pts[i * 2 + 2], pts[i * 2 + 3]); g.stroke(); }
  };
  pass((u) => 10 + u * 34 + 5, INK);
  pass((u) => 10 + u * 34, (i) => (i % 2 ? '#3a3f5c' : '#454b6e'));
  pass((u) => (10 + u * 34) * 0.35, 'rgba(200,210,255,.35)');
  for (let i = 1; i < 26; i += 2) { const x = pts[i * 2], y = pts[i * 2 + 1]; const u = i / 26; const r = (10 + u * 34) / 2;
    g.fillStyle = i % 4 === 1 ? '#22e5ff' : '#ff2fd0'; g.beginPath(); g.moveTo(x - 4, y - r + 2); g.lineTo(x + 1, y - r - 8 - u * 6); g.lineTo(x + 5, y - r + 2); g.fill();
    g.fillStyle = rad(g, x, y, 0, r * 0.6, [[0, i % 4 === 1 ? 'rgba(34,229,255,.9)' : 'rgba(255,47,208,.9)'], [1, 'rgba(0,0,0,0)']]); circle(g, x, y, r * 0.6); g.fill(); }
  // head
  const hx = cx + 24, hy = base - 118 + Math.sin(t) * 4;
  g.beginPath(); g.moveTo(hx - 40, hy - 10); g.lineTo(hx - 20, hy - 34); g.lineTo(hx + 30, hy - 30); g.lineTo(hx + 66, hy - 10); g.lineTo(hx + 60, hy + 2);
  g.lineTo(hx + 20, hy + (pose ? 4 : 2)); g.lineTo(hx - 34, hy + 14); g.closePath();
  inked(g, lin(g, hx, hy - 34, hx, hy + 14, [[0, '#c9d2f0'], [0.5, '#5c6585'], [1, '#22263b']]), 3);
  g.save(); g.clip(); tex(g, 101, 0.4); g.restore();
  // jaw
  g.beginPath(); g.moveTo(hx - 30, hy + 14); g.lineTo(hx + 18, hy + (pose ? 16 : 6)); g.lineTo(hx + 54, hy + (pose ? 34 : 12)); g.lineTo(hx + 14, hy + (pose ? 32 : 18)); g.closePath();
  inked(g, lin(g, 0, hy, 0, hy + 30, [[0, '#4b5275'], [1, '#141830']]), 2.6);
  if (pose) { g.fillStyle = rad(g, hx + 40, hy + 18, 0, 26, [[0, '#ffffff'], [0.4, '#22e5ff'], [1, 'rgba(34,229,255,0)']]); circle(g, hx + 40, hy + 18, 26); g.fill(); }
  g.fillStyle = '#e8f6ff'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(hx + 12 + i * 9, hy + 3); g.lineTo(hx + 16 + i * 9, hy + 11); g.lineTo(hx + 20 + i * 9, hy + 3); g.fill(); }
  // neon trims
  g.strokeStyle = '#22e5ff'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(hx - 30, hy - 6); g.lineTo(hx + 56, hy - 8); g.stroke();
  g.strokeStyle = '#ff2fd0'; g.beginPath(); g.moveTo(hx - 18, hy - 28); g.lineTo(hx + 28, hy - 24); g.stroke();
  // eye
  g.beginPath(); g.moveTo(hx + 18, hy - 18); g.lineTo(hx + 38, hy - 16); g.lineTo(hx + 22, hy - 10); g.closePath(); g.fillStyle = '#0b0f1e'; g.fill();
  glowEye(g, hx + 28, hy - 15, 3.5, '#ff2fd0');
  // fins / antenna
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(hx - 24 + i * 16, hy - 30); g.lineTo(hx - 34 + i * 16, hy - 56 + i * 4); g.lineTo(hx - 14 + i * 16, hy - 32); g.closePath(); inked(g, 'rgba(34,229,255,.55)', 1.6, '#0e5a6b'); }
}

/* ---------------- Magma Wyrm ---------------- */
function wyrm(g: Ctx, p: number, pose: number) {
  const cx = 115, base = 194; const t = p * Math.PI * 2; const flap = Math.sin(t);
  const sc = '#3a1a14';
  // wings
  for (const s of [-1, 1]) {
    g.save(); g.translate(cx + s * 18, base - 120); g.scale(s, 1); g.rotate(-0.3 - flap * 0.25);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(40, -60); g.lineTo(100, -50); g.lineTo(84, -20); g.lineTo(96, 6); g.lineTo(66, 0); g.lineTo(70, 26); g.lineTo(40, 10); g.closePath();
    inked(g, lin(g, 0, -60, 60, 26, [[0, '#7a2a18'], [0.6, '#3a1008'], [1, '#1c0804']]), 2.8);
    g.strokeStyle = '#ff6a1a'; g.lineWidth = 1.6; line(g, 4, 0, 40, -58); line(g, 40, -58, 84, -20); line(g, 40, -58, 66, 0);
    g.restore();
  }
  // tail
  g.beginPath(); g.moveTo(cx - 30, base - 40); g.quadraticCurveTo(cx - 90, base - 30 + flap * 6, cx - 104, base - 70); g.quadraticCurveTo(cx - 86, base - 40, cx - 26, base - 26); g.closePath(); inked(g, lin(g, 0, base - 70, 0, base - 26, [[0, '#5a2a1a'], [1, sc]]), 2.6);
  // legs
  for (const s of [-1, 1]) limb(g, [cx + s * 22, base - 50, cx + s * 30 + flap * s * 3, base - 4], 13, sc);
  // body
  ellipse(g, cx, base - 66, 52, 38); inked(g, lin(g, 0, base - 104, 0, base - 28, [[0, '#6a2e1e'], [1, '#22100a']]), 3.2);
  g.save(); ellipse(g, cx, base - 66, 52, 38); g.clip(); tex(g, 111, 0.8);
  g.strokeStyle = '#ff6a1a'; g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(cx - 44 + i * 20, base - 98); g.lineTo(cx - 38 + i * 18, base - 70); g.lineTo(cx - 46 + i * 22, base - 40); g.stroke(); }
  g.strokeStyle = '#ffe08a'; g.lineWidth = 1; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(cx - 44 + i * 20, base - 98); g.lineTo(cx - 38 + i * 18, base - 70); g.stroke(); }
  // belly plates
  g.fillStyle = '#c9773a'; for (let i = 0; i < 4; i++) { ellipse(g, cx + 8, base - 84 + i * 13, 20 - i * 2, 5); g.fill(); }
  g.restore();
  // neck + head
  limb(g, [cx + 22, base - 90, cx + 46, base - 140], 22, '#4a2014');
  const hx = cx + 52, hy = base - 150 + (pose ? -4 : 0);
  g.beginPath(); g.moveTo(hx - 24, hy - 6); g.quadraticCurveTo(hx - 10, hy - 26, hx + 22, hy - 18); g.lineTo(hx + 48, hy - 4); g.lineTo(hx + 44, hy + 6); g.lineTo(hx + 10, hy + (pose ? 4 : 10)); g.lineTo(hx - 20, hy + 12); g.closePath();
  inked(g, lin(g, 0, hy - 26, 0, hy + 12, [[0, '#7a3420'], [1, '#2a100a']]), 3);
  if (pose) { g.beginPath(); g.moveTo(hx - 10, hy + 10); g.lineTo(hx + 40, hy + 8); g.lineTo(hx + 30, hy + 26); g.closePath(); inked(g, '#2a100a', 2.4); g.fillStyle = rad(g, hx + 46, hy + 14, 0, 30, [[0, '#fffbe0'], [0.3, '#ffb000'], [1, 'rgba(255,60,0,0)']]); circle(g, hx + 46, hy + 14, 30); g.fill(); }
  for (const s of [0, 1]) { g.beginPath(); g.moveTo(hx - 8 + s * 10, hy - 16); g.quadraticCurveTo(hx - 30 + s * 6, hy - 40, hx - 44 + s * 4, hy - 36); g.quadraticCurveTo(hx - 24 + s * 6, hy - 30, hx - 14 + s * 10, hy - 10); inked(g, lin(g, 0, hy - 40, 0, hy - 10, [[0, '#fff3c0'], [1, '#a07040']]), 2); }
  animeEyeBig(g, hx + 14, hy - 8, 1, '#ffde59');
  g.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(hx + 12 + i * 8, hy + 6); g.lineTo(hx + 15 + i * 8, hy + 13); g.lineTo(hx + 18 + i * 8, hy + 6); g.fill(); }
  glowEye(g, hx + 44, hy - 2, 2, '#ff6a1a');
}

interface Spec { w: number; h: number; ax: number; ay: number; r: number; ox: number; oy: number; fn: (g: Ctx, p: number, pose: number) => void }
const SPECS: Record<string, Spec> = {
  colossus: { w: 174, h: 168, ax: 75, ay: 148, ox: 12, oy: 18, r: 46, fn: colossus },
  ninetails: { w: 196, h: 140, ax: 82, ay: 128, ox: 12, oy: 4, r: 38, fn: ninetails },
  mecha: { w: 150, h: 176, ax: 70, ay: 148, ox: 6, oy: 22, r: 40, fn: mecha },
  oni: { w: 280, h: 262, ax: 95, ay: 198, ox: 10, oy: 58, r: 58, fn: oni },
  leviathan: { w: 260, h: 200, ax: 110, ay: 188, ox: 40, oy: 6, r: 60, fn: leviathan },
  wyrm: { w: 268, h: 232, ax: 115, ay: 196, ox: 14, oy: 30, r: 62, fn: wyrm },
};
const cache = new Map<string, { run: Frame[]; pose: Frame[] }>();
export function bossSprites(id: string) {
  let c = cache.get(id); if (c) return c;
  const S = SPECS[id] || SPECS.colossus;
  const run: Frame[] = [], pose: Frame[] = [];
  for (let i = 0; i < 4; i++) run.push(renderFrame(S.w, S.h, S.ax + S.ox, S.ay + S.oy, (g) => { g.translate(S.ox, S.oy); S.fn(g, i / 4, 0); }));
  for (let i = 0; i < 2; i++) pose.push(renderFrame(S.w, S.h, S.ax + S.ox, S.ay + S.oy, (g) => { g.translate(S.ox, S.oy); S.fn(g, i / 2, 1); }));
  c = { run, pose }; cache.set(id, c); return c;
}
export const BOSS_IDS = Object.keys(SPECS);

export function drawBoss(g: CanvasRenderingContext2D, e: Enemy, now: number) {
  const S = SPECS[e.def.id] || SPECS.colossus; const spr = bossSprites(e.def.id);
  const attacking = e.st >= 1 || e.cd < 0.5;
  const f = attacking ? spr.pose[Math.floor(now / 140) & 1] : spr.run[Math.floor(e.anim * 0.6) & 3];
  const sc = e.r / S.r * (e.spawnT > 0 ? 1 - e.spawnT / 0.35 * 0.6 : 1);
  // aura
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 + 0.1 * Math.sin(now * 0.004);
  const gs = e.r * 5; g.drawImage(tintedGlow(e.rank >= 3 ? '#ff4d5e' : '#ffb000'), e.x - gs / 2, e.y - e.r * 1.6 - gs / 2, gs, gs);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  const flip = e.face < 0;
  g.save(); g.translate(e.x, e.y); if (flip) g.scale(-1, 1);
  g.drawImage(f.c, -f.ax * sc, -f.ay * sc, f.w * sc, f.h * sc);
  if (e.flash > 0 && f.white) { g.globalAlpha = Math.min(0.8, e.flash * 7); g.drawImage(f.white, -f.ax * sc, -f.ay * sc, f.w * sc, f.h * sc); g.globalAlpha = 1; }
  g.restore();
  if (e.stunT > 0) { g.fillStyle = '#ffd166'; for (let k = 0; k < 4; k++) { const a = now * 0.005 + k * 1.57; g.beginPath(); g.arc(e.x + Math.cos(a) * e.r, e.y - e.r * 2.6 + Math.sin(a) * 6, 4, 0, 7); g.fill(); } }
  if (e.shield > 0) shieldBubble(g, e, now);
}
function shieldBubble(g: CanvasRenderingContext2D, e: Enemy, now: number) {
  const R = e.r * 2.1, cx = e.x, cy = e.y - e.r * 1.3;
  g.save(); g.globalCompositeOperation = 'lighter';
  const a = 0.25 + e.shield * 0.45;
  const gr = g.createRadialGradient(cx, cy, R * 0.6, cx, cy, R);
  gr.addColorStop(0, 'rgba(76,201,240,0)'); gr.addColorStop(0.85, `rgba(76,201,240,${a * 0.5})`); gr.addColorStop(1, `rgba(200,250,255,${a})`);
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  // hex lattice
  g.strokeStyle = `rgba(180,245,255,${a * 0.8})`; g.lineWidth = 1.5;
  const hs = 16; const rot = now * 0.0004;
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
    const hx = i * hs * 1.5, hy = (j + (i & 1) * 0.5) * hs * 1.732;
    const x = cx + hx * Math.cos(rot) - hy * Math.sin(rot), y = cy + hx * Math.sin(rot) + hy * Math.cos(rot);
    const d = Math.hypot(x - cx, y - cy); if (d > R * 0.95) continue;
    if (((i * 7 + j * 13) % 5 + 5) % 5 >= e.shield * 5 + 0.5) continue; // cracks appear as the shield drops
    g.beginPath(); for (let k = 0; k < 6; k++) { const aa = k * Math.PI / 3; g.lineTo(x + Math.cos(aa) * hs * 0.55, y + Math.sin(aa) * hs * 0.55); } g.closePath(); g.stroke();
  }
  g.restore();
  void shade; void line;
}

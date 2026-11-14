/**
 * Procedural enemy sprites. One silhouette per archetype, re-dressed per arena theme
 * (sakura = folklore spirits, neon = rogue machines, volcano = demons).
 * Each enemy gets 4 run frames + 2 pose frames (windup / attack), with auto white hit-flash.
 */
import { Ctx, Frame, renderFrame, shade, lin, rad, inked, ellipse, circle, limb, line, rgba, noiseTex, textureAtop, INK } from './common';

export type Theme = 'sakura' | 'neon' | 'volcano';
export interface EnemySprites { run: Frame[]; pose: Frame[]; scale: number; fly: number }

const PAL: Record<Theme, { a: string; b: string; c: string; glow: string; eye: string; metal: string }> = {
  sakura: { a: '#f2e6d0', b: '#c23b4e', c: '#5d8a40', glow: '#9ff0ff', eye: '#1a0f24', metal: '#8e8a86' },
  neon: { a: '#3a3f5c', b: '#22e5ff', c: '#ff2fd0', glow: '#22e5ff', eye: '#22e5ff', metal: '#6b7394' },
  volcano: { a: '#4a2622', b: '#ff6a1a', c: '#1c1110', glow: '#ff6a1a', eye: '#ffde59', metal: '#2b2020' },
};

function glowDot(g: Ctx, x: number, y: number, r: number, col: string) {
  g.fillStyle = rad(g, x, y, 0, r * 2.4, [[0, col], [0.35, rgba(col, 0.5)], [1, rgba(col, 0)]]); circle(g, x, y, r * 2.4); g.fill();
  g.fillStyle = '#fff'; circle(g, x, y, r * 0.55); g.fill();
}
function animeEye(g: Ctx, x: number, y: number, s: number, iris: string, angry = true) {
  ellipse(g, x, y, 2.6 * s, 3 * s); inked(g, '#fff', 1);
  ellipse(g, x + 0.3 * s, y + 0.4 * s, 1.8 * s, 2.3 * s); g.fillStyle = iris; g.fill();
  ellipse(g, x + 0.4 * s, y + 0.6 * s, 0.9 * s, 1.3 * s); g.fillStyle = INK; g.fill();
  circle(g, x - 0.6 * s, y - 0.8 * s, 0.7 * s); g.fillStyle = '#fff'; g.fill();
  if (angry) { g.strokeStyle = INK; g.lineWidth = 1.3; line(g, x - 3 * s, y - 3.6 * s, x + 2.6 * s, y - 2.2 * s); }
}
function texture(g: Ctx, seed: number, a = 0.4) { textureAtop(g, noiseTex(64, seed, 5, a)); }

/* ---------------- archetypes ---------------- */

function gnat(g: Ctx, T: Theme, p: number) {
  const P = PAL[T]; const cx = 20, cy = 18; const flap = Math.sin(p * Math.PI * 2);
  // wings
  for (const side of [-1, 1]) {
    g.save(); g.translate(cx + side * 4, cy - 2); g.scale(side, 1); g.rotate(-0.5 + flap * 0.55);
    g.beginPath();
    if (T === 'volcano') { g.moveTo(0, 0); g.lineTo(14, -9); g.lineTo(12, -2); g.lineTo(16, 1); g.lineTo(9, 3); g.closePath(); inked(g, lin(g, 0, -8, 0, 4, [[0, '#6b1d1d'], [1, '#2b0b0b']]), 1.3); }
    else if (T === 'neon') { g.ellipse(9, -2, 9, 3.4, -0.2, 0, 7); inked(g, 'rgba(34,229,255,.35)', 1.1, '#0e5a6b'); g.strokeStyle = 'rgba(160,250,255,.8)'; g.lineWidth = 0.6; line(g, 2, -1, 16, -4); }
    else { g.moveTo(0, 0); g.quadraticCurveTo(10, -12, 16, -3); g.quadraticCurveTo(9, 2, 0, 1); g.closePath(); inked(g, lin(g, 0, -10, 10, 2, [[0, '#a9e58a'], [1, '#4f8a35']]), 1.2); g.strokeStyle = 'rgba(30,70,20,.7)'; g.lineWidth = 0.7; line(g, 1, 0, 13, -4); }
    g.restore();
  }
  // body
  circle(g, cx, cy, 8.5);
  if (T === 'neon') { inked(g, lin(g, cx, cy - 8, cx, cy + 8, [[0, '#8a93b8'], [0.5, '#4b5275'], [1, '#22263b']]), 1.8); g.fillStyle = '#0b0f1e'; ellipse(g, cx + 1, cy, 6, 3.2); g.fill(); glowDot(g, cx + 2, cy, 1.6, P.glow); g.strokeStyle = '#ff2fd0'; g.lineWidth = 1; line(g, cx - 6, cy + 5, cx + 6, cy + 5); }
  else if (T === 'volcano') { inked(g, rad(g, cx - 2, cy - 3, 1, 10, [[0, '#ff7b54'], [1, '#8a1c12']]), 1.8); texture(g, 4); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 4, cy - 6); g.lineTo(cx + s * 7, cy - 13); g.lineTo(cx + s * 7.5, cy - 5); inked(g, '#2a1410', 1); } animeEye(g, cx + 2, cy, 1, '#ffde59'); g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - 2, cy + 5); g.lineTo(cx, cy + 4); g.lineTo(cx + 2, cy + 5.5); g.lineTo(cx + 4, cy + 4); g.stroke(); }
  else { inked(g, rad(g, cx - 2, cy - 3, 1, 10, [[0, '#ffffff'], [1, '#c9dcc0']]), 1.8); g.fillStyle = INK; ellipse(g, cx - 2.6, cy - 1, 1.8, 2.5); g.fill(); ellipse(g, cx + 3, cy - 1, 1.8, 2.5); g.fill(); ellipse(g, cx, cy + 4, 1.3, 1.6); g.fill(); g.fillStyle = 'rgba(255,150,170,.5)'; ellipse(g, cx - 5, cy + 2.4, 1.6, 0.8); g.fill(); ellipse(g, cx + 5, cy + 2.4, 1.6, 0.8); g.fill(); }
  // dangling legs
  g.strokeStyle = INK; g.lineWidth = 1.2; line(g, cx - 2, cy + 8, cx - 3, cy + 11 + flap); line(g, cx + 2, cy + 8, cx + 3, cy + 11 - flap);
}

function goblin(g: Ctx, T: Theme, p: number, pose = 0) {
  const P = PAL[T]; const cx = 22; const step = Math.sin(p * Math.PI * 2); const bob = Math.abs(step) * 1.2;
  const skin = T === 'sakura' ? '#e8b48a' : T === 'neon' ? '#9aa3c7' : '#7d7470';
  // legs
  limb(g, [cx - 3, 30 - bob, cx - 4 - step * 3, 39], 3.6, shade(skin, -40));
  limb(g, [cx + 3, 30 - bob, cx + 4 + step * 3, 39], 3.6, shade(skin, -20));
  // body
  g.beginPath(); g.moveTo(cx - 7, 31 - bob); g.quadraticCurveTo(cx - 8, 20 - bob, cx, 19 - bob); g.quadraticCurveTo(cx + 8, 20 - bob, cx + 7, 31 - bob); g.closePath();
  const cloth = T === 'sakura' ? '#3f5d9e' : T === 'neon' ? '#2a2440' : '#3a1d18';
  inked(g, lin(g, cx - 7, 0, cx + 7, 0, [[0, shade(cloth, 25)], [1, shade(cloth, -30)]]), 1.6);
  if (T === 'neon') { g.strokeStyle = '#ff2fd0'; g.lineWidth = 1; line(g, cx - 5, 26 - bob, cx + 5, 26 - bob); } else { g.strokeStyle = shade(cloth, 50); g.lineWidth = 1; line(g, cx, 20 - bob, cx, 31 - bob); }
  // weapon arm
  const swing = pose ? -1.4 : step * 0.4;
  g.save(); g.translate(cx + 6, 23 - bob); g.rotate(swing);
  if (T === 'sakura') { limb(g, [0, 0, 6, 4], 2.8, skin); g.strokeStyle = INK; g.lineWidth = 3.2; line(g, 6, 4, 12, -8); g.strokeStyle = '#d9c38b'; g.lineWidth = 2; line(g, 6, 4, 12, -8); g.fillStyle = '#7ec850'; ellipse(g, 12.6, -9.5, 3, 4.5, 0.4); g.fill(); }
  else if (T === 'neon') { limb(g, [0, 0, 6, 4], 2.8, skin); g.strokeStyle = INK; g.lineWidth = 3.5; line(g, 6, 4, 13, -6); g.strokeStyle = '#ff2fd0'; g.lineWidth = 2; line(g, 6, 4, 13, -6); glowDot(g, 13, -6, 1.2, '#ff2fd0'); }
  else { limb(g, [0, 0, 6, 4], 2.8, skin); g.beginPath(); g.moveTo(6, 4); g.lineTo(12, -7); g.lineTo(14.5, -5); g.lineTo(8, 5); g.closePath(); inked(g, lin(g, 6, 0, 14, 0, [[0, '#ff9f43'], [1, '#7a1b0c']]), 1.2); }
  g.restore();
  // head
  const hy = 13 - bob;
  circle(g, cx, hy, 9);
  inked(g, rad(g, cx - 2, hy - 3, 1, 11, [[0, shade(skin, 25)], [1, shade(skin, -25)]]), 1.8);
  if (T === 'sakura') {
    // tengu mask nose + straw hat
    g.beginPath(); g.moveTo(cx + 3, hy + 1); g.quadraticCurveTo(cx + 13, hy - 1, cx + 15, hy + 2); g.quadraticCurveTo(cx + 9, hy + 4, cx + 3, hy + 4); g.closePath(); inked(g, lin(g, cx, hy, cx + 14, hy, [[0, '#ff5a4f'], [1, '#b21f2d']]), 1.4);
    animeEye(g, cx + 1, hy - 1, 0.9, '#ffd166');
    g.beginPath(); g.moveTo(cx - 14, hy - 4); g.quadraticCurveTo(cx, hy - 16, cx + 14, hy - 4); g.closePath(); inked(g, lin(g, 0, hy - 14, 0, hy - 4, [[0, '#f0d58c'], [1, '#a8823c']]), 1.6);
    g.strokeStyle = 'rgba(90,60,20,.6)'; g.lineWidth = 0.6; for (let i = -10; i <= 10; i += 4) line(g, cx, hy - 13, cx + i, hy - 5);
  } else if (T === 'neon') {
    g.fillStyle = '#0b0f1e'; g.beginPath(); g.roundRect(cx - 6, hy - 3, 13, 5, 2); g.fill();
    g.fillStyle = lin(g, cx - 6, 0, cx + 7, 0, [[0, '#22e5ff'], [1, '#ff2fd0']]); g.fillRect(cx - 4, hy - 1.5, 10, 2);
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(cx + i * 2.6 - 1.4, hy - 8); g.lineTo(cx + i * 2.6, hy - 15 + Math.abs(i)); g.lineTo(cx + i * 2.6 + 1.4, hy - 8); inked(g, i % 2 ? '#ff2fd0' : '#22e5ff', 0.8); }
    g.strokeStyle = INK; g.lineWidth = 1; line(g, cx - 9, hy + 1, cx - 13, hy - 3); glowDot(g, cx - 13, hy - 3, 1, '#5ef38c');
  } else {
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 5, hy - 6); g.quadraticCurveTo(cx + s * 12, hy - 12, cx + s * 9, hy - 18); g.quadraticCurveTo(cx + s * 7, hy - 11, cx + s * 2, hy - 8); inked(g, lin(g, 0, hy - 18, 0, hy - 6, [[0, '#ffde59'], [1, '#2a1410']]), 1.1); }
    animeEye(g, cx + 2, hy, 0.9, '#ff6a1a'); g.strokeStyle = '#ff6a1a'; g.lineWidth = 0.8; line(g, cx - 6, hy + 2, cx - 3, hy + 6);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx + 1, hy + 5); g.lineTo(cx + 2, hy + 7); g.lineTo(cx + 3, hy + 5); g.fill();
  }
  // ear
  g.beginPath(); g.moveTo(cx - 7, hy); g.lineTo(cx - 14, hy - 4); g.lineTo(cx - 8, hy + 4); inked(g, shade(skin, -10), 1.2);
  void P;
}

function golem(g: Ctx, T: Theme, p: number, pose = 0) {
  const cx = 34, base = 70; const step = Math.sin(p * Math.PI * 2); const bob = Math.abs(step) * 1.5;
  const stone = T === 'sakura' ? '#8f8d84' : T === 'neon' ? '#4b5275' : '#3a2826';
  // legs
  for (const s of [-1, 1]) { g.beginPath(); g.roundRect(cx + s * 10 - 6 + (s === 1 ? step : -step) * 2, base - 16, 12, 16, 4); inked(g, lin(g, 0, base - 16, 0, base, [[0, shade(stone, 10)], [1, shade(stone, -40)]]), 2); }
  // torso boulder
  g.beginPath(); g.moveTo(cx - 22, base - 14 - bob); g.quadraticCurveTo(cx - 26, base - 44 - bob, cx - 8, base - 50 - bob); g.quadraticCurveTo(cx + 18, base - 54 - bob, cx + 24, base - 34 - bob); g.quadraticCurveTo(cx + 24, base - 12 - bob, cx - 22, base - 14 - bob); g.closePath();
  inked(g, lin(g, cx - 20, base - 52, cx + 20, base - 12, [[0, shade(stone, 40)], [0.5, stone], [1, shade(stone, -45)]]), 2.6);
  g.save(); g.clip(); texture(g, 17, 0.7);
  // cracks
  g.strokeStyle = T === 'volcano' ? '#ff6a1a' : T === 'neon' ? '#22e5ff' : 'rgba(30,25,20,.6)'; g.lineWidth = T === 'sakura' ? 1 : 1.6;
  g.beginPath(); g.moveTo(cx - 12, base - 46 - bob); g.lineTo(cx - 6, base - 34 - bob); g.lineTo(cx - 12, base - 24 - bob); g.moveTo(cx + 10, base - 48 - bob); g.lineTo(cx + 4, base - 36 - bob); g.lineTo(cx + 12, base - 22 - bob); g.stroke();
  if (T === 'volcano') { g.strokeStyle = '#ffe08a'; g.lineWidth = 0.6; g.stroke(); }
  g.restore();
  if (T === 'sakura') { // moss cap + flowers
    g.beginPath(); g.moveTo(cx - 20, base - 40 - bob); g.quadraticCurveTo(cx - 6, base - 58 - bob, cx + 20, base - 42 - bob); g.quadraticCurveTo(cx + 6, base - 44 - bob, cx - 20, base - 40 - bob); inked(g, lin(g, 0, base - 56, 0, base - 40, [[0, '#9fd36b'], [1, '#3f7a2c']]), 1.6);
    for (const [fx, fy] of [[-10, -50], [4, -53], [14, -46]]) { for (let k = 0; k < 5; k++) { g.fillStyle = '#ffb3d1'; circle(g, cx + fx + Math.cos(k * 1.26) * 1.8, base + fy - bob + Math.sin(k * 1.26) * 1.8, 1.4); g.fill(); } g.fillStyle = '#ffd166'; circle(g, cx + fx, base + fy - bob, 1); g.fill(); }
  } else if (T === 'neon') { // riot visor + plates
    g.beginPath(); g.roundRect(cx - 14, base - 44 - bob, 28, 9, 4); inked(g, '#0b0f1e', 1.6);
    g.fillStyle = lin(g, cx - 14, 0, cx + 14, 0, [[0, '#ff2fd0'], [1, '#22e5ff']]); g.fillRect(cx - 11, base - 41 - bob, 22, 3);
    g.fillStyle = '#ffd166'; g.fillRect(cx - 4, base - 28 - bob, 8, 3);
  }
  // eyes
  if (T !== 'neon') { glowDot(g, cx - 7, base - 38 - bob, 2, T === 'volcano' ? '#ffde59' : '#9ff0ff'); glowDot(g, cx + 7, base - 38 - bob, 2, T === 'volcano' ? '#ffde59' : '#9ff0ff'); }
  // arms
  const ar = pose ? -0.9 : step * 0.25;
  for (const s of [-1, 1]) {
    g.save(); g.translate(cx + s * 22, base - 38 - bob); g.rotate(s * (0.2 + (s === 1 ? ar : -ar)));
    g.beginPath(); g.roundRect(-6, 0, 12, 24, 5); inked(g, lin(g, -6, 0, 6, 0, [[0, shade(stone, 25)], [1, shade(stone, -35)]]), 2);
    circle(g, 0, 26, 8); inked(g, rad(g, -2, 23, 1, 9, [[0, shade(stone, 30)], [1, shade(stone, -40)]]), 2);
    g.restore();
  }
}

function boar(g: Ctx, T: Theme, p: number, pose = 0) {
  const cx = 30, base = 42; const step = Math.sin(p * Math.PI * 2);
  const fur = T === 'sakura' ? '#7a4a2a' : T === 'neon' ? '#4b5275' : '#2b1410';
  const crouch = pose ? 3 : 0;
  // legs
  const legs: [number, number][] = [[-13, 1], [-7, -1], [8, 1], [14, -1]];
  for (const [lx, ph] of legs) limb(g, [cx + lx, base - 12 + crouch, cx + lx + step * ph * 3, base - 1], 3.6, shade(fur, -30));
  if (T === 'neon') { // hover thrusters
    for (const lx of [-12, 12]) { g.fillStyle = rad(g, cx + lx, base, 0, 8, [[0, 'rgba(34,229,255,.9)'], [1, 'rgba(34,229,255,0)']]); ellipse(g, cx + lx, base - 1, 8, 3); g.fill(); }
  }
  // body
  g.beginPath(); g.ellipse(cx, base - 18 + crouch, 19, 12, 0, 0, 7);
  inked(g, lin(g, 0, base - 30, 0, base - 6, [[0, shade(fur, 35)], [1, shade(fur, -35)]]), 2.2);
  g.save(); g.clip(); texture(g, 23, 0.6);
  if (T === 'neon') { g.strokeStyle = '#22e5ff'; g.lineWidth = 1.2; line(g, cx - 14, base - 16, cx + 12, base - 20); g.strokeStyle = '#ff2fd0'; line(g, cx - 14, base - 12, cx + 10, base - 14); }
  g.restore();
  // mane / bristles
  g.beginPath(); for (let i = 0; i <= 8; i++) { const x = cx - 14 + i * 3.6; g.lineTo(x, base - 29 + crouch - (i % 2 ? 6 : 0) - (T === 'volcano' ? (i % 2 ? 4 : 0) : 0)); } g.lineTo(cx + 15, base - 24 + crouch); g.lineTo(cx - 16, base - 22 + crouch); g.closePath();
  inked(g, T === 'volcano' ? lin(g, 0, base - 40, 0, base - 22, [[0, '#ffe08a'], [0.4, '#ff6a1a'], [1, '#7a1b0c']]) : T === 'neon' ? '#ff2fd0' : shade(fur, -45), 1.4);
  // head
  g.beginPath(); g.moveTo(cx + 12, base - 26 + crouch); g.quadraticCurveTo(cx + 27, base - 26 + crouch, cx + 30, base - 14 + crouch); g.quadraticCurveTo(cx + 26, base - 7 + crouch, cx + 14, base - 9 + crouch); g.closePath();
  inked(g, lin(g, cx + 12, 0, cx + 30, 0, [[0, shade(fur, 20)], [1, shade(fur, -20)]]), 2);
  ellipse(g, cx + 29, base - 14 + crouch, 3.4, 4); inked(g, T === 'neon' ? '#22e5ff' : '#e8a0a0', 1.2);
  // tusk
  g.beginPath(); g.moveTo(cx + 25, base - 10 + crouch); g.quadraticCurveTo(cx + 31, base - 12 + crouch, cx + 31, base - 20 + crouch); g.quadraticCurveTo(cx + 28, base - 13 + crouch, cx + 24, base - 12 + crouch); inked(g, '#fff6e0', 1.1);
  animeEye(g, cx + 20, base - 19 + crouch, 0.8, T === 'volcano' ? '#ffde59' : '#ff4d5e');
  // ear
  g.beginPath(); g.moveTo(cx + 13, base - 25 + crouch); g.lineTo(cx + 15, base - 33 + crouch); g.lineTo(cx + 18, base - 25 + crouch); inked(g, shade(fur, -10), 1.2);
  if (T === 'sakura') { g.strokeStyle = '#f0e2b6'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(cx - 2, base - 29); g.quadraticCurveTo(cx, base - 18, cx + 3, base - 8); g.stroke(); g.fillStyle = '#fff'; for (const k of [0, 1]) { g.beginPath(); g.moveTo(cx + k * 2, base - 20 + k * 5); g.lineTo(cx + 4 + k * 2, base - 17 + k * 5); g.lineTo(cx + 2 + k * 2, base - 14 + k * 5); g.fill(); } }
  // tail
  g.strokeStyle = INK; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx - 19, base - 20); g.quadraticCurveTo(cx - 24, base - 26 + step * 2, cx - 22, base - 18); g.stroke();
  if (pose) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.2; for (let i = 0; i < 3; i++) line(g, cx - 26 - i * 3, base - 24 + i * 6, cx - 34 - i * 3, base - 24 + i * 6); }
}

function wisp(g: Ctx, T: Theme, p: number, pose = 0) {
  const cx = 22, cy = 20; const f = Math.sin(p * Math.PI * 2);
  if (T === 'neon') {
    // holo turret: floating diamond with ring
    g.save(); g.translate(cx, cy + f * 1.5);
    g.strokeStyle = 'rgba(34,229,255,.6)'; g.lineWidth = 1.2; ellipse(g, 0, 6, 15, 4.5); g.stroke();
    g.beginPath(); g.moveTo(0, -14); g.lineTo(10, 0); g.lineTo(0, 12); g.lineTo(-10, 0); g.closePath();
    inked(g, lin(g, -10, -14, 10, 12, [[0, '#a7b4ff'], [0.5, '#3a3f5c'], [1, '#141830']]), 1.8);
    g.fillStyle = 'rgba(255,47,208,.85)'; g.beginPath(); g.moveTo(0, -8); g.lineTo(5, 0); g.lineTo(0, 7); g.lineTo(-5, 0); g.fill();
    glowDot(g, 0, 0, pose ? 3 : 2, pose ? '#ffffff' : '#22e5ff');
    g.restore(); return;
  }
  // flame body
  const c1 = T === 'sakura' ? '#9ff0ff' : '#ffde59', c2 = T === 'sakura' ? '#3b6cff' : '#ff3d00';
  g.beginPath(); g.moveTo(cx - 10, cy + 2);
  g.quadraticCurveTo(cx - 12, cy - 12, cx - 2 + f * 2, cy - 22);
  g.quadraticCurveTo(cx + 2, cy - 14, cx + 8 - f, cy - 18);
  g.quadraticCurveTo(cx + 13, cy - 6, cx + 10, cy + 2);
  g.quadraticCurveTo(cx + 9, cy + 12, cx, cy + 12); g.quadraticCurveTo(cx - 9, cy + 12, cx - 10, cy + 2); g.closePath();
  g.save(); g.shadowColor = c2; g.shadowBlur = 10; inked(g, rad(g, cx, cy + 3, 1, 18, [[0, '#ffffff'], [0.3, c1], [1, c2]]), 1.6, shade(c2, -60)); g.restore();
  // tail wisps
  g.strokeStyle = rgba(c1, 0.6); g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 6, cy + 10); g.quadraticCurveTo(cx - 14, cy + 16 + f * 3, cx - 20, cy + 12); g.stroke();
  if (T === 'volcano') { // eyeball
    circle(g, cx, cy + 2, 6.5); inked(g, rad(g, cx - 2, cy, 1, 7, [[0, '#fff'], [1, '#f0c8b0']]), 1.4);
    circle(g, cx + 1, cy + 2, 3.4); g.fillStyle = pose ? '#ff3d00' : '#ffb000'; g.fill(); circle(g, cx + 1.4, cy + 2, 1.6); g.fillStyle = INK; g.fill();
    g.strokeStyle = 'rgba(200,0,0,.6)'; g.lineWidth = 0.5; line(g, cx - 5, cy - 1, cx - 2, cy + 1); line(g, cx - 4, cy + 6, cx - 1, cy + 4);
  } else {
    g.fillStyle = INK; ellipse(g, cx - 3, cy + 2, 1.6, 2.6); g.fill(); ellipse(g, cx + 3.5, cy + 2, 1.6, 2.6); g.fill();
    g.fillStyle = '#fff'; circle(g, cx - 3.4, cy + 1, 0.6); g.fill(); circle(g, cx + 3.1, cy + 1, 0.6); g.fill();
    if (pose) { g.fillStyle = INK; ellipse(g, cx + 0.5, cy + 7, 2, 1.6); g.fill(); }
  }
}

function slime(g: Ctx, T: Theme, p: number, _pose = 0, small = false) {
  const s = small ? 0.62 : 1; const cx = 24 * s + 2, base = 34 * s + 2; const sq = Math.sin(p * Math.PI * 2) * 0.08;
  const w = 20 * s * (1 + sq), h = 22 * s * (1 - sq);
  const [c0, c1, c2] = T === 'sakura' ? ['#ffffff', '#fbe7ef', '#e8b7c9'] : T === 'neon' ? ['#d6ffb0', '#5ef38c', '#138a4a'] : ['#ffe08a', '#ff6a1a', '#7a1b0c'];
  g.beginPath(); g.moveTo(cx - w, base); g.bezierCurveTo(cx - w, base - h * 1.1, cx + w, base - h * 1.1, cx + w, base); g.quadraticCurveTo(cx, base + 3 * s, cx - w, base); g.closePath();
  if (T === 'neon') { g.save(); g.shadowColor = '#5ef38c'; g.shadowBlur = 8; }
  inked(g, rad(g, cx - w * 0.3, base - h * 0.7, 1, w * 1.4, [[0, c0], [0.5, c1], [1, c2]]), 2, T === 'volcano' ? '#2b0b0b' : INK);
  if (T === 'neon') g.restore();
  g.save(); g.clip();
  if (T === 'neon') { g.strokeStyle = 'rgba(10,60,30,.7)'; g.lineWidth = 0.8; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(cx - w + i * 9 * s, base); g.lineTo(cx - w + i * 9 * s, base - 8 * s); g.lineTo(cx - w + 4 * s + i * 9 * s, base - 12 * s); g.stroke(); } }
  if (T === 'volcano') { g.fillStyle = 'rgba(40,10,5,.7)'; for (let i = 0; i < 5; i++) { ellipse(g, cx - w * 0.6 + i * w * 0.32, base - h * 0.85 + (i % 2) * 3, 4 * s, 2.4 * s); g.fill(); } }
  g.fillStyle = 'rgba(255,255,255,.6)'; ellipse(g, cx - w * 0.45, base - h * 0.7, w * 0.22, h * 0.12, -0.5); g.fill();
  g.restore();
  // face
  const fy = base - h * 0.45;
  if (T === 'sakura') { g.fillStyle = INK; ellipse(g, cx - 5 * s, fy, 1.5 * s, 2 * s); g.fill(); ellipse(g, cx + 5 * s, fy, 1.5 * s, 2 * s); g.fill(); g.fillStyle = 'rgba(255,120,150,.55)'; ellipse(g, cx - 8 * s, fy + 3 * s, 2.2 * s, 1.2 * s); g.fill(); ellipse(g, cx + 8 * s, fy + 3 * s, 2.2 * s, 1.2 * s); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.9; g.beginPath(); g.arc(cx, fy + 2 * s, 1.6 * s, 0.2, Math.PI - 0.2); g.stroke();
    g.beginPath(); g.ellipse(cx + 4 * s, base - h * 1.02, 4 * s, 2 * s, -0.5, 0, 7); inked(g, '#ff8fb8', 0.8); }
  else { animeEye(g, cx - 4.5 * s, fy, 0.8 * s, T === 'neon' ? '#ff2fd0' : '#ffde59'); animeEye(g, cx + 4.5 * s, fy, 0.8 * s, T === 'neon' ? '#ff2fd0' : '#ffde59'); }
}

function knight(g: Ctx, T: Theme, p: number, pose = 0) {
  const cx = 26, base = 57; const step = Math.sin(p * Math.PI * 2); const bob = Math.abs(step);
  const armor = T === 'sakura' ? '#3b2a26' : T === 'neon' ? '#3a3f5c' : '#1d1418';
  const trim = T === 'sakura' ? '#c23b4e' : T === 'neon' ? '#22e5ff' : '#ff6a1a';
  limb(g, [cx - 4, base - 14 - bob, cx - 5 - step * 3, base - 1], 4.4, shade(armor, -20));
  limb(g, [cx + 4, base - 14 - bob, cx + 5 + step * 3, base - 1], 4.4, armor);
  // torso
  g.beginPath(); g.roundRect(cx - 9, base - 32 - bob, 18, 20, 4); inked(g, lin(g, cx - 9, 0, cx + 9, 0, [[0, shade(armor, 40)], [1, shade(armor, -30)]]), 2);
  g.save(); g.clip(); g.strokeStyle = trim; g.lineWidth = 1; for (let i = 0; i < 3; i++) line(g, cx - 9, base - 27 + i * 5 - bob, cx + 9, base - 27 + i * 5 - bob); texture(g, 31, 0.5); g.restore();
  // head + helmet
  const hy = base - 39 - bob;
  circle(g, cx, hy, 7); inked(g, T === 'neon' ? '#141830' : '#e8c8a8', 1.6);
  if (T === 'sakura') { g.beginPath(); g.moveTo(cx - 15, hy - 1); g.quadraticCurveTo(cx, hy - 14, cx + 15, hy - 1); g.closePath(); inked(g, lin(g, 0, hy - 13, 0, hy, [[0, '#4a4a4a'], [1, '#141414']]), 1.6); circle(g, cx, hy - 6, 2); g.fillStyle = trim; g.fill(); animeEye(g, cx + 2, hy + 1.5, 0.7, '#ffd166'); }
  else if (T === 'neon') { g.fillStyle = lin(g, cx - 6, 0, cx + 6, 0, [[0, '#22e5ff'], [1, '#ff2fd0']]); g.fillRect(cx - 5, hy - 1, 11, 2.6); g.strokeStyle = INK; g.lineWidth = 1; line(g, cx, hy - 7, cx, hy - 12); glowDot(g, cx, hy - 12, 1, trim); }
  else { for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 4, hy - 5); g.quadraticCurveTo(cx + s * 11, hy - 10, cx + s * 8, hy - 16); g.lineTo(cx + s * 3, hy - 7); inked(g, '#2a1a1a', 1); } glowDot(g, cx - 2, hy, 1.2, trim); glowDot(g, cx + 3, hy, 1.2, trim); }
  // spear arm (back)
  g.strokeStyle = INK; g.lineWidth = 2.6; line(g, cx - 10, base - 6, cx - 4, base - 46); g.strokeStyle = '#a07850'; g.lineWidth = 1.4; line(g, cx - 10, base - 6, cx - 4, base - 46);
  g.beginPath(); g.moveTo(cx - 6, base - 45); g.lineTo(cx - 3.4, base - 54); g.lineTo(cx - 1.4, base - 45); inked(g, '#dfe5ec', 1);
  // big shield (front, facing right)
  const sx = cx + 10 + (pose ? 3 : 0);
  g.beginPath(); g.roundRect(sx - 5, base - 36 - bob, 11, 30, 4);
  if (T === 'neon') { g.save(); g.shadowColor = '#22e5ff'; g.shadowBlur = 12; inked(g, 'rgba(34,229,255,.55)', 2, '#0e5a6b'); g.restore(); g.strokeStyle = 'rgba(200,255,255,.9)'; g.lineWidth = 0.8; for (let i = 0; i < 4; i++) line(g, sx - 3, base - 31 + i * 6 - bob, sx + 4, base - 31 + i * 6 - bob); }
  else { inked(g, lin(g, sx - 5, 0, sx + 6, 0, [[0, T === 'sakura' ? '#c79a5a' : '#3a2a30'], [1, T === 'sakura' ? '#7a5228' : '#120a0e']]), 2); circle(g, sx + 0.5, base - 21 - bob, 3.6); inked(g, trim, 1.2); if (T === 'volcano') { for (const yy of [-32, -10]) { g.beginPath(); g.moveTo(sx + 5, base + yy - bob); g.lineTo(sx + 10, base + yy + 2 - bob); g.lineTo(sx + 5, base + yy + 4 - bob); inked(g, '#888', 0.8); } } }
}

function tanuki(g: Ctx, T: Theme, p: number, pose = 0) {
  const cx = 24, base = 40; const step = Math.sin(p * Math.PI * 2); const bob = Math.abs(step) * 1.4;
  if (T === 'neon') { // bomb cart
    for (const wx of [-9, 9]) { circle(g, cx + wx, base - 5, 5); inked(g, '#141830', 1.6); g.strokeStyle = '#22e5ff'; g.lineWidth = 0.8; const a = p * 6.28; line(g, cx + wx - Math.cos(a) * 3, base - 5 - Math.sin(a) * 3, cx + wx + Math.cos(a) * 3, base - 5 + Math.sin(a) * 3); }
    g.beginPath(); g.roundRect(cx - 14, base - 20 - bob, 28, 12, 3); inked(g, lin(g, 0, base - 20, 0, base - 8, [[0, '#8a93b8'], [1, '#3a3f5c']]), 1.8);
    g.fillStyle = '#ffd166'; for (let i = 0; i < 4; i++) g.fillRect(cx - 12 + i * 7, base - 13 - bob, 4, 3);
  } else {
    // feet + round body
    for (const s of [-1, 1]) { ellipse(g, cx + s * 6 + step * s * 2, base - 2, 4, 2.6); inked(g, T === 'sakura' ? '#4a3020' : '#2a1410', 1.2); }
    circle(g, cx, base - 14 - bob, 13); inked(g, rad(g, cx - 4, base - 18 - bob, 1, 15, [[0, T === 'sakura' ? '#c9935e' : '#b33a1e'], [1, T === 'sakura' ? '#6e4527' : '#4a0f08']]), 2);
    g.save(); g.clip(); texture(g, 41, 0.6); ellipse(g, cx, base - 9 - bob, 8, 7); g.fillStyle = T === 'sakura' ? '#f3dfc0' : '#ff9f43'; g.fill(); g.restore();
  }
  // head
  const hy = base - 30 - bob * 1.2;
  if (T === 'neon') { g.beginPath(); g.roundRect(cx - 7, hy - 3, 14, 11, 3); inked(g, '#2a2440', 1.6); glowDot(g, cx + 2, hy + 2, 1.6, pose ? '#ff4d5e' : '#5ef38c'); }
  else {
    circle(g, cx, hy, 9); inked(g, rad(g, cx - 2, hy - 2, 1, 11, [[0, T === 'sakura' ? '#d9a46c' : '#c2481e'], [1, T === 'sakura' ? '#7a5030' : '#5a1408']]), 1.8);
    if (T === 'sakura') { g.fillStyle = '#3a2416'; ellipse(g, cx - 3.5, hy + 1, 3.6, 2.8, 0.3); g.fill(); ellipse(g, cx + 3.5, hy + 1, 3.6, 2.8, -0.3); g.fill(); g.fillStyle = '#fff'; circle(g, cx - 3, hy + 0.6, 1); g.fill(); circle(g, cx + 4, hy + 0.6, 1); g.fill(); ellipse(g, cx, hy + 4, 2, 1.3); g.fillStyle = INK; g.fill();
      for (const s of [-1, 1]) { circle(g, cx + s * 7, hy - 6, 3); inked(g, '#6e4527', 1.2); }
      g.beginPath(); g.ellipse(cx + 1, hy - 10, 5, 2.4, -0.4, 0, 7); inked(g, '#7ec850', 1); }
    else { animeEye(g, cx - 3, hy, 0.75, '#ffde59'); animeEye(g, cx + 3.5, hy, 0.75, '#ffde59'); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 4, hy - 7); g.lineTo(cx + s * 8, hy - 13); g.lineTo(cx + s * 7, hy - 5); inked(g, '#2a1410', 1); } g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - 3, hy + 5); g.quadraticCurveTo(cx, hy + 7, cx + 3, hy + 5); g.stroke(); }
  }
  // bomb carried
  const bx = cx + (T === 'neon' ? 0 : 12), by = (T === 'neon' ? base - 27 - bob : base - 22 - bob);
  circle(g, bx, by, 7); inked(g, rad(g, bx - 2, by - 3, 1, 8, [[0, '#5a5a6e'], [1, '#141420']]), 1.6);
  g.fillStyle = 'rgba(255,255,255,.4)'; ellipse(g, bx - 2.4, by - 2.6, 2, 1.2, -0.6); g.fill();
  g.strokeStyle = '#d9c38b'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(bx + 3, by - 6); g.quadraticCurveTo(bx + 6, by - 11, bx + 9, by - 10); g.stroke();
  glowDot(g, bx + 9, by - 10, pose ? 2.4 : 1.3, pose ? '#ff4d5e' : '#ffd166');
}

function phantom(g: Ctx, T: Theme, p: number) {
  const cx = 22, cy = 20; const f = Math.sin(p * Math.PI * 2);
  const body = T === 'sakura' ? '#f4f6ff' : T === 'neon' ? '#22e5ff' : '#3a3036';
  g.beginPath(); g.moveTo(cx - 11, cy);
  g.bezierCurveTo(cx - 12, cy - 22, cx + 12, cy - 22, cx + 11, cy);
  g.lineTo(cx + 12, cy + 14 + f * 2); g.lineTo(cx + 6, cy + 10); g.lineTo(cx + 2, cy + 18 - f * 2); g.lineTo(cx - 3, cy + 11); g.lineTo(cx - 9, cy + 19 + f * 2); g.lineTo(cx - 11, cy + 10);
  g.closePath();
  if (T === 'neon') { g.save(); g.shadowColor = '#22e5ff'; g.shadowBlur = 10; inked(g, 'rgba(34,229,255,.55)', 1.6, '#0e5a6b'); g.restore(); g.save(); g.clip(); g.fillStyle = 'rgba(255,47,208,.5)'; for (let i = 0; i < 6; i++) g.fillRect(cx - 10 + ((i * 7) % 20), cy - 14 + i * 5, 4, 2); g.restore(); }
  else if (T === 'volcano') { inked(g, rad(g, cx, cy - 6, 1, 22, [[0, '#5a4a50'], [1, 'rgba(20,10,14,.9)']]), 1.6, '#000'); g.save(); g.clip(); texture(g, 51, 0.8); g.restore(); }
  else { inked(g, rad(g, cx - 3, cy - 8, 1, 22, [[0, '#ffffff'], [1, '#c8d0ff']]), 1.6); }
  if (T === 'sakura') { // long black hair over face + triangle headband
    g.beginPath(); g.moveTo(cx - 10, cy - 6); g.bezierCurveTo(cx - 12, cy - 22, cx + 12, cy - 22, cx + 10, cy - 6); g.lineTo(cx + 9, cy + 6); g.lineTo(cx + 5, cy - 4); g.lineTo(cx - 5, cy - 4); g.lineTo(cx - 9, cy + 8); g.closePath(); inked(g, '#141018', 1.2);
    g.beginPath(); g.moveTo(cx - 3, cy - 15); g.lineTo(cx, cy - 20); g.lineTo(cx + 3, cy - 15); g.closePath(); inked(g, '#fff', 0.8);
    g.fillStyle = INK; ellipse(g, cx - 2.6, cy - 1, 1.2, 1.8); g.fill(); ellipse(g, cx + 2.6, cy - 1, 1.2, 1.8); g.fill();
  } else { glowDot(g, cx - 4, cy - 4, 1.8, T === 'neon' ? '#ffffff' : '#ff3d00'); glowDot(g, cx + 4, cy - 4, 1.8, T === 'neon' ? '#ffffff' : '#ff3d00'); g.fillStyle = INK; ellipse(g, cx, cy + 3, 3, 3.6 + f); g.fill(); }
  // arms reaching
  g.strokeStyle = rgba(body.startsWith('#') ? body : '#ffffff', 0.9); g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + 8, cy); g.quadraticCurveTo(cx + 15, cy - 2, cx + 18, cy + 3 + f); g.stroke();
}

function fox(g: Ctx, T: Theme, p: number, pose = 0) {
  const cx = 26, base = 40; const step = Math.sin(p * Math.PI * 2);
  const fur = T === 'sakura' ? '#fbf7ff' : T === 'neon' ? '#8a93b8' : '#ff8a3d';
  const mark = T === 'sakura' ? '#c23b4e' : T === 'neon' ? '#22e5ff' : '#ffde59';
  // tails
  for (let i = 0; i < 3; i++) {
    const a = -2.2 - i * 0.35 + Math.sin(p * 6.28 + i) * 0.12;
    g.save(); g.translate(cx - 10, base - 16); g.rotate(a);
    g.beginPath(); g.moveTo(0, -3); g.quadraticCurveTo(14, -9, 22, 0); g.quadraticCurveTo(14, 6, 0, 3); g.closePath();
    inked(g, lin(g, 0, 0, 22, 0, [[0, fur], [0.75, fur], [1, mark]]), 1.4);
    g.restore();
  }
  // legs + body
  for (const [lx, ph] of [[-8, 1], [-3, -1], [6, 1], [10, -1]] as [number, number][]) limb(g, [cx + lx, base - 12, cx + lx + step * ph * 2.5, base - 1], 2.6, shade(fur, -40));
  ellipse(g, cx, base - 16, 14, 8); inked(g, lin(g, 0, base - 24, 0, base - 8, [[0, fur], [1, shade(fur, -45)]]), 1.8);
  // head
  const hx = cx + 13, hy = base - 25;
  g.beginPath(); g.moveTo(hx - 7, hy - 2); g.lineTo(hx - 6, hy - 12); g.lineTo(hx - 2, hy - 6); g.lineTo(hx + 3, hy - 12); g.lineTo(hx + 4, hy - 4); g.quadraticCurveTo(hx + 13, hy + 1, hx + 11, hy + 3); g.quadraticCurveTo(hx + 2, hy + 7, hx - 6, hy + 4); g.closePath();
  inked(g, lin(g, 0, hy - 10, 0, hy + 6, [[0, fur], [1, shade(fur, -30)]]), 1.8);
  g.strokeStyle = mark; g.lineWidth = 1.2; line(g, hx - 2, hy - 2, hx + 3, hy - 1); line(g, hx - 1, hy + 1, hx + 3, hy + 1);
  g.fillStyle = INK; circle(g, hx + 11, hy + 2.2, 1.2); g.fill();
  animeEye(g, hx + 2, hy - 0.5, 0.65, mark, false);
  // spirit orb
  const ox = cx + 2, oy = base - 34 + Math.sin(p * 6.28) * 2;
  g.save(); g.shadowColor = pose ? '#5ef38c' : mark; g.shadowBlur = 10; circle(g, ox, oy, 4.2); g.fillStyle = rad(g, ox - 1, oy - 1, 0, 5, [[0, '#fff'], [1, pose ? '#5ef38c' : mark]]); g.fill(); g.restore();
}

/* ---------------- builder ---------------- */
type DrawFn = (g: Ctx, T: Theme, p: number, pose?: number) => void;
interface ArtSpec { w: number; h: number; ax: number; ay: number; fn: DrawFn; fly?: number; poses?: number }
const SPECS: Record<string, ArtSpec> = {
  gnat: { w: 40, h: 36, ax: 20, ay: 34, fn: gnat, fly: 10 },
  goblin: { w: 44, h: 44, ax: 22, ay: 41 , fn: goblin, poses: 1 },
  golem: { w: 68, h: 74, ax: 34, ay: 71, fn: golem, poses: 1 },
  boar: { w: 64, h: 46, ax: 30, ay: 43, fn: boar, poses: 1 },
  wisp: { w: 44, h: 40, ax: 22, ay: 38, fn: wisp, fly: 12, poses: 1 },
  slime: { w: 50, h: 40, ax: 26, ay: 37, fn: slime },
  slimelet: { w: 34, h: 28, ax: 17, ay: 25, fn: (g, T, p) => slime(g, T, p, 0, true) },
  knight: { w: 52, h: 62, ax: 26, ay: 58, fn: knight, poses: 1 },
  tanuki: { w: 48, h: 46, ax: 24, ay: 41, fn: tanuki, poses: 1 },
  phantom: { w: 44, h: 44, ax: 22, ay: 42, fn: phantom, fly: 8 },
  fox: { w: 56, h: 46, ax: 26, ay: 41, fn: fox, poses: 1 },
};
const cache = new Map<string, EnemySprites>();
export function enemySprites(id: string, T: Theme): EnemySprites {
  const key = id + '|' + T; const hit = cache.get(key); if (hit) return hit;
  const S = SPECS[id] || SPECS.goblin;
  const run: Frame[] = [], pose: Frame[] = [];
  for (let i = 0; i < 4; i++) run.push(renderFrame(S.w, S.h, S.ax, S.ay, (g) => S.fn(g, T, i / 4, 0)));
  if (S.poses) for (let i = 0; i < 2; i++) pose.push(renderFrame(S.w, S.h, S.ax, S.ay, (g) => S.fn(g, T, i / 2, 1)));
  const out = { run, pose: pose.length ? pose : run.slice(0, 2), scale: 1, fly: S.fly || 0 };
  cache.set(key, out); return out;
}
export function clearEnemyCache() { cache.clear(); }
export const ART_IDS = Object.keys(SPECS);
void P_UNUSED;
function P_UNUSED() { return PAL; }

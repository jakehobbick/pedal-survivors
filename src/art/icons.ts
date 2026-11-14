/** Procedural item icons (weapons, passives, abilities) as cached data URLs for the DOM UI. */
import { mkCanvas, lin, rad, inked, ellipse, circle, line, shade, INK, Ctx } from './common';
import { fxFrames } from '../art/fxart';
import { WEAPON_BY_ID, PASSIVE_BY_ID } from '../data/weapons';

const cache = new Map<string, string>();
const S = 64;
function frameIcon(g: Ctx, name: string, sc = 1.6, rot = 0) {
  const f = fxFrames()[name]; g.save(); g.translate(S / 2, S / 2); g.rotate(rot); g.drawImage(f.c, -f.w * sc / 2, -f.h * sc / 2, f.w * sc, f.h * sc); g.restore();
}
const DRAW: Record<string, (g: Ctx, col: string) => void> = {
  darts: (g) => { frameIcon(g, 'dart', 1.8, -0.6); frameIcon(g, 'dart', 1.2, -0.9); },
  presta: (g) => { for (let i = 0; i < 6; i++) frameIcon(g, 'dart', 1.1, i * 1.05); },
  shuriken: (g) => frameIcon(g, 'shuriken', 1.7),
  wheel: (g) => frameIcon(g, 'wheel', 1.0),
  whip: (g, c) => { g.lineWidth = 3; for (let i = 0; i < 7; i++) { const a = -2.4 + i * 0.5; const x = 32 + Math.cos(a) * 20, y = 38 + Math.sin(a) * 20; ellipse(g, x, y, 5, 3, a + 1.57); g.strokeStyle = INK; g.lineWidth = 4; g.stroke(); g.strokeStyle = c; g.lineWidth = 2.2; g.stroke(); } },
  reaper: (g, c) => { for (let k = 0; k < 2; k++) for (let i = 0; i < 9; i++) { const a = i * 0.7 + k * 3.14; const x = 32 + Math.cos(a) * 18, y = 32 + Math.sin(a) * 18; ellipse(g, x, y, 4.5, 2.6, a + 1.57); g.strokeStyle = c; g.lineWidth = 2.4; g.stroke(); } },
  cannon: (g) => { g.save(); g.translate(30, 36); g.rotate(-0.5); g.beginPath(); g.roundRect(-14, -8, 30, 16, 5); inked(g, lin(g, 0, -8, 0, 8, [[0, '#7c8299'], [1, '#2b2f40']]), 2); g.restore(); frameIcon(g, 'ball', 1.0); },
  howitzer: (g) => { frameIcon(g, 'ball', 1.6); for (let i = 0; i < 5; i++) { const a = i * 1.26; g.save(); g.translate(Math.cos(a) * 18, Math.sin(a) * 18); frameIcon(g, 'ball', 0.6); g.restore(); } },
  bell: (g, c) => { g.beginPath(); g.moveTo(18, 44); g.quadraticCurveTo(20, 14, 32, 14); g.quadraticCurveTo(44, 14, 46, 44); g.closePath(); inked(g, lin(g, 18, 0, 46, 0, [[0, shade(c, 40)], [1, shade(c, -60)]]), 2.4); circle(g, 32, 47, 4); inked(g, '#c98a00', 1.6); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(32, 30, 22, -2.6, -2.1); g.stroke(); },
  chime: (g, c) => { DRAW.bell(g, c); g.strokeStyle = '#fff'; g.lineWidth = 2; for (let r = 24; r < 34; r += 5) { g.beginPath(); g.arc(32, 32, r, -0.6, 0.6); g.stroke(); g.beginPath(); g.arc(32, 32, r, 2.5, 3.7); g.stroke(); } },
  bidon: (g) => frameIcon(g, 'bottle', 1.7),
  tsunami: (g) => { g.fillStyle = 'rgba(60,200,255,.5)'; ellipse(g, 32, 46, 26, 10); g.fill(); frameIcon(g, 'bottle', 1.5); },
  drone: (g) => frameIcon(g, 'drone', 1.6),
  swarm: (g) => { for (let i = 0; i < 5; i++) { const a = i * 1.26; g.save(); g.translate(Math.cos(a) * 16, Math.sin(a) * 16); frameIcon(g, 'drone', 0.8); g.restore(); } },
  lightning: (g) => bolt(g, '#fff3a0'),
  tubular: (g) => { bolt(g, '#fff3a0'); g.save(); g.translate(14, 6); g.scale(0.5, 0.5); bolt(g, '#ffffff'); g.restore(); },
  boomer: (g) => frameIcon(g, 'boomer', 1.4),
  grandtour: (g) => { for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; g.save(); g.translate(Math.cos(a) * 14, Math.sin(a) * 14); frameIcon(g, 'boomer', 0.8); g.restore(); } },
  laser: (g, c) => beam(g, c, 6),
  hyper: (g, c) => beam(g, c, 14),
  trail: (g) => { const f = fxFrames().flame; g.drawImage(f.c, 12, 8, 40, 48); },
  inferno: (g) => { const f = fxFrames().flame; g.drawImage(f.c, 4, 4, 34, 42); g.drawImage(f.c, 26, 10, 34, 46); },
  // passives
  aero: (g, c) => { g.beginPath(); g.moveTo(10, 40); g.bezierCurveTo(10, 14, 40, 10, 56, 30); g.lineTo(54, 40); g.closePath(); inked(g, lin(g, 0, 12, 0, 40, [[0, shade(c, 50)], [1, shade(c, -40)]]), 2.4); g.beginPath(); g.moveTo(34, 38); g.quadraticCurveTo(48, 34, 58, 42); g.lineTo(46, 46); g.closePath(); inked(g, 'rgba(120,230,255,.9)', 1.6); },
  lube: (g, c) => { g.beginPath(); g.moveTo(32, 8); g.quadraticCurveTo(50, 34, 46, 44); g.quadraticCurveTo(40, 56, 32, 56); g.quadraticCurveTo(22, 56, 18, 44); g.quadraticCurveTo(14, 34, 32, 8); inked(g, rad(g, 26, 38, 2, 26, [[0, '#fff6c8'], [1, c]]), 2.4); },
  co2: (g, c) => { g.save(); g.translate(32, 32); g.rotate(-0.7); g.beginPath(); g.roundRect(-9, -22, 18, 40, 9); inked(g, lin(g, -9, 0, 9, 0, [[0, '#f0f0f0'], [1, '#8a8a9a']]), 2.2); g.fillStyle = c; g.fillRect(-9, -4, 18, 8); g.beginPath(); g.roundRect(-4, -28, 8, 8, 2); inked(g, '#555', 1.4); g.restore(); },
  electro: (g, c) => { g.beginPath(); g.roundRect(18, 12, 28, 42, 8); inked(g, lin(g, 18, 0, 46, 0, [[0, shade(c, 50)], [1, shade(c, -50)]]), 2.4); g.save(); g.translate(20, 20); g.scale(0.38, 0.38); bolt(g, '#ffffff'); g.restore(); },
  pm: (g, c) => { g.beginPath(); g.arc(32, 38, 22, Math.PI, 0); g.lineTo(54, 42); g.lineTo(10, 42); g.closePath(); inked(g, '#1b1233', 2.4); for (let i = 0; i < 5; i++) { const a = Math.PI + i * Math.PI / 4; g.strokeStyle = i > 2 ? c : '#5ef38c'; g.lineWidth = 3; line(g, 32 + Math.cos(a) * 15, 38 + Math.sin(a) * 15, 32 + Math.cos(a) * 20, 38 + Math.sin(a) * 20); } g.strokeStyle = '#fff'; g.lineWidth = 3; line(g, 32, 38, 46, 24); circle(g, 32, 38, 3.5); inked(g, '#fff', 1); },
  rims: (g) => { circle(g, 32, 32, 22); g.lineWidth = 7; g.strokeStyle = INK; g.stroke(); g.lineWidth = 5; g.strokeStyle = '#2b2635'; g.stroke(); circle(g, 32, 32, 16); g.lineWidth = 5; g.strokeStyle = '#c0c6d8'; g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { const a = i * 2.09; line(g, 32, 32, 32 + Math.cos(a) * 14, 32 + Math.sin(a) * 14); } },
  gel: (g, c) => { g.beginPath(); g.moveTo(20, 10); g.lineTo(44, 10); g.lineTo(46, 46); g.quadraticCurveTo(32, 58, 18, 46); g.closePath(); inked(g, lin(g, 18, 0, 46, 0, [[0, shade(c, 40)], [1, shade(c, -50)]]), 2.4); g.fillStyle = '#fff'; g.font = '800 14px sans-serif'; g.textAlign = 'center'; g.fillText('GEL', 32, 34); },
  socks: (g, c) => { g.beginPath(); g.moveTo(24, 8); g.lineTo(40, 8); g.lineTo(40, 36); g.quadraticCurveTo(54, 40, 52, 50); g.quadraticCurveTo(48, 56, 30, 54); g.quadraticCurveTo(22, 52, 24, 40); g.closePath(); inked(g, lin(g, 0, 8, 0, 54, [[0, shade(c, 40)], [1, shade(c, -30)]]), 2.4); g.fillStyle = '#ffd166'; g.fillRect(24, 14, 16, 4); g.fillRect(24, 22, 16, 4); },
  cadence: (g, c) => { g.lineWidth = 5; g.strokeStyle = c; g.beginPath(); g.arc(32, 32, 18, 0.3, 2.8); g.stroke(); g.beginPath(); g.arc(32, 32, 18, 3.4, 5.9); g.stroke(); g.fillStyle = c; g.beginPath(); g.moveTo(50, 38); g.lineTo(56, 26); g.lineTo(44, 28); g.fill(); g.beginPath(); g.moveTo(14, 26); g.lineTo(8, 38); g.lineTo(20, 36); g.fill(); g.font = '800 15px Rajdhani, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('RPM', 32, 37); },
  bag: (g, c) => { g.beginPath(); g.moveTo(14, 26); g.quadraticCurveTo(14, 54, 32, 54); g.quadraticCurveTo(50, 54, 50, 26); g.closePath(); inked(g, lin(g, 0, 26, 0, 54, [[0, shade(c, 30)], [1, shade(c, -40)]]), 2.4); g.beginPath(); g.moveTo(12, 26); g.quadraticCurveTo(32, 12, 52, 26); g.lineTo(48, 32); g.quadraticCurveTo(32, 22, 16, 32); g.closePath(); inked(g, shade(c, -20), 2); },
  chamois: (g, c) => { g.beginPath(); g.moveTo(32, 54); g.bezierCurveTo(4, 36, 12, 10, 32, 22); g.bezierCurveTo(52, 10, 60, 36, 32, 54); inked(g, rad(g, 26, 26, 2, 30, [[0, '#fff'], [1, c]]), 2.4); },
  sealant: (g, c) => { g.beginPath(); g.moveTo(32, 8); g.lineTo(52, 16); g.quadraticCurveTo(52, 44, 32, 56); g.quadraticCurveTo(12, 44, 12, 16); g.closePath(); inked(g, lin(g, 12, 0, 52, 0, [[0, '#ffffff'], [1, shade(c, -60)]]), 2.4); g.strokeStyle = '#5ef38c'; g.lineWidth = 4; g.beginPath(); g.moveTo(22, 32); g.lineTo(30, 40); g.lineTo(44, 24); g.stroke(); },
  log: (g, c) => { g.beginPath(); g.roundRect(14, 10, 36, 44, 4); inked(g, lin(g, 14, 0, 50, 0, [[0, shade(c, 20)], [1, shade(c, -50)]]), 2.4); g.fillStyle = '#fff'; g.fillRect(20, 16, 24, 32); g.strokeStyle = '#ff5d8f'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(22, 42); g.lineTo(28, 32); g.lineTo(34, 36); g.lineTo(42, 22); g.stroke(); },
  gold: (g) => { for (let i = 0; i < 4; i++) { g.save(); g.translate(-10 + i * 7, 10 - i * 6); frameIcon(g, 'coin', 1.6); g.restore(); } },
  heal: (g) => frameIcon(g, 'heal', 1.6),
};
function bolt(g: Ctx, c: string) { g.beginPath(); g.moveTo(38, 4); g.lineTo(16, 36); g.lineTo(30, 36); g.lineTo(24, 60); g.lineTo(48, 24); g.lineTo(34, 24); g.closePath(); inked(g, lin(g, 16, 4, 48, 60, [[0, '#ffffff'], [1, c]]), 2.4); }
function beam(g: Ctx, c: string, w: number) { g.save(); g.translate(32, 32); g.rotate(-0.6); const gr = lin(g, 0, -w, 0, w, [[0, 'rgba(255,255,255,0)'], [0.5, c], [1, 'rgba(255,255,255,0)']]); g.fillStyle = gr; g.fillRect(-30, -w, 60, w * 2); g.fillStyle = '#fff'; g.fillRect(-30, -w * 0.2, 60, w * 0.4); g.restore(); circle(g, 14, 46, 7); g.fillStyle = rad(g, 14, 46, 0, 8, [[0, '#fff'], [1, c]]); g.fill(); }

export function iconURL(id: string, evolved = false): string {
  const key = id + (evolved ? '*' : ''); const hit = cache.get(key); if (hit) return hit;
  const [c, g] = mkCanvas(S, S);
  const col = WEAPON_BY_ID[id]?.color || PASSIVE_BY_ID[id]?.color || '#ffd166';
  g.fillStyle = rad(g, 32, 28, 4, 44, [[0, shade(col.length === 7 ? col : '#888888', -40)], [1, '#140b26']]); g.beginPath(); g.roundRect(1, 1, 62, 62, 14); g.fill();
  if (evolved || WEAPON_BY_ID[id]?.evolved) { g.strokeStyle = '#ffd166'; g.lineWidth = 3; g.stroke(); }
  try { (DRAW[id] || DRAW.gold)(g, col); } catch { /* ignore */ }
  const url = c.toDataURL(); cache.set(key, url); return url;
}

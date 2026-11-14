/**
 * Procedural anime-style rider on a road bike (side view, facing right).
 * Generated once into supersampled sprite frames: run (8, crank cycle), idle (4, coasting), hit (2).
 */
import { Ctx, INK, Frame, renderFrame, shade, lin, rad, inked, ellipse, circle, limb, ik, line, rgba, noiseTex, textureAtop } from './common';

export interface RiderLook {
  skin: string; hair: string; hairStyle: 'spiky' | 'pony' | 'bob' | 'long' | 'twin';
  eye: string; jersey: string; jersey2: string; bike: string; helmet: string; scarf: string; shorts?: string; shoe?: string;
  mark?: 'bolt' | 'leaf' | 'star' | 'wave';
}
export const RIDER_W = 76, RIDER_H = 72, RIDER_AX = 36, RIDER_AY = 68;

const RW = { x: 16, y: 54 }, FW = { x: 57, y: 54 }, BB = { x: 34, y: 56 }, WR = 13;

function wheel(g: Ctx, x: number, y: number, rot: number, look: RiderLook) {
  // tire
  circle(g, x, y, WR); g.lineWidth = 4.2; g.strokeStyle = INK; g.stroke();
  circle(g, x, y, WR); g.lineWidth = 2.6; g.strokeStyle = '#2b2635'; g.stroke();
  // deep carbon rim
  circle(g, x, y, WR - 2.6); g.lineWidth = 3.2; g.strokeStyle = '#141019'; g.stroke();
  circle(g, x, y, WR - 2.6); g.lineWidth = 1; g.strokeStyle = shade(look.bike, 30); g.stroke();
  // spokes
  g.strokeStyle = 'rgba(220,220,235,.7)'; g.lineWidth = 0.55;
  for (let i = 0; i < 12; i++) {
    const a = rot + (i / 12) * Math.PI * 2;
    line(g, x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.6, x + Math.cos(a + 0.18) * (WR - 4), y + Math.sin(a + 0.18) * (WR - 4));
  }
  // motion blur arc
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2;
  g.beginPath(); g.arc(x, y, WR - 6, rot, rot + 1.2); g.stroke();
  circle(g, x, y, 2); inked(g, '#cfd3e0', 0.8);
  // tire highlight
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, WR + 0.4, -2.6, -1.6); g.stroke();
}

function tube(g: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, col: string) {
  g.lineCap = 'round';
  g.strokeStyle = INK; g.lineWidth = w + 2.2; line(g, x0, y0, x1, y1);
  g.strokeStyle = col; g.lineWidth = w; line(g, x0, y0, x1, y1);
  g.strokeStyle = 'rgba(255,255,255,.38)'; g.lineWidth = Math.max(0.6, w * 0.28);
  const nx = (y1 - y0), ny = -(x1 - x0), L = Math.hypot(nx, ny) || 1; const o = w * 0.22;
  line(g, x0 + nx / L * o, y0 + ny / L * o, x1 + nx / L * o, y1 + ny / L * o);
}

function frameBike(g: Ctx, look: RiderLook) {
  const c = look.bike, cd = shade(c, -45);
  const seat = { x: 29, y: 37 }, ht = { x: 52, y: 37 }, hb = { x: 54, y: 44 };
  // stays (far)
  tube(g, RW.x, RW.y, seat.x, seat.y + 1, 1.8, cd);
  tube(g, RW.x, RW.y, BB.x, BB.y, 2.0, cd);
  // main triangle
  tube(g, BB.x, BB.y, seat.x, seat.y, 3.0, c);
  tube(g, seat.x + 0.5, seat.y + 0.5, ht.x, ht.y + 0.6, 2.6, c);
  tube(g, BB.x, BB.y, hb.x, hb.y, 3.6, c);
  tube(g, ht.x, ht.y - 1, hb.x, hb.y, 3.4, shade(c, -15));
  // fork
  tube(g, hb.x, hb.y, FW.x, FW.y, 2.2, shade(c, -25));
  // seatpost + saddle
  tube(g, seat.x, seat.y, 27.4, 33, 1.6, '#2a2733');
  g.beginPath(); g.moveTo(22, 32.6); g.quadraticCurveTo(27, 30.8, 32.5, 32.4); g.lineTo(31, 34); g.quadraticCurveTo(26, 33.4, 22.4, 34.2); g.closePath(); inked(g, '#1d1a24', 1.2);
  // stem + bar
  tube(g, ht.x, ht.y - 1.5, 57.5, 35.6, 1.7, '#2a2733');
  g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 3.2;
  g.beginPath(); g.moveTo(57.5, 35.6); g.quadraticCurveTo(61.5, 36.5, 60.5, 41); g.quadraticCurveTo(59.5, 43.5, 57, 43); g.stroke();
  g.strokeStyle = look.jersey2; g.lineWidth = 1.8; g.stroke();
  // logo stripe on down tube
  g.save(); g.strokeStyle = rgba('#ffffff', 0.85); g.lineWidth = 1.1; line(g, 40, 51.5, 46, 48.6); g.restore();
}

function crankset(g: Ctx, th: number, look: RiderLook, near: boolean) {
  if (!near) {
    circle(g, BB.x, BB.y, 5.4); inked(g, '#2d2a36', 1.1);
    circle(g, BB.x, BB.y, 4.2); g.strokeStyle = '#8e93a6'; g.lineWidth = 0.6; g.stroke();
    // chain
    g.strokeStyle = '#4b4f5c'; g.lineWidth = 0.8;
    line(g, BB.x, BB.y - 5.2, RW.x, RW.y - 2.6); line(g, BB.x, BB.y + 5.2, RW.x, RW.y + 2.6);
    circle(g, RW.x, RW.y, 2.8); g.stroke();
    return;
  }
  const px = BB.x + Math.cos(th) * 6, py = BB.y + Math.sin(th) * 6;
  g.strokeStyle = INK; g.lineWidth = 3; line(g, BB.x, BB.y, px, py);
  g.strokeStyle = '#c6cad8'; g.lineWidth = 1.6; line(g, BB.x, BB.y, px, py);
  circle(g, BB.x, BB.y, 1.6); inked(g, '#e6e8f0', 0.8);
  void look;
}

function leg(g: Ctx, th: number, look: RiderLook, near: boolean, hip: { x: number; y: number }) {
  const fx = BB.x + Math.cos(th) * 6, fy = BB.y + Math.sin(th) * 6;
  const [kx, ky] = ik(hip.x, hip.y, fx, fy, 14.5, 15, 1);
  const skin = near ? look.skin : shade(look.skin, -38);
  const shorts = near ? (look.shorts || '#1b1830') : shade(look.shorts || '#1b1830', -20);
  // thigh (shorts) then shin
  const ax = fx - (fx - kx) * 0.12, ay = fy - (fy - ky) * 0.12;
  limb(g, [kx, ky, ax, ay], 4.2, skin);
  limb(g, [hip.x, hip.y, kx + (hip.x - kx) * 0.25, ky + (hip.y - ky) * 0.25], 6.4, shorts);
  limb(g, [kx + (hip.x - kx) * 0.28, ky + (hip.y - ky) * 0.28, kx, ky], 5.4, skin);
  // knee highlight
  if (near) { g.fillStyle = 'rgba(255,255,255,.25)'; circle(g, kx + 0.6, ky - 0.8, 1.2); g.fill(); }
  // shoe (cleat) aligned with pedal
  g.save(); g.translate(fx, fy); g.rotate(-0.12 + Math.sin(th) * 0.18);
  g.beginPath(); g.moveTo(-3.6, -1.8); g.quadraticCurveTo(0, -3.4, 4.8, -0.9); g.quadraticCurveTo(5.6, 1.2, 3.6, 1.4); g.lineTo(-3.4, 1.2); g.closePath();
  inked(g, near ? (look.shoe || '#f4f1fb') : shade(look.shoe || '#f4f1fb', -60), 1.3);
  if (near) { g.strokeStyle = look.jersey; g.lineWidth = 0.9; line(g, -1.6, -1.4, 2.4, -1.2); }
  g.restore();
}

function torso(g: Ctx, look: RiderLook, hip: { x: number; y: number }, sh: { x: number; y: number }) {
  const j = look.jersey, j2 = look.jersey2;
  g.beginPath();
  g.moveTo(hip.x - 4, hip.y + 2.5);
  g.quadraticCurveTo(hip.x - 3, hip.y - 6, sh.x - 4.5, sh.y - 3.2);
  g.quadraticCurveTo(sh.x + 1, sh.y - 5.6, sh.x + 4.2, sh.y - 1);
  g.quadraticCurveTo(sh.x + 3, sh.y + 4.6, hip.x + 6, hip.y + 2.6);
  g.closePath();
  inked(g, lin(g, hip.x, sh.y - 4, hip.x + 4, hip.y + 4, [[0, shade(j, 30)], [0.55, j], [1, shade(j, -40)]]), 2);
  // stripe + pocket line
  g.save(); g.clip();
  g.strokeStyle = j2; g.lineWidth = 2.6; g.beginPath(); g.moveTo(hip.x - 6, hip.y - 1); g.quadraticCurveTo(hip.x + 6, sh.y + 2, sh.x + 6, sh.y - 6); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(hip.x - 6, hip.y + 1.4); g.quadraticCurveTo(hip.x + 6, sh.y + 4.2, sh.x + 6, sh.y - 3.6); g.stroke();
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(hip.x - 6, hip.y - 1, 12, 5);
  textureAtop(g, noiseTex(64, 7, 6, 0.35));
  g.restore();
}

function arm(g: Ctx, look: RiderLook, sh: { x: number; y: number }, hand: { x: number; y: number }, near: boolean) {
  const [ex, ey] = ik(sh.x, sh.y, hand.x, hand.y, 10.5, 10.5, -1);
  const skin = near ? look.skin : shade(look.skin, -40);
  limb(g, [sh.x, sh.y, ex, ey], 4.6, near ? look.jersey : shade(look.jersey, -40));
  limb(g, [ex, ey, hand.x, hand.y], 3.6, skin);
  circle(g, hand.x, hand.y, 2.3); inked(g, near ? '#2b2440' : '#1a1528', 1.1); // glove
}

function hairBack(g: Ctx, look: RiderLook, hx: number, hy: number, t: number) {
  const h = look.hair, hd = shade(h, -45);
  const sway = Math.sin(t) * 1.4;
  g.fillStyle = lin(g, hx - 14, hy - 6, hx, hy + 8, [[0, shade(h, 25)], [1, hd]]);
  g.lineWidth = 1.8; g.strokeStyle = INK;
  g.beginPath();
  switch (look.hairStyle) {
    case 'pony':
      g.moveTo(hx - 6, hy - 3); g.quadraticCurveTo(hx - 16, hy - 6 + sway, hx - 24, hy + 2 + sway * 1.6);
      g.quadraticCurveTo(hx - 16, hy + 0.5, hx - 7, hy + 3); break;
    case 'long':
      g.moveTo(hx - 6, hy - 4); g.quadraticCurveTo(hx - 18, hy + sway, hx - 20, hy + 13 + sway);
      g.quadraticCurveTo(hx - 13, hy + 9, hx - 5, hy + 6); break;
    case 'twin':
      g.moveTo(hx - 6, hy - 2); g.quadraticCurveTo(hx - 15, hy + sway, hx - 21, hy + 9 + sway * 1.4);
      g.quadraticCurveTo(hx - 13, hy + 5, hx - 6, hy + 4);
      g.moveTo(hx - 4, hy + 2); g.quadraticCurveTo(hx - 10, hy + 7 + sway, hx - 13, hy + 15 + sway);
      g.quadraticCurveTo(hx - 7, hy + 10, hx - 3, hy + 6); break;
    case 'bob':
      g.moveTo(hx - 8, hy - 4); g.quadraticCurveTo(hx - 13, hy + 3, hx - 9, hy + 8); g.quadraticCurveTo(hx - 5, hy + 7, hx - 3, hy + 5); break;
    default: // spiky
      g.moveTo(hx - 7, hy - 5); g.lineTo(hx - 17, hy - 6 + sway); g.lineTo(hx - 10, hy - 1);
      g.lineTo(hx - 18, hy + 3 + sway); g.lineTo(hx - 9, hy + 2.5); g.lineTo(hx - 13, hy + 8 + sway * 0.6); g.lineTo(hx - 5, hy + 5); break;
  }
  g.closePath(); g.fill(); g.stroke();
}

function head(g: Ctx, look: RiderLook, hx: number, hy: number, hit: boolean, blink: boolean) {
  const sk = look.skin;
  // neck
  limb(g, [hx - 3, hy + 6, hx - 5, hy + 10], 3.4, shade(sk, -25));
  // face (rounded chibi)
  g.beginPath();
  g.moveTo(hx - 8.5, hy - 2);
  g.bezierCurveTo(hx - 9, hy + 6, hx - 2, hy + 9.6, hx + 4.4, hy + 7.8);
  g.bezierCurveTo(hx + 8.4, hy + 6.6, hx + 9.8, hy + 1.5, hx + 9.4, hy - 2.5);
  g.lineTo(hx - 8.5, hy - 2);
  inked(g, rad(g, hx + 3, hy + 1, 1, 12, [[0, shade(sk, 12)], [1, shade(sk, -14)]]), 1.9);
  // ear
  ellipse(g, hx - 3.6, hy + 1.6, 1.8, 2.4); inked(g, shade(sk, -10), 1.1);
  // blush
  g.fillStyle = 'rgba(255,110,140,.45)'; ellipse(g, hx + 4.8, hy + 4.6, 2.4, 1.1); g.fill();
  // bangs from under the helmet
  g.beginPath(); g.moveTo(hx - 2, hy - 2.6); g.lineTo(hx + 1.4, hy + 1.6); g.lineTo(hx + 2.6, hy - 2.2); g.lineTo(hx + 5.6, hy + 1.2); g.lineTo(hx + 7, hy - 2.6); g.closePath();
  inked(g, lin(g, hx, hy - 3, hx, hy + 2, [[0, shade(look.hair, 20)], [1, shade(look.hair, -30)]]), 1.2);
  // eye
  const ex = hx + 5.2, ey = hy + 1.8;
  if (hit) {
    g.strokeStyle = INK; g.lineWidth = 1.3; g.beginPath(); g.moveTo(ex - 2, ey - 1.8); g.lineTo(ex + 1, ey); g.lineTo(ex - 2, ey + 1.8); g.stroke();
  } else if (blink) {
    g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.arc(ex, ey - 0.4, 2.2, 0.3, Math.PI - 0.3); g.stroke();
  } else {
    ellipse(g, ex, ey, 2.2, 3); inked(g, '#fff', 1.1);
    ellipse(g, ex + 0.6, ey + 0.3, 1.6, 2.3); g.fillStyle = lin(g, ex, ey - 2, ex, ey + 2.5, [[0, shade(look.eye, -40)], [1, shade(look.eye, 40)]]); g.fill();
    ellipse(g, ex + 0.8, ey + 0.5, 0.8, 1.2); g.fillStyle = INK; g.fill();
    circle(g, ex - 0.2, ey - 0.9, 0.7); g.fillStyle = '#fff'; g.fill();
    circle(g, ex + 1.3, ey + 1.6, 0.35); g.fill();
    // lash
    g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(ex - 2.4, ey - 2.4); g.quadraticCurveTo(ex + 0.5, ey - 3.8, ex + 2.8, ey - 2.2); g.stroke();
  }
  // mouth
  g.strokeStyle = INK; g.lineWidth = 0.9;
  if (hit) { ellipse(g, hx + 6.6, hy + 6.6, 1, 1.2); g.fillStyle = '#5a1020'; g.fill(); g.stroke(); }
  else { g.beginPath(); g.moveTo(hx + 5.8, hy + 6.4); g.quadraticCurveTo(hx + 6.8, hy + 7.2, hx + 7.6, hy + 6.2); g.stroke(); }
  // helmet shell
  const hc = look.helmet;
  g.beginPath();
  g.moveTo(hx - 10.5, hy - 0.6);
  g.bezierCurveTo(hx - 12, hy - 11, hx + 1, hy - 14.5, hx + 8, hy - 8.6);
  g.quadraticCurveTo(hx + 11.2, hy - 5.6, hx + 10.4, hy - 2.2);
  g.lineTo(hx - 10.5, hy - 0.6);
  inked(g, lin(g, hx, hy - 14, hx, hy, [[0, shade(hc, 45)], [0.5, hc], [1, shade(hc, -45)]]), 2);
  // vents
  g.fillStyle = 'rgba(10,6,20,.75)';
  for (let i = 0; i < 3; i++) { ellipse(g, hx - 5 + i * 4.4, hy - 8.2 + Math.abs(i - 1) * 0.8, 1.5, 0.8, -0.3 + i * 0.25); g.fill(); }
  // stripe + visor
  g.strokeStyle = look.jersey2; g.lineWidth = 1.4; g.beginPath(); g.moveTo(hx - 9.8, hy - 3.4); g.quadraticCurveTo(hx, hy - 6.4, hx + 9.8, hy - 4.2); g.stroke();
  g.beginPath(); g.moveTo(hx + 3, hy - 2.6); g.quadraticCurveTo(hx + 9, hy - 3.6, hx + 12.6, hy - 1); g.lineTo(hx + 10, hy - 0.4); g.closePath();
  inked(g, lin(g, hx + 3, hy - 3, hx + 12, hy, [[0, 'rgba(120,230,255,.95)'], [1, 'rgba(160,80,255,.95)']]), 1.1);
  // shine
  g.fillStyle = 'rgba(255,255,255,.55)'; ellipse(g, hx - 2, hy - 11, 3.4, 1.1, -0.2); g.fill();
  // strap
  g.strokeStyle = 'rgba(20,10,30,.8)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(hx - 1.5, hy - 1); g.lineTo(hx + 1.5, hy + 7.2); g.stroke();
}

function scarf(g: Ctx, look: RiderLook, x: number, y: number, t: number, speed: number) {
  const L = 22 + speed * 6;
  g.beginPath(); g.moveTo(x, y - 1.6);
  const pts: number[] = [];
  for (let i = 1; i <= 6; i++) {
    const u = i / 6; const px = x - u * L, py = y - 1 + Math.sin(t * 2 + u * 5) * (1 + u * 3.2) * (0.6 + speed * 0.5) - u * 2;
    pts.push(px, py); g.lineTo(px, py - (1 - u) * 1.4 - 1.4);
  }
  for (let i = 5; i >= 0; i--) { const px = pts[i * 2] ?? x, py = pts[i * 2 + 1] ?? y; g.lineTo(px + 0.6, py + 2.2 - i * 0.1); }
  g.lineTo(x, y + 2); g.closePath();
  inked(g, lin(g, x, y, x - L, y, [[0, look.scarf], [1, shade(look.scarf, -50)]]), 1.4);
}

function markIcon(g: Ctx, look: RiderLook, x: number, y: number) {
  g.save(); g.translate(x, y); g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 0.7;
  g.beginPath();
  switch (look.mark) {
    case 'bolt': g.moveTo(0.8, -2.8); g.lineTo(-1.4, 0.3); g.lineTo(0.2, 0.3); g.lineTo(-0.8, 2.8); g.lineTo(1.6, -0.6); g.lineTo(0, -0.6); g.closePath(); break;
    case 'leaf': g.ellipse(0, 0, 2.6, 1.3, -0.6, 0, 7); break;
    case 'star': for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.1 : 2.6, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); break;
    default: g.moveTo(-2.6, 0.6); g.quadraticCurveTo(-1.3, -1.6, 0, 0.6); g.quadraticCurveTo(1.3, 2.4, 2.6, 0.2); g.lineTo(2.6, 1.4); g.quadraticCurveTo(1.3, 3.4, 0, 1.6); g.quadraticCurveTo(-1.3, -0.4, -2.6, 1.8); g.closePath();
  }
  g.fill(); g.stroke(); g.restore();
}

export function drawRider(g: Ctx, look: RiderLook, th: number, opt: { bob?: number; hit?: boolean; blink?: boolean; t?: number; speed?: number; coast?: boolean }) {
  const bob = opt.bob || 0, t = opt.t || 0, speed = opt.speed ?? 1;
  const hip = { x: 27.5, y: 31 + bob * 0.6 };
  const sh = { x: 44, y: 21.5 + bob };
  const hx = 49.5, hy = 12 + bob + (opt.hit ? 1 : 0);
  // ground shadow drawn by renderer
  hairBack(g, look, hx, hy, t);
  scarf(g, look, sh.x, sh.y - 1, t, speed);
  // far side
  arm(g, look, { x: sh.x - 1, y: sh.y + 1 }, { x: 58.6, y: 38.5 }, false);
  crankset(g, th + Math.PI, look, false);
  leg(g, th + Math.PI, look, false, hip);
  wheel(g, RW.x, RW.y, -th * 1.8, look);
  wheel(g, FW.x, FW.y, -th * 1.8 + 0.7, look);
  frameBike(g, look);
  // near side
  leg(g, th, look, true, hip);
  crankset(g, th, look, true);
  torso(g, look, hip, sh);
  markIcon(g, look, hip.x + 6.6, hip.y - 4.8);
  head(g, look, hx, hy, !!opt.hit, !!opt.blink);
  arm(g, look, sh, { x: 57.2, y: 37.6 }, true);
}

export interface RiderSheet { run: Frame[]; idle: Frame[]; hit: Frame[]; portrait: HTMLCanvasElement }
export function buildRiderSheet(look: RiderLook): RiderSheet {
  const run: Frame[] = [], idle: Frame[] = [], hit: Frame[] = [];
  const mk = (th: number, o: Parameters<typeof drawRider>[3]) =>
    renderFrame(RIDER_W, RIDER_H, RIDER_AX, RIDER_AY, (g) => { g.translate(0, 0); drawRider(g, look, th, o); });
  for (let i = 0; i < 8; i++) {
    const th = (i / 8) * Math.PI * 2;
    run.push(mk(th, { bob: Math.sin(th * 2) * 0.6, t: (i / 8) * Math.PI * 2, speed: 1 }));
  }
  for (let i = 0; i < 4; i++) {
    const p = (i / 4) * Math.PI * 2;
    idle.push(mk(0.2, { bob: Math.sin(p) * 0.5, t: p, speed: 0.15, blink: i === 3 }));
  }
  hit.push(mk(0.8, { bob: 1, hit: true, t: 0.5, speed: 0.6 }));
  hit.push(mk(1.4, { bob: 1.4, hit: true, t: 1.5, speed: 0.6 }));
  // portrait (bust), larger
  const P = 160; const pc = document.createElement('canvas'); pc.width = P; pc.height = P; const pg = pc.getContext('2d')!;
  pg.fillStyle = rad(pg, P / 2, P / 2, 10, P * 0.7, [[0, rgba(look.jersey, 0.55)], [1, 'rgba(10,5,20,0)']]); pg.fillRect(0, 0, P, P);
  pg.save(); pg.scale(4.2, 4.2); pg.translate(-31, -1); drawRider(pg, look, 0.3, { bob: 0, t: 1, speed: 0.5 }); pg.restore();
  return { run, idle, hit, portrait: pc };
}

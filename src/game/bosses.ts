/**
 * Boss & mini-boss brains. Attacks are data-listed in BOSSES[id].attacks and implemented here.
 * While a final boss's sprint shield is up it attacks gently — the sprint is the fight.
 */
import type { World } from './world';
import { Enemy, PK, ZK } from './entities';
import { BOSSES } from '../data/enemies';
import { rng } from '../core/math';
import { shake, burst } from './fx';
import { sfx } from '../audio/sfx';

const TAU = Math.PI * 2;
export function updateBoss(w: World, e: Enemy, dt: number, dx: number, dy: number, d: number): [number, number] {
  const B = BOSSES[e.def.id];
  const shielded = e.shield > 0;
  const P = w.player;
  e.cd -= dt * (shielded ? 0.45 : 1) * (e.hp < e.maxHp * 0.4 ? 1.35 : 1);
  // st: 0 roam, 1 charge windup, 2 charging, 3 spiral, 4 dash chain
  if (e.st === 1) { e.aux -= dt; if (e.aux <= 0) { e.st = 2; e.aux = 0.75; sfx.charge(); } return [-e.sx * 30, -e.sy * 30]; }
  if (e.st === 2) { e.aux -= dt; if (e.aux <= 0) { e.st = 0; shake(6); } return [e.sx * 560, e.sy * 560]; }
  if (e.st === 3) {
    e.aux -= dt; e.aux2 += dt * 2.6;
    if (Math.floor(e.aux * 12) !== Math.floor((e.aux + dt) * 12)) for (let k = 0; k < 3; k++) { const a = e.aux2 + k * TAU / 3; shoot(w, e, Math.cos(a), Math.sin(a), 210); }
    if (e.aux <= 0) e.st = 0;
    return [dx * e.speed * 0.25, dy * e.speed * 0.25];
  }
  if (e.st === 4) {
    e.aux -= dt;
    if (e.aux <= 0) { e.phase2 = (e.phase2 || 0) + 1; if (e.phase2 >= 3) { e.st = 0; e.phase2 = 0; } else { e.aux = 0.45; e.sx = dx; e.sy = dy; burst(e.x, e.y - 30, 10, B.color, 240, 12); } }
    return [e.sx * 640, e.sy * 640];
  }
  if (e.cd <= 0) {
    e.cd = (e.rank >= 3 ? 2.6 : 3.3) + rng.next() * 1.2;
    const atk = B.attacks[Math.floor(rng.next() * B.attacks.length)];
    doAttack(w, e, atk, dx, dy);
  }
  // roam: approach but keep some distance
  const want = e.rank >= 3 ? 190 : 120;
  const s = e.speed * e.slowF * (shielded ? 0.75 : 1);
  if (d > want) return [dx * s, dy * s];
  return [-dy * s * 0.6, dx * s * 0.6];
  void P;
}
function shoot(w: World, e: Enemy, ux: number, uy: number, sp: number) {
  const kind = w.theme === 'volcano' ? PK.ORB_FIRE : w.theme === 'neon' ? PK.ORB_CYAN : PK.ORB;
  const fr = kind === PK.ORB_FIRE ? 'orbFire' : kind === PK.ORB_CYAN ? 'orbCyan' : 'orb';
  const p = w.proj(kind, fr, e.x + ux * e.r * 0.6, e.y - e.r * 0.8 + uy * e.r * 0.6, ux * sp, uy * sp, 9, e.dmg * 0.55, 5, true);
  if (p) p.scale = 1.3;
}
function telegraph(w: World, x: number, y: number, r: number, delay: number, dmg: number, special = 0) {
  const z = w.zone(ZK.TELEGRAPH, x, y, r, 0.01, dmg, true); if (!z) return;
  z.delay = delay; z.max = delay; z.special = special; z.life = 0.01;
}
function doAttack(w: World, e: Enemy, atk: string, dx: number, dy: number) {
  const P = w.player;
  switch (atk) {
    case 'ring': {
      const n = e.rank >= 3 ? 22 : 14; const off = rng.next() * TAU;
      for (let i = 0; i < n; i++) { const a = off + i * TAU / n; shoot(w, e, Math.cos(a), Math.sin(a), 190); }
      if (e.rank >= 3) setTimeout(() => { if (e.dead) return; for (let i = 0; i < n; i++) { const a = off + (i + 0.5) * TAU / n; shoot(w, e, Math.cos(a), Math.sin(a), 160); } }, 600);
      sfx.warn(); break;
    }
    case 'spiral': e.st = 3; e.aux = 2.4; e.aux2 = rng.next() * TAU; break;
    case 'charge': e.st = 1; e.aux = 0.9; e.sx = dx; e.sy = dy; break;
    case 'dashes': e.st = 4; e.aux = 0.5; e.phase2 = 0; e.sx = dx; e.sy = dy; break;
    case 'slam': {
      telegraph(w, P.x, P.y, 95, 1.1, e.dmg, 0);
      for (let k = 0; k < 3; k++) { const a = rng.next() * TAU, r = 120 + rng.next() * 120; telegraph(w, P.x + Math.cos(a) * r, P.y + Math.sin(a) * r * 0.7, 80, 1.3 + k * 0.15, e.dmg * 0.8, 0); }
      break;
    }
    case 'rocks': {
      for (let k = 0; k < (e.rank >= 3 ? 9 : 6); k++) { const a = rng.next() * TAU, r = rng.next() * 260; telegraph(w, P.x + P.hx * 120 + Math.cos(a) * r, P.y + P.hy * 90 + Math.sin(a) * r * 0.7, 60, 0.9 + k * 0.12, e.dmg * 0.7, 0); }
      break;
    }
    case 'laser': {
      const base = Math.atan2(P.y - e.y, P.x - e.x);
      for (let k = -1; k <= 1; k++) {
        const z = w.zone(ZK.LASER_LINE, P.x, P.y - 20, 0, 0.6, e.dmg * 0.8, true);
        if (z) { z.a = base + k * 0.9; z.len = 1400; z.w = 26; z.delay = 1.1 + Math.abs(k) * 0.15; z.max = z.delay; z.special = 1; z.life = 0.6; }
      }
      sfx.warn(); break;
    }
    case 'summon': {
      const ids = w.arena.pool.slice(0, 4).map((p) => p[0]); const n = e.rank >= 3 ? 10 : 6;
      for (let k = 0; k < n; k++) { const a = k * TAU / n; w.spawnEnemy(ids[k % ids.length], e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 70); }
      burst(e.x, e.y - 30, 20, BOSSES[e.def.id].color, 260, 14); break;
    }
  }
}
declare module './entities' { interface Enemy { phase2?: number } }

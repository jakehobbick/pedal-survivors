/** Weapon behaviors. Each behavior reads the instance's computed WStats plus player stats. */
import type { World } from './world';
import type { WeaponInst } from './player';
import { Proj, PK, ZK, Enemy } from './entities';
import { rng } from '../core/math';
import { burst, particle, glowId, ring, shake } from './fx';
import { sfx } from '../audio/sfx';

const TAU = Math.PI * 2;
export function updateWeapons(w: World, dt: number) {
  const P = w.player;
  const rate = P.dyn.rate;
  for (const wi of P.weapons) {
    wi.t += dt;
    const b = wi.def.behavior;
    if (b === 'orbit') { orbitStep(w, wi, dt, rate); continue; }
    if (b === 'trail') { if (!P.moving) continue; }
    wi.cdT -= dt * rate;
    if (wi.cdT > 0) continue;
    const cd = Math.max(0.05, wi.s.cd * P.stats.cooldown * P.dyn.cd);
    wi.cdT += cd; if (wi.cdT < -cd) wi.cdT = 0;
    fire(w, wi);
  }
}
function eff(w: World, wi: WeaponInst) {
  const P = w.player; const s = wi.s;
  return {
    dmg: s.dmg * P.stats.might * P.dyn.dmg,
    area: s.area * P.stats.area * P.dyn.area,
    speed: s.speed * P.stats.projSpeed,
    dur: s.dur * P.stats.duration,
    amount: Math.max(1, s.amount + P.stats.amount),
  };
}
function aimDir(w: World, maxR = 700): [number, number, Enemy | null] {
  const P = w.player; const e = w.nearest(P.x, P.y - 20, maxR);
  if (e) { const dx = e.x - P.x, dy = e.y - e.r * 0.5 - (P.y - 24); const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l, e]; }
  return [P.hx, P.hy, null];
}
function fire(w: World, wi: WeaponInst) {
  const P = w.player; const s = wi.s; const E = eff(w, wi);
  const ox = P.x, oy = P.y - 26;
  switch (wi.def.behavior) {
    case 'shot': {
      const n = E.amount;
      if (s.special === 2) { // presta storm: rotating radial fan
        wi.ang += 0.45;
        for (let i = 0; i < n; i++) { const a = wi.ang + (i / n) * TAU; shot(w, wi, ox, oy, Math.cos(a), Math.sin(a), E, PK.DART, 'dart'); }
        sfx.shoot(0.6); break;
      }
      const [dx, dy] = aimDir(w);
      const base = Math.atan2(dy, dx);
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * (s.special === 1 ? 0.32 : 0.14);
        const a = base + off;
        const kind = wi.def.id === 'wheel' ? PK.WHEEL : s.special === 1 ? PK.SHURIKEN : PK.DART;
        shot(w, wi, ox, oy, Math.cos(a), Math.sin(a), E, kind, kind === PK.WHEEL ? 'wheel' : kind === PK.SHURIKEN ? 'shuriken' : 'dart');
      }
      sfx.shoot(s.special === 1 ? 0.3 : 0.8);
      break;
    }
    case 'whip': {
      const dirs = s.special ? 4 : Math.min(2, E.amount);
      wi.side = -wi.side;
      for (let i = 0; i < dirs; i++) {
        let ax: number, ay: number;
        if (s.special) { const a = wi.t * 1.7 + i * TAU / 4; ax = Math.cos(a); ay = Math.sin(a); }
        else { const sd = i === 0 ? P.face : -P.face; ax = sd; ay = 0; }
        whip(w, wi, ax, ay, E.dmg, E.area, i * 0.06);
      }
      sfx.whip();
      break;
    }
    case 'cannon': {
      const [dx, dy] = aimDir(w, 800); const base = Math.atan2(dy, dx);
      for (let i = 0; i < E.amount; i++) {
        const a = base + (i - (E.amount - 1) / 2) * 0.25;
        const p = w.proj(PK.BALL, 'ball', ox, oy, Math.cos(a) * E.speed, Math.sin(a) * E.speed, 13 * Math.sqrt(E.area), E.dmg, E.dur, false, wi.slot);
        if (p) { p.aoe = s.aoe * E.area; p.knock = s.knock; p.special = s.special; p.tint = '#ff9f43'; p.scale = 1.3; p.pierce = 1; }
      }
      sfx.cannon(); break;
    }
    case 'aura': {
      const r = s.aoe * E.area;
      const n = w.query(P.x, P.y - 20, r);
      for (let k = 0; k < n; k++) { const e = w.enemies.items[w.qres[k]]; w.damage(e, E.dmg, P.x, P.y, s.knock, wi.slot); if (s.special) e.stunT = Math.max(e.stunT, 0.5); }
      const z = w.zone(ZK.RING, P.x, P.y - 20, 10, 0.45, 0, false); if (z) { z.grow = r * 2.2; z.col = wi.def.color; z.w = r; }
      if (s.special) w.healPlayer(2);
      sfx.bell(s.special ? 1 : 0); break;
    }
    case 'lob': {
      for (let i = 0; i < E.amount; i++) {
        const e = w.randomOnScreen();
        let tx: number, ty: number;
        if (e && Math.hypot(e.x - P.x, e.y - P.y) < 520) { tx = e.x + (rng.next() - 0.5) * 30; ty = e.y + (rng.next() - 0.5) * 30; }
        else { const a = rng.next() * TAU, d = 120 + rng.next() * 200; tx = P.x + Math.cos(a) * d; ty = P.y + Math.sin(a) * d; }
        const p = w.proj(PK.BOTTLE, 'bottle', ox, oy, 0, 0, 8, E.dmg, 5, false, wi.slot);
        if (p) { p.tx = tx; p.ty = ty; p.arc = 0.55 + i * 0.08; p.aoe = s.aoe * E.area; p.special = s.special; p.knock = E.dur; p.tint = '#5ef38c'; p.scale = 1.2; }
      }
      sfx.lob(); break;
    }
    case 'strike': {
      for (let i = 0; i < E.amount; i++) {
        const e = w.randomOnScreen(); if (!e) break;
        lightning(w, wi, e, E.dmg, s.aoe * E.area, s.bounce);
      }
      sfx.zap(); break;
    }
    case 'boomerang': {
      const [dx, dy] = aimDir(w, 600); const base = Math.atan2(dy, dx);
      for (let i = 0; i < E.amount; i++) {
        const a = s.special ? base + i * TAU / E.amount : base + (i - (E.amount - 1) / 2) * 0.5;
        const p = w.proj(PK.BOOMER, 'boomer', ox, oy, Math.cos(a) * E.speed, Math.sin(a) * E.speed, 16 * E.area, E.dmg, E.dur * 2.4, false, wi.slot);
        if (p) { p.pierce = 9999; p.spin = 18; p.knock = s.knock; p.scale = E.area; p.tint = '#ff5d8f'; p.special = s.special; p.crit = s.special ? 1 : 0; p.arc = E.dur; }
      }
      sfx.whoosh(); break;
    }
    case 'beam': {
      const [dx, dy] = aimDir(w, s.aoe);
      const base = Math.atan2(dy, dx);
      const width = 16 * E.area;
      for (let i = 0; i < E.amount; i++) {
        const a = base + (i - (E.amount - 1) / 2) * 0.3 + (s.special ? i * Math.PI : 0);
        if (s.special) {
          const z = w.zone(ZK.BEAM, ox, oy, 0, E.dur, E.dmg, false, wi.slot);
          if (z) { z.a = a; z.len = s.aoe; z.w = width; z.special = 1; z.vx = 1.7 * (i % 2 ? -1 : 1); z.tick = s.tick; z.tt = 0; z.col = wi.def.color; }
        } else {
          beamHit(w, ox, oy, a, s.aoe, width, E.dmg, wi.slot, s.knock);
          const z = w.zone(ZK.BEAM, ox, oy, 0, 0.22, 0, false, wi.slot); if (z) { z.a = a; z.len = s.aoe; z.w = width; z.col = wi.def.color; }
        }
      }
      sfx.laser(); break;
    }
    case 'trail': {
      const z = w.zone(ZK.FIRE, P.x - P.hx * 26 + (rng.next() - 0.5) * 8, P.y - P.hy * 26 + (rng.next() - 0.5) * 8, s.aoe * E.area, E.dur, E.dmg, false, wi.slot);
      if (z) { z.tick = s.tick; z.special = s.special; z.col = wi.def.color; }
      break;
    }
  }
}
function shot(w: World, wi: WeaponInst, x: number, y: number, dx: number, dy: number, E: ReturnType<typeof eff>, kind: number, frame: string) {
  const s = wi.s;
  const sz = kind === PK.WHEEL ? 22 : kind === PK.SHURIKEN ? 11 : 6;
  const p = w.proj(kind, frame, x, y, dx * E.speed, dy * E.speed, sz * E.area, E.dmg, E.dur, false, wi.slot);
  if (!p) return;
  p.pierce = s.pierce; p.knock = s.knock; p.bounce = s.bounce; p.tint = wi.def.color; p.scale = kind === PK.WHEEL ? E.area * 0.7 : E.area;
  if (kind !== PK.DART) p.spin = 16;
}
function whip(w: World, wi: WeaponInst, ax: number, ay: number, dmg: number, area: number, delay: number) {
  const P = w.player;
  const len = 150 * area, hh = 34 * area;
  const cx = P.x + ax * len * 0.5, cy = P.y - 26 + ay * len * 0.5;
  const n = w.query(cx, cy, len * 0.55);
  let healed = 0;
  for (let k = 0; k < n; k++) {
    const e = w.enemies.items[w.qres[k]];
    // project into whip-local frame
    const rx = e.x - P.x, ry = e.y - e.r * 0.4 - (P.y - 26);
    const along = rx * ax + ry * ay, perp = Math.abs(-rx * ay + ry * ax);
    if (along < -10 || along > len + e.r || perp > hh + e.r) continue;
    w.damage(e, dmg, P.x, P.y, wi.s.knock, wi.slot);
    if (wi.s.special && healed < 6) { w.healPlayer(1); healed++; }
  }
  const z = w.zone(ZK.SLASH, P.x, P.y - 26, len, 0.22 + delay, 0, false, wi.slot);
  if (z) { z.a = Math.atan2(ay, ax); z.w = hh; z.col = wi.def.color; z.special = wi.side; }
}
export function beamHit(w: World, x: number, y: number, a: number, len: number, width: number, dmg: number, slot: number, knock: number) {
  const ax = Math.cos(a), ay = Math.sin(a);
  // sample along the beam with overlapping circles
  const step = 90; const st = ++w.qstamp; void st;
  const seen = beamSeen; seen.clear();
  for (let d = step * 0.5; d < len + step; d += step) {
    const cx = x + ax * Math.min(d, len), cy = y + ay * Math.min(d, len);
    const n = w.query(cx, cy, step * 0.75, w.qres2);
    for (let k = 0; k < n; k++) {
      const e = w.enemies.items[w.qres2[k]]; if (seen.has(e.uid)) continue;
      const rx = e.x - x, ry = e.y - e.r * 0.4 - y; const along = rx * ax + ry * ay; const perp = Math.abs(-rx * ay + ry * ax);
      if (along < 0 || along > len || perp > width / 2 + e.r) continue;
      seen.add(e.uid);
      w.damage(e, dmg, e.x - ax * 20, e.y - ay * 20, knock, slot);
    }
  }
}
const beamSeen = new Set<number>();
function lightning(w: World, wi: WeaponInst, e: Enemy, dmg: number, aoe: number, chains: number) {
  let cur: Enemy | null = e; let px = e.x, py = e.y - 400;
  const hit = chainSeen; hit.clear();
  for (let c = 0; c <= chains && cur; c++) {
    const x = cur.x, y = cur.y - cur.r * 0.5;
    const z = w.zone(ZK.BOLT, x, y, aoe, 0.28, 0, false, wi.slot); if (z) { z.vx = px; z.vy = py; z.col = '#fff3a0'; }
    const n = w.query(x, y, aoe, w.qres2);
    for (let k = 0; k < n; k++) w.damage(w.enemies.items[w.qres2[k]], dmg, x, y - 30, wi.s.knock, wi.slot);
    burst(x, y, 6, '#fff3a0', 200, 9, 0.3);
    hit.add(cur.uid); px = x; py = y;
    let next: Enemy | null = null, bd = 220 * 220;
    if (c < chains) {
      const m = w.query(x, y, 220, w.qres2);
      for (let k = 0; k < m; k++) { const q = w.enemies.items[w.qres2[k]]; if (hit.has(q.uid)) continue; const d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < bd) { bd = d; next = q; } }
    }
    cur = next;
  }
}
const chainSeen = new Set<number>();

function orbitStep(w: World, wi: WeaponInst, dt: number, rate: number) {
  const P = w.player; const s = wi.s; const E = eff(w, wi);
  // st > 0: active seconds left; st <= 0: cooling down
  if (wi.st > 0) { wi.st -= dt; if (wi.st <= 0 && !s.special) wi.cdT = s.cd * P.stats.cooldown; }
  else { wi.cdT -= dt * rate; if (wi.cdT <= 0) { wi.st = s.special ? 1e9 : E.dur; sfx.drone(); } }
  if (wi.st <= 0) return;
  wi.ang += s.speed * dt;
  const n = E.amount, R = s.aoe * Math.sqrt(E.area), r = 13 * E.area;
  for (let i = 0; i < n; i++) {
    const a = wi.ang + (i / n) * TAU;
    const x = P.x + Math.cos(a) * R, y = P.y - 22 + Math.sin(a) * R * 0.8;
    const m = w.query(x, y, r);
    for (let k = 0; k < m; k++) {
      const e = w.enemies.items[w.qres[k]]; if (e.imm[wi.slot & 7] > w.t) continue;
      e.imm[wi.slot & 7] = w.t + 0.5; w.damage(e, E.dmg, P.x, P.y - 22, s.knock, wi.slot);
      burst(x, y, 2, wi.def.color, 100, 7, 0.2);
    }
  }
  // evolved: drones fire darts
  if (s.special) {
    wi.aux -= dt * rate;
    if (wi.aux <= 0) {
      wi.aux = 1.1;
      for (let i = 0; i < n; i++) {
        const a = wi.ang + (i / n) * TAU; const x = P.x + Math.cos(a) * R, y = P.y - 22 + Math.sin(a) * R * 0.8;
        const t = w.nearest(x, y, 500); if (!t) continue;
        const dx = t.x - x, dy = t.y - t.r * 0.5 - y; const l = Math.hypot(dx, dy) || 1;
        const p = w.proj(PK.DART, 'dart', x, y, dx / l * 600, dy / l * 600, 6, E.dmg * 0.6, 1, false, wi.slot);
        if (p) { p.tint = wi.def.color; }
      }
    }
  }
}
/** drone positions for rendering */
export function dronePositions(w: World, wi: WeaponInst, out: Float32Array): number {
  if (wi.st <= 0) return 0;
  const P = w.player; const E = eff(w, wi); const n = Math.min(E.amount, out.length / 2); const R = wi.s.aoe * Math.sqrt(E.area);
  for (let i = 0; i < n; i++) { const a = wi.ang + (i / n) * TAU; out[i * 2] = P.x + Math.cos(a) * R; out[i * 2 + 1] = P.y - 22 + Math.sin(a) * R * 0.8; }
  return n;
}

export function boomerangStep(w: World, p: Proj, dt: number) {
  const P = w.player; const out = p.arc;
  if (p.t < out) {
    const k = 1 - p.t / out; // decelerate
    if (p.special) { const c = Math.cos(dt * 2.2), s = Math.sin(dt * 2.2); const vx = p.vx * c - p.vy * s, vy = p.vx * s + p.vy * c; p.vx = vx; p.vy = vy; }
    p.x += p.vx * k * dt * 1.6; p.y += p.vy * k * dt * 1.6;
  } else {
    const dx = P.x - p.x, dy = P.y - 26 - p.y; const l = Math.hypot(dx, dy) || 1;
    const sp = Math.hypot(p.vx, p.vy) * (0.6 + (p.t - out) * 1.2);
    p.x += dx / l * sp * dt; p.y += dy / l * sp * dt;
    if (l < 24) p.dead = true;
  }
}
export function landBottle(w: World, p: Proj) {
  const z = w.zone(ZK.PUDDLE, p.tx, p.ty, p.aoe, p.knock, p.dmg, false, p.slot);
  if (z) { z.tick = 0.3; z.col = '#5ef38c'; z.slow = p.special ? 0.5 : 0.25; z.grow = p.special ? 10 : 0; z.special = p.special; }
  burst(p.tx, p.ty, 10, '#5ef38c', 160, 9); sfx.splash();
}
export function projBlast(w: World, p: Proj) {
  w.explode(p.x, p.y, p.aoe, p.dmg, false, p.slot, '#ff9f43', p.knock);
  if (p.special === 1 && p.kind === PK.BALL) {
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU + rng.next() * 0.4; const sp = 160 + rng.next() * 80;
      const q = w.proj(PK.BOMBLET, 'ball', p.x, p.y, Math.cos(a) * sp, Math.sin(a) * sp, 8, p.dmg * 0.45, 0.35 + rng.next() * 0.2, false, p.slot);
      if (q) { q.aoe = p.aoe * 0.55; q.knock = 60; q.special = 0; q.scale = 0.7; q.tint = '#ff9f43'; }
    }
  }
}
export function ultFx(w: World, col: string) { const P = w.player; ring(P.x, P.y - 20, 40, col, 700, 16); shake(10); for (let i = 0; i < 20; i++) particle(0, glowId(col), P.x, P.y - 20, (rng.next() - 0.5) * 600, (rng.next() - 0.5) * 600, 0.6, 22, 2); }

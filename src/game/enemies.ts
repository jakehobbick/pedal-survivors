/** Enemy AI behaviors + movement, separation and despawn/relocation. */
import type { World } from './world';
import { Enemy, PK, ZK } from './entities';
import { rng } from '../core/math';
import { ring, burst } from './fx';
import { updateBoss } from './bosses';
import { sfx } from '../audio/sfx';

const NB = new Int32Array(64);
export function updateEnemies(w: World, dt: number, dtReal: number) {
  const P = w.player; const A = w.enemies.items;
  const px = P.x, py = P.y - 14;
  const farX = w.viewW * 0.5 + 420, farY = w.viewH * 0.5 + 420;
  for (let i = 0; i < w.enemies.n; i++) {
    const e = A[i]; if (e.dead) continue;
    e.t += dt; e.flash = Math.max(0, e.flash - dtReal); e.spawnT = Math.max(0, e.spawnT - dt);
    if (e.burnT > 0) e.burnT -= dt;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 1; }
    let dx = px - e.x, dy = py - e.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    let spd = e.speed * w.enemySpeedMult * e.slowF * e.frenzy;
    let mvx = 0, mvy = 0;
    if (e.stunT > 0) { e.stunT -= dt; spd = 0; }
    switch (e.def.behavior) {
      case 'chase': mvx = dx * spd; mvy = dy * spd; break;
      case 'swarm': {
        const wob = Math.sin(e.t * 4 + e.uid) * 0.6;
        mvx = (dx - dy * wob) * spd; mvy = (dy + dx * wob) * spd; break;
      }
      case 'charger': {
        e.cd -= dt;
        if (e.st === 0) { mvx = dx * spd; mvy = dy * spd; if (d < (e.def.range || 320) && e.cd <= 0 && e.stunT <= 0) { e.st = 1; e.aux = e.def.windup || 0.7; e.sx = dx; e.sy = dy; } }
        else if (e.st === 1) { e.aux -= dt; mvx = -e.sx * 20; mvy = -e.sy * 20; if (e.aux <= 0) { e.st = 2; e.aux = 0.85; sfx.charge(); } }
        else { e.aux -= dt; const cs = (e.def.chargeSpeed || 380) * e.slowF; mvx = e.sx * cs; mvy = e.sy * cs; if (e.aux <= 0) { e.st = 0; e.cd = e.def.chargeCd || 3.4; } }
        break;
      }
      case 'ranged': {
        const R = e.def.range || 260;
        if (d > R + 40) { mvx = dx * spd; mvy = dy * spd; }
        else if (d < R - 70) { mvx = -dx * spd * 0.8; mvy = -dy * spd * 0.8; }
        else { const s = (e.uid & 1) ? 1 : -1; mvx = -dy * spd * 0.5 * s; mvy = dx * spd * 0.5 * s; }
        e.cd -= dt;
        if (e.cd <= 0.45 && e.st === 0) e.st = 1; // telegraph
        if (e.cd <= 0 && d < R + 160 && e.stunT <= 0) {
          e.cd = (e.def.fireCd || 2.6) * (0.85 + rng.next() * 0.3); e.st = 0;
          const sp = e.def.projSpeed || 170;
          const kind = w.theme === 'volcano' ? PK.ORB_FIRE : w.theme === 'neon' ? PK.ORB_CYAN : PK.ORB;
          const fr = kind === PK.ORB_FIRE ? 'orbFire' : kind === PK.ORB_CYAN ? 'orbCyan' : 'orb';
          const p = w.proj(kind, fr, e.x, e.y - e.r, dx * sp, dy * sp, 7, (e.def.projDmg || 8) * w.enemyDmgMult * (e.rank ? 1.5 : 1), 4, true);
          if (p && e.rank === 1) { for (const off of [-0.25, 0.25]) { const c = Math.cos(off), s = Math.sin(off); w.proj(kind, fr, e.x, e.y - e.r, (dx * c - dy * s) * sp, (dx * s + dy * c) * sp, 7, p.dmg, 4, true); } }
        } else if (e.cd > 0.45) e.st = 0;
        break;
      }
      case 'splitter': mvx = dx * spd; mvy = dy * spd; break;
      case 'shielded': {
        // shield turns slowly toward the player
        const ca = Math.atan2(e.sy, e.sx) || 0; let ta = Math.atan2(dy, dx) - ca;
        while (ta > Math.PI) ta -= 2 * Math.PI; while (ta < -Math.PI) ta += 2 * Math.PI;
        const na = (e.sx === 0 && e.sy === 0) ? Math.atan2(dy, dx) : ca + Math.max(-1.3 * dt, Math.min(1.3 * dt, ta));
        e.sx = Math.cos(na); e.sy = Math.sin(na);
        mvx = dx * spd; mvy = dy * spd; break;
      }
      case 'exploder': {
        if (e.st === 0) { mvx = dx * spd; mvy = dy * spd; if (d < e.r + P.r + 34) { e.st = 1; e.aux = e.def.fuse || 0.8; sfx.fuse(); } }
        else { e.aux -= dt; mvx = dx * spd * 0.25; mvy = dy * spd * 0.25; if (e.aux <= 0) { e.dead = true; w.explode(e.x, e.y - e.r * 0.5, e.def.blastR || 70, (e.def.blastDmg || 18) * w.enemyDmgMult, true, -1, '#ff7b39'); w.pickup(0, e.x, e.y, e.xp); continue; } }
        break;
      }
      case 'phaser': {
        // visible 2.6 s, phased 1.3 s (untargetable, faster)
        const cyc = (e.t + e.uid * 0.37) % 3.9; const ph = cyc > 2.6 ? 1 : 0;
        e.phase += (ph - e.phase) * Math.min(1, dt * 8);
        const s2 = spd * (ph ? 1.6 : 1); mvx = dx * s2; mvy = dy * s2; break;
      }
      case 'healer': {
        const R = e.def.range || 200;
        if (d > R + 30) { mvx = dx * spd; mvy = dy * spd; } else if (d < R - 60) { mvx = -dx * spd; mvy = -dy * spd; } else { mvx = -dy * spd * 0.4; mvy = dx * spd * 0.4; }
        e.cd -= dt;
        if (e.cd <= 0) {
          e.cd = 3; e.st = 1; e.aux = 0.4;
          const n = w.query(e.x, e.y, e.def.healR || 130, w.qres2);
          for (let k = 0; k < n; k++) { const o = w.enemies.items[w.qres2[k]]; if (o.rank >= 2) continue; o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (e.def.healPct || 0.1)); }
          ring(e.x, e.y - 10, 14, '#5ef38c', 220, 9);
        }
        if (e.aux > 0) { e.aux -= dt; if (e.aux <= 0) e.st = 0; }
        break;
      }
      case 'boss': { const v = updateBoss(w, e, dt, dx, dy, d); mvx = v[0]; mvy = v[1]; break; }
    }
    // knockback
    e.kx *= Math.exp(-dt * 7); e.ky *= Math.exp(-dt * 7);
    e.vx = mvx; e.vy = mvy;
    e.x += (mvx + e.kx) * dt; e.y += (mvy + e.ky) * dt;
    if (Math.abs(mvx) > 4) e.face = mvx > 0 ? 1 : -1;
    e.anim += dt * (4 + spd * 0.03);
    // relocate stragglers far behind so pressure stays on (bosses never)
    if (e.rank < 2 && (Math.abs(e.x - w.camX) > farX || Math.abs(e.y - w.camY) > farY)) {
      const a = Math.atan2(P.hy, P.hx) + (rng.next() - 0.5) * 1.6;
      const R = Math.max(w.viewW, w.viewH) * 0.62;
      e.x = P.x + Math.cos(a) * R; e.y = P.y + Math.sin(a) * R; e.kx = e.ky = 0;
    }
  }
  separate(w);
}
/** soft circle separation via the spatial hash (from last frame's positions) */
function separate(w: World) {
  const A = w.enemies.items; const n = w.enemies.n;
  for (let i = 0; i < n; i++) {
    const e = A[i]; if (e.dead || e.phase > 0.5) continue;
    if (e.def.behavior === 'swarm' && (i & 1)) continue; // swarmers overlap a bit (cheaper, looks swarmy)
    const m = w.hash.query(e.x, e.y, e.r * 2, NB);
    let c = 0;
    for (let k = 0; k < m && c < 6; k++) {
      const j = NB[k]; if (j === i || j >= n) continue; const o = A[j]; if (o.dead || o.phase > 0.5) continue;
      const dx = e.x - o.x, dy = e.y - o.y; const rr = (e.r + o.r) * 0.85; const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr || d2 < 0.0001) continue;
      const d = Math.sqrt(d2); const push = (rr - d) * 0.5; const tm = e.mass + o.mass;
      const ux = dx / d, uy = dy / d;
      e.x += ux * push * (o.mass / tm); e.y += uy * push * (o.mass / tm);
      o.x -= ux * push * (e.mass / tm); o.y -= uy * push * (e.mass / tm);
      c++;
    }
  }
}
export function spawnFx(w: World, e: Enemy) { burst(e.x, e.y, 4, '#ffffff', 80, 8); void ZK; void w; }

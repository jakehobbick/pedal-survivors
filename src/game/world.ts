/**
 * The arena simulation for one run. Owns every pool, the player, the spatial hash,
 * and the damage/xp/pickup rules. Weapons, enemy AI, bosses and the wave director
 * live in their own modules and operate on a World.
 */
import { Pool, Enemy, Proj, Zone, Pickup, PU, ZK, PK } from './entities';
import { SpatialHash } from '../core/spatial';
import { Player, xpFor } from './player';
import { rng, clamp } from '../core/math';
import { ENEMY_BY_ID } from '../data/enemies';
import { ArenaDef } from '../data/arenas';
import { enemySprites, Theme } from '../art/enemies';
import { burst, dmgNumber, shake, flash, screen, ring, particle, glowId, frameId, updateParticles, updateNumbers, updateScreen, clearParticles, clearNumbers } from './fx';
import { updateWeapons } from './weapons';
import { updateEnemies } from './enemies';
import { sfx } from '../audio/sfx';

export interface RunStats {
  kills: number; elites: number; minis: number; bosses: number; dmgDealt: number; dmgTaken: number; gold: number; xp: number;
  chests: number; evolutions: number; falls: number; healed: number; maxLevel: number; surgeTime: number; overdrives: number;
  dashes: number; ults: number; pickups: number; bombs: number; distance: number; bestHit: number; dmgBy: number[];
  killsBy: Record<string, number>;
}
export const newStats = (): RunStats => ({ kills: 0, elites: 0, minis: 0, bosses: 0, dmgDealt: 0, dmgTaken: 0, gold: 0, xp: 0, chests: 0, evolutions: 0, falls: 0, healed: 0, maxLevel: 1, surgeTime: 0, overdrives: 0, dashes: 0, ults: 0, pickups: 0, bombs: 0, distance: 0, bestHit: 0, killsBy: {}, dmgBy: [0, 0, 0, 0] });

export interface WorldEvents {
  levelUp(): void;
  chest(rank: number): void;
  banner(text: string, sub?: string, ms?: number): void;
  enemyKilled(e: Enemy): void;
  playerDown(): void;
  bossSpawned(e: Enemy): void;
  bossKilled(e: Enemy): void;
}

export const MAX_ENEMIES = 520;
export class World {
  enemies = new Pool(() => new Enemy(), MAX_ENEMIES);
  projs = new Pool(() => new Proj(), 900);
  zones = new Pool(() => new Zone(), 320);
  pickups = new Pool(() => new Pickup(), 1100);
  hash = new SpatialHash(64, 2048, MAX_ENEMIES);
  qbuf = new Int32Array(1024);
  qres = new Int32Array(MAX_ENEMIES); qres2 = new Int32Array(MAX_ENEMIES);
  qstamp = 1;
  player = new Player();
  arena!: ArenaDef; theme: Theme = 'sakura';
  t = 0;           // game time (s)
  camX = 0; camY = 0; viewW = 1200; viewH = 800;
  stats = newStats();
  ev!: WorldEvents;
  enemyHpMult = 1; enemyDmgMult = 1; enemySpeedMult = 1;
  slowMo = 1;      // global enemy time scale (Time Trial ult)
  pendingLevels = 0; pendingChests: number[] = [];
  boss: Enemy | null = null;
  bossVuln = 1;   // late-fight boss fatigue multiplier
  surgeFn: () => number = () => 0;
  invulnMenu = false;
  bombFlash = 0;

  reset(arena: ArenaDef) {
    this.enemies.clear(); this.projs.clear(); this.zones.clear(); this.pickups.clear();
    clearParticles(); clearNumbers();
    this.arena = arena; this.theme = arena.theme; this.t = 0; this.stats = newStats();
    this.pendingLevels = 0; this.pendingChests = []; this.boss = null; this.bossVuln = 1; this.slowMo = 1;
    this.camX = this.camY = 0;
  }

  /* ---------------- queries ---------------- */
  /** Live, targetable enemies whose body intersects circle (x,y,r). Returns count written into out. */
  query(x: number, y: number, r: number, out: Int32Array = this.qres): number {
    const n = this.hash.query(x, y, r + 64, this.qbuf);
    const st = ++this.qstamp; const items = this.enemies.items; let k = 0;
    for (let i = 0; i < n; i++) {
      const id = this.qbuf[i]; const e = items[id];
      if (e.dead || e.qs === st || e.phase > 0.5 || e.spawnT > 0.3) continue;
      e.qs = st;
      const rr = r + e.r; const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy <= rr * rr) out[k++] = id;
    }
    return k;
  }
  nearest(x: number, y: number, maxR: number, skipUid = 0): Enemy | null {
    let best: Enemy | null = null, bd = maxR * maxR;
    for (let rr = 160; ; rr *= 2) {
      const R = Math.min(rr, maxR);
      const n = this.query(x, y, R, this.qres2);
      for (let i = 0; i < n; i++) { const e = this.enemies.items[this.qres2[i]]; if (e.uid === skipUid) continue; const dx = e.x - x, dy = e.y - y; const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = e; } }
      if (best || R >= maxR) return best;
    }
  }
  randomOnScreen(): Enemy | null {
    const n = this.enemies.n; if (!n) return null;
    for (let tries = 0; tries < 12; tries++) {
      const e = this.enemies.items[Math.floor(rng.next() * n)];
      if (e.dead || e.phase > 0.5) continue;
      if (Math.abs(e.x - this.camX) < this.viewW * 0.5 && Math.abs(e.y - this.camY) < this.viewH * 0.5) return e;
    }
    return this.nearest(this.player.x, this.player.y, 600);
  }

  /* ---------------- spawning ---------------- */
  spawnEnemy(id: string, x: number, y: number, rank = 0): Enemy | null {
    const def = ENEMY_BY_ID[id]; if (!def) return null;
    const e = this.enemies.spawn(); if (!e) return null;
    const spr = def.behavior === 'boss' ? enemySprites('golem', this.theme) : enemySprites(id, this.theme);
    e.reset(def, spr, x, y);
    e.name = this.arena.names[id] || id;
    e.maxHp = e.hp = def.hp * this.enemyHpMult * (rank === 1 ? 6 + this.t / 60 * 0.25 : 1);
    e.dmg = def.dmg * this.enemyDmgMult * (rank === 1 ? 1.5 : 1);
    e.rank = rank;
    if (rank === 1) { e.r *= 1.45; e.xp *= 12; e.mass *= 3; e.speed *= 0.95; }
    return e;
  }
  proj(kind: number, frame: string | null, x: number, y: number, vx: number, vy: number, r: number, dmg: number, life: number, hostile: boolean, slot = -1): Proj | null {
    const p = this.projs.spawn(); if (!p) return null;
    p.kind = kind; p.frame = frame ? (fxFramesCache[frame] || null) : null;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.r = r; p.dmg = dmg; p.life = life; p.t = 0; p.hostile = hostile; p.slot = slot;
    p.pierce = 1; p.hn = 0; p.rot = Math.atan2(vy, vx); p.spin = 0; p.knock = 30; p.aoe = 0; p.bounce = 0; p.scale = 1; p.special = 0; p.ret = 0; p.crit = 0; p.arc = 0;
    p.ox = x; p.oy = y;
    return p;
  }
  zone(kind: number, x: number, y: number, r: number, life: number, dmg: number, hostile: boolean, slot = -1): Zone | null {
    const z = this.zones.spawn(); if (!z) return null;
    z.kind = kind; z.x = x; z.y = y; z.r = r; z.life = z.max = life; z.dmg = dmg; z.hostile = hostile; z.slot = slot;
    z.tick = 0.3; z.tt = 0; z.slow = 0; z.delay = 0; z.max = life; z.col = '#ffffff'; z.grow = 0; z.special = 0; z.vx = z.vy = 0; z.a = 0; z.len = 0; z.w = 0;
    return z;
  }
  pickup(kind: number, x: number, y: number, v: number) {
    if (kind === PU.GEM && this.pickups.n > 900) {
      // merge into a random existing gem to cap counts
      const it = this.pickups.items[Math.floor(rng.next() * this.pickups.n)];
      if (it.kind === PU.GEM && !it.dead) { it.v += v; return; }
    }
    const p = this.pickups.spawn(); if (!p) return;
    p.kind = kind; p.x = x; p.y = y; p.v = v; p.mag = false; p.t = 0;
    const a = rng.next() * 6.28, s = 40 + rng.next() * 60; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
  }

  /* ---------------- damage ---------------- */
  critRoll(): number { const P = this.player; return rng.next() < P.stats.crit + P.dyn.crit ? P.stats.critMult : 1; }
  /** Returns damage actually dealt. */
  damage(e: Enemy, base: number, sx: number, sy: number, knock: number, slot: number, forceCrit = false): number {
    if (e.dead || e.spawnT > 0.3) return 0;
    const P = this.player;
    let crit = forceCrit ? P.stats.critMult : this.critRoll();
    let dmg = base * crit;
    if (e.burnT > 0) dmg *= 1.25;
    // boss shield: only the sprint breaks it
    if (e.shield > 0) { if (rng.next() < 0.25) burst(e.x + (sx - e.x) * 0.5, e.y + (sy - e.y) * 0.5, 2, '#9ff0ff', 120, 6); return 0; }
    // shielded enemies block frontal hits
    if (e.def.behavior === 'shielded') {
      const dx = sx - e.x, dy = sy - e.y; const l = Math.hypot(dx, dy) || 1;
      if ((dx / l) * e.sx + (dy / l) * e.sy > 0.62) { dmg *= 0.2; crit = 1; if (rng.next() < 0.3) burst(e.x + e.sx * e.r, e.y + e.sy * e.r, 3, '#dfe5ec', 140, 6); }
    }
    if (e === this.boss && this.bossVuln > 1) dmg *= this.bossVuln;
    dmg = Math.max(1, dmg);
    const eff = Math.min(dmg, Math.max(0, e.hp)); e.hp -= dmg; e.flash = 0.12;
    this.stats.dmgDealt += eff; if (dmg > this.stats.bestHit) this.stats.bestHit = dmg;
    if (slot >= 0 && slot < P.weapons.length) P.weapons[slot].dmgDone += dmg;
    P.ultCharge = Math.min(1, P.ultCharge + dmg / (900 + P.level * 90));
    dmgNumber(e.x, e.y - e.r - 6, dmg, crit > 1 ? 1 : 0);
    if (knock > 0) { const dx = e.x - sx, dy = e.y - sy; const l = Math.hypot(dx, dy) || 1; const k = knock / Math.max(1, e.mass); e.kx += (dx / l) * k; e.ky += (dy / l) * k; }
    if (e.hp <= 0) this.kill(e, slot);
    return dmg;
  }
  kill(e: Enemy, slot = -1) {
    if (e.dead) return;
    e.dead = true;
    const S = this.stats; S.kills++; S.killsBy[e.def.id] = (S.killsBy[e.def.id] || 0) + 1;
    const P = this.player;
    if (slot >= 0 && slot < P.weapons.length) P.weapons[slot].kills++;
    // drops
    const xp = e.xp;
    this.pickup(PU.GEM, e.x, e.y, xp);
    const luck = P.stats.luck;
    if (rng.next() < 0.03 * luck) this.pickup(PU.GOLD, e.x + 6, e.y, 1 + Math.floor(rng.next() * 3));
    if (rng.next() < 0.004 * luck) this.pickup(PU.HEAL, e.x - 6, e.y, 30);
    if (rng.next() < 0.0012 * luck) this.pickup(PU.MAGNET, e.x, e.y + 6, 0);
    if (rng.next() < 0.0012 * luck) this.pickup(PU.BOMB, e.x, e.y - 6, 0);
    if (e.rank >= 1) {
      this.pickup(PU.CHEST, e.x, e.y, e.rank);
      this.pickup(PU.GOLD, e.x + 12, e.y, 10 * e.rank);
      if (e.rank === 1) S.elites++;
    }
    // fx
    const col = e.rank >= 2 ? '#ffd166' : this.theme === 'neon' ? '#22e5ff' : this.theme === 'volcano' ? '#ff6a1a' : '#ff9ec7';
    burst(e.x, e.y - e.r * 0.5, e.rank ? 26 : 7, col, e.rank ? 280 : 150, e.rank ? 16 : 9);
    if (e.rank >= 1) { shake(e.rank >= 2 ? 10 : 5); }
    // behaviors on death
    const d = e.def;
    if (d.behavior === 'splitter' && d.splitInto) {
      for (let k = 0; k < (d.splitCount || 2); k++) { const c = this.spawnEnemy(d.splitInto, e.x + (k ? 10 : -10), e.y, 0); if (c) { c.spawnT = 0; c.kx = (k ? 1 : -1) * 120; } }
    }
    sfx.kill(e.rank);
    this.ev.enemyKilled(e);
    if (e === this.boss) { this.boss = null; }
  }
  explode(x: number, y: number, r: number, dmg: number, hostileToPlayer: boolean, slot: number, col = '#ff9f43', knock = 160) {
    const n = this.query(x, y, r, this.qres2);
    for (let i = 0; i < n; i++) { const e = this.enemies.items[this.qres2[i]]; this.damage(e, hostileToPlayer ? dmg * 0.6 : dmg, x, y, knock, slot); }
    if (hostileToPlayer) { const P = this.player; const dx = P.x - x, dy = P.y - y; if (dx * dx + dy * dy < (r + P.r) * (r + P.r)) this.hurtPlayer(dmg, x, y, 3); }
    const z = this.zone(ZK.BLAST, x, y, r, 0.35, 0, false); if (z) z.col = col;
    burst(x, y, 16, col, r * 4, 14, 0.5);
    for (let k = 0; k < 4; k++) particle(3, frameId('smoke'), x + (rng.next() - 0.5) * r, y + (rng.next() - 0.5) * r, 0, -20, 0.9, r * 0.8, 1);
    shake(Math.min(8, r / 12));
    sfx.boom(r);
  }
  hurtPlayer(dmg: number, sx: number, sy: number, src = 0) {
    const P = this.player;
    if (P.invuln > 0 || P.downT > 0 || this.invulnMenu || P.dashT > 0) return;
    const d = Math.max(1, Math.round(dmg * 0.85 - P.stats.armor - P.dyn.armor));
    P.hp -= d; P.invuln = 0.85; P.hitT = 0.25;
    this.stats.dmgTaken += d; this.stats.dmgBy[src] += d;
    dmgNumber(P.x, P.y - 70, d, 3);
    screen.vignetteHurt = Math.min(1, screen.vignetteHurt + 0.5);
    shake(4); sfx.hurt();
    const dx = P.x - sx, dy = P.y - sy; const l = Math.hypot(dx, dy) || 1; P.vx += dx / l * 120; P.vy += dy / l * 120;
    if (P.hp <= 0) this.playerDown();
  }
  healPlayer(v: number) {
    const P = this.player; const b = P.hp; P.hp = Math.min(P.maxHp, P.hp + v); const got = P.hp - b;
    if (got >= 1) { dmgNumber(P.x, P.y - 70, got, 2); this.stats.healed += got; }
  }
  playerDown() {
    const P = this.player;
    P.hp = 0; P.downT = 4.5 - Math.min(2.5, P.stats.revival); this.stats.falls++; P.falls++;
    // second wind: shove the horde back, lose the current level's progress
    P.xp = 0;
    this.ev.playerDown();
    flash('#ff4d5e', 0.6); shake(12);
    const n = this.query(P.x, P.y, 260, this.qres2);
    for (let i = 0; i < n; i++) { const e = this.enemies.items[this.qres2[i]]; const dx = e.x - P.x, dy = e.y - P.y; const l = Math.hypot(dx, dy) || 1; e.kx += dx / l * 600 / e.mass; e.ky += dy / l * 600 / e.mass; e.stunT = 1.5; }
  }
  addXp(v: number) {
    const P = this.player;
    const g = v * P.stats.growth * P.dyn.xp;
    P.xp += g; this.stats.xp += g;
    while (P.xp >= P.xpNext) { P.xp -= P.xpNext; P.level++; P.xpNext = xpFor(P.level); this.pendingLevels++; this.stats.maxLevel = P.level; }
  }

  /* ---------------- per-frame ---------------- */
  update(dt: number, director: { update(dt: number): void }) {
    this.t += dt;
    const P = this.player;
    // player movement & timers
    this.updatePlayer(dt);
    // enemies (AI + motion), then hash rebuild
    updateEnemies(this, dt * this.slowMo, dt);
    this.hash.clear();
    const E = this.enemies.items;
    for (let i = 0; i < this.enemies.n; i++) { const e = E[i]; if (!e.dead) this.hash.insert(i, e.x, e.y); }
    // weapons
    if (P.downT <= 0) updateWeapons(this, dt);
    this.updateProjectiles(dt);
    this.updateZones(dt);
    this.updatePickups(dt);
    this.contactDamage();
    director.update(dt);
    updateParticles(dt); updateNumbers(dt); updateScreen(dt);
    // compact
    this.enemies.compact(); this.projs.compact(); this.zones.compact(); this.pickups.compact();
  }
  updatePlayer(dt: number) {
    const P = this.player;
    P.invuln = Math.max(0, P.invuln - dt); P.hitT = Math.max(0, P.hitT - dt);
    P.dashCd = Math.max(0, P.dashCd - dt); P.ultT = Math.max(0, P.ultT - dt);
    if (P.downT > 0) {
      P.downT -= dt;
      if (P.downT <= 0) { P.hp = Math.round(P.maxHp * (0.5 + Math.min(0.5, P.stats.revival * 0.1))); P.invuln = 2.5; this.ev.banner('SECOND WIND!', 'Back on the bike — keep pedaling', 1600); ring(P.x, P.y, 30, '#5ef38c', 400, 12); sfx.revive(); }
      P.vx *= 0.9; P.vy *= 0.9; P.x += P.vx * dt; P.y += P.vy * dt;
      return;
    }
    if (P.stats.regen > 0 && P.hp < P.maxHp) P.hp = Math.min(P.maxHp, P.hp + P.stats.regen * dt);
    let sp = P.speedFor(P.lastPct);
    if (P.dashT > 0) { P.dashT -= dt; sp *= 3.1; if (rng.next() < 0.7) particle(0, glowId(P.char.look.jersey), P.x - P.hx * 20, P.y - 20, -P.hx * 60, -P.hy * 60, 0.35, 18, 3); }
    P.speedNow = sp;
    // knockback velocity decays
    P.vx *= Math.exp(-dt * 8); P.vy *= Math.exp(-dt * 8);
    const mx = P.hx * sp + P.vx, my = P.hy * sp + P.vy;
    P.x += mx * dt; P.y += my * dt;
    this.stats.distance += Math.hypot(mx, my) * dt;
    P.anim += dt * Math.max(0.4, (P.lastPct > 0.05 ? 1 : 0.2)) * 9;
  }
  updateProjectiles(dt: number) {
    const A = this.projs.items; const P = this.player; const E = this.enemies.items;
    for (let i = 0; i < this.projs.n; i++) {
      const p = A[i]; if (p.dead) continue;
      p.t += dt; p.life -= dt;
      if (p.kind === PK.BOTTLE) { // lob: fly to target, land into puddle
        const u = clamp(p.t / p.arc, 0, 1);
        p.x = p.ox + (p.tx - p.ox) * u; p.y = p.oy + (p.ty - p.oy) * u; p.rot += dt * 10;
        if (u >= 1) { p.dead = true; landBottle(this, p); }
        continue;
      }
      if (p.kind === PK.BOOMER) boomerangStep(this, p, dt);
      else { p.x += p.vx * dt; p.y += p.vy * dt; }
      p.rot += p.spin * dt;
      if (p.life <= 0) { p.dead = true; if (p.aoe > 0 && !p.hostile) projBlast(this, p); continue; }
      if (p.hostile) {
        const dx = P.x - p.x, dy = P.y - 24 - p.y; const rr = p.r + P.r * 0.7;
        if (dx * dx + dy * dy < rr * rr) { this.hurtPlayer(p.dmg, p.x, p.y, 1); p.dead = true; burst(p.x, p.y, 6, '#ff4dff', 140, 8); }
        continue;
      }
      const n = this.query(p.x, p.y, p.r);
      for (let k = 0; k < n && !p.dead; k++) {
        const e = E[this.qres[k]];
        let seen = false; for (let h = 0; h < p.hn; h++) if (p.hits[h] === e.uid) { seen = true; break; }
        if (seen) continue;
        if (p.kind === PK.BOOMER || p.kind === PK.WHEEL) { if (e.imm[p.slot & 7] > this.t) continue; }
        // shielded front blocks small projectiles
        if (e.def.behavior === 'shielded' && p.kind === PK.DART) {
          const l = Math.hypot(p.vx, p.vy) || 1; if ((-p.vx / l) * e.sx + (-p.vy / l) * e.sy > 0.62) { p.dead = true; burst(p.x, p.y, 4, '#dfe5ec', 160, 6); sfx.tink(); break; }
        }
        this.damage(e, p.dmg, p.x - p.vx * 0.02, p.y - p.vy * 0.02, p.knock, p.slot, p.crit > 0);
        if (p.kind === PK.BOOMER || p.kind === PK.WHEEL) e.imm[p.slot & 7] = this.t + 0.45;
        else if (p.hn < p.hits.length) p.hits[p.hn++] = e.uid;
        burst(p.x, p.y, 2, p.tint, 120, 7, 0.25);
        if (p.aoe > 0) { p.dead = true; projBlast(this, p); break; }
        if (p.bounce > 0) { // ricochet to next target
          const nx = this.nearest(p.x, p.y, 320, e.uid);
          if (nx) { const sp = Math.hypot(p.vx, p.vy); const dx = nx.x - p.x, dy = nx.y - p.y; const l = Math.hypot(dx, dy) || 1; p.vx = dx / l * sp; p.vy = dy / l * sp; p.bounce--; p.life = Math.max(p.life, 0.8); }
        }
        if (--p.pierce <= 0) { p.dead = true; break; }
      }
      // cull far away
      if (Math.abs(p.x - P.x) > 1600 || Math.abs(p.y - P.y) > 1600) p.dead = true;
    }
  }
  updateZones(dt: number) {
    const Z = this.zones.items; const E = this.enemies.items; const P = this.player;
    for (let i = 0; i < this.zones.n; i++) {
      const z = Z[i]; if (z.dead) continue;
      if (z.delay > 0) { z.delay -= dt; if (z.delay <= 0) hazardFire(this, z); continue; }
      z.life -= dt; if (z.life <= 0) { z.dead = true; continue; }
      if (z.grow) z.r += z.grow * dt;
      if (z.vx || z.vy) { z.x += z.vx * dt; z.y += z.vy * dt; }
      if (z.kind === ZK.BEAM && z.special) { z.a += z.vx * dt; z.x = P.x; z.y = P.y - 26; }
      if (z.dmg <= 0) continue;
      z.tt -= dt; if (z.tt > 0) continue; z.tt = z.tick;
      if (z.hostile && z.kind === ZK.LASER_LINE) {
        const ax = Math.cos(z.a), ay = Math.sin(z.a); const rx = P.x - z.x, ry = P.y - 20 - z.y;
        if (Math.abs(rx * ax + ry * ay) < z.len / 2 && Math.abs(-rx * ay + ry * ax) < z.w * 0.6 + P.r * 0.4) this.hurtPlayer(z.dmg, P.x - ay * 10, P.y + ax * 10, 2);
        z.tt = 0.25; continue;
      }
      if (z.hostile) {
        const dx = P.x - z.x, dy = P.y - z.y;
        if (dx * dx + dy * dy < (z.r + P.r * 0.5) * (z.r + P.r * 0.5)) this.hurtPlayer(z.dmg, z.x, z.y, 2);
        continue;
      }
      if (z.kind === ZK.BEAM) { beamHit(this, z.x, z.y, z.a, z.len, z.w, z.dmg, z.slot, 20); continue; }
      const n = this.query(z.x, z.y, z.r);
      for (let k = 0; k < n; k++) {
        const e = E[this.qres[k]];
        this.damage(e, z.dmg, z.x, z.y, 0, z.slot);
        if (z.slow > 0) { e.slowT = 0.4; e.slowF = Math.min(e.slowF, 1 - z.slow); }
        if (z.kind === ZK.FIRE && z.special) e.burnT = 1.5;
      }
    }
  }
  updatePickups(dt: number) {
    const A = this.pickups.items; const P = this.player;
    const mag = P.stats.magnet; const mag2 = mag * mag;
    const px = P.x, py = P.y - 20;
    for (let i = 0; i < this.pickups.n; i++) {
      const p = A[i]; if (p.dead) continue;
      p.t += dt;
      const dx = px - p.x, dy = py - p.y; const d2 = dx * dx + dy * dy;
      if (p.kind === PU.CHEST && d2 > 40 * 40 && !p.mag) { p.vx *= 0.9; p.vy *= 0.9; p.x += p.vx * dt; p.y += p.vy * dt; continue; }
      if (!p.mag && d2 < mag2 && P.downT <= 0) p.mag = true;
      else if (!p.mag && d2 < mag2 * 4 && p.kind <= PU.GOLD) { const d = Math.sqrt(d2) || 1; p.x += dx / d * 70 * dt; p.y += dy / d * 70 * dt; }
      if (p.mag) {
        const d = Math.sqrt(d2) || 1; const sp = 260 + p.t * 120 + P.speedNow;
        p.vx += (dx / d * sp - p.vx) * Math.min(1, dt * 9); p.vy += (dy / d * sp - p.vy) * Math.min(1, dt * 9);
        if (d < 22) { p.dead = true; this.collect(p); continue; }
      } else { p.vx *= Math.exp(-dt * 5); p.vy *= Math.exp(-dt * 5); }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (!p.mag && (Math.abs(dx) > 2600 || Math.abs(dy) > 2600) && p.kind === PU.GEM) p.dead = true;
    }
  }
  collect(p: Pickup) {
    const P = this.player; this.stats.pickups++;
    switch (p.kind) {
      case PU.GEM: this.addXp(p.v); sfx.gem(); break;
      case PU.GOLD: { const g = Math.round(p.v * P.stats.greed); this.stats.gold += g; sfx.coin(); dmgNumber(P.x, P.y - 80, g, 4); break; }
      case PU.HEAL: this.healPlayer(p.v * (P.char.style === 'domestique' ? 1.5 : 1)); sfx.heal(); burst(P.x, P.y - 30, 12, '#5ef38c', 160, 10); break;
      case PU.MAGNET: for (let i = 0; i < this.pickups.n; i++) { const q = this.pickups.items[i]; if (q.kind === PU.GEM || q.kind === PU.GOLD) q.mag = true; } sfx.magnet(); ring(P.x, P.y, 24, '#4cc9f0', 600, 10); break;
      case PU.BOMB: this.bomb(); break;
      case PU.CHEST: this.pendingChests.push(p.v); this.stats.chests++; sfx.chest(); break;
    }
  }
  bomb() {
    const P = this.player; this.stats.bombs++;
    flash('#ffffff', 0.8); shake(14); sfx.boom(300);
    ring(P.x, P.y, 48, '#ffd166', 900, 16);
    const E = this.enemies.items;
    for (let i = 0; i < this.enemies.n; i++) {
      const e = E[i]; if (e.dead) continue;
      if (Math.abs(e.x - this.camX) < this.viewW * 0.6 && Math.abs(e.y - this.camY) < this.viewH * 0.6) this.damage(e, e.rank >= 2 ? 120 : 9999, P.x, P.y, 300, -1);
    }
  }
  contactDamage() {
    const P = this.player; if (P.downT > 0) return;
    const n = this.query(P.x, P.y - 14, P.r * 0.8);
    for (let k = 0; k < n; k++) { const e = this.enemies.items[this.qres[k]]; if (e.stunT > 0) continue; this.hurtPlayer(e.dmg, e.x, e.y); break; }
  }
}

/* -------- helpers shared with weapons (kept here to avoid circular init order) -------- */
import { fxFrames } from '../art/fxart';
const fxFramesCache = fxFrames();
import { landBottle, projBlast, boomerangStep, beamHit } from './weapons';
import { hazardFire } from './hazards';
export type { Enemy };

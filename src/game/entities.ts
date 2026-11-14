/**
 * Pooled entities. Every pool is preallocated; the first `n` items are live.
 * Entities are flagged dead during the frame and compacted (swap-remove) once at the end,
 * so indices stay stable while the spatial hash is in use.
 */
import type { EnemyDef } from './types';
import type { EnemySprites } from '../art/enemies';
import type { Frame } from '../art/common';

export class Pool<T extends { dead: boolean }> {
  items: T[]; n = 0; readonly cap: number;
  constructor(make: () => T, cap: number) { this.cap = cap; this.items = new Array(cap); for (let i = 0; i < cap; i++) this.items[i] = make(); }
  spawn(): T | null { if (this.n >= this.cap) return null; const it = this.items[this.n++]; it.dead = false; return it; }
  compact(onRemove?: (it: T) => void) {
    const a = this.items; let i = 0;
    while (i < this.n) {
      const it = a[i];
      if (it.dead) { if (onRemove) onRemove(it); const last = a[this.n - 1]; a[this.n - 1] = it; a[i] = last; this.n--; }
      else i++;
    }
  }
  clear() { for (let i = 0; i < this.n; i++) this.items[i].dead = true; this.n = 0; }
}

let UID = 1;
export class Enemy {
  dead = true; uid = 0; def!: EnemyDef; spr!: EnemySprites; name = '';
  x = 0; y = 0; vx = 0; vy = 0; kx = 0; ky = 0; r = 10;
  hp = 1; maxHp = 1; dmg = 1; speed = 50; xp = 1; mass = 1;
  rank = 0; // 0 normal, 1 elite, 2 mini-boss, 3 final boss
  t = 0; cd = 0; st = 0; sx = 0; sy = 0; aux = 0; aux2 = 0;
  flash = 0; slowT = 0; slowF = 1; stunT = 0; burnT = 0; face = 1; anim = 0; spawnT = 0;
  qs = 0; imm = new Float32Array(8);
  shield = 0; // boss shield 0..1 (only sprint breaks it)
  phase = 0;  // phaser visibility / boss phase
  frenzy = 1;
  reset(def: EnemyDef, spr: EnemySprites, x: number, y: number) {
    this.uid = UID++; this.def = def; this.spr = spr; this.x = x; this.y = y;
    this.vx = this.vy = this.kx = this.ky = 0; this.r = def.r; this.hp = this.maxHp = def.hp; this.dmg = def.dmg; this.speed = def.speed;
    this.xp = def.xp; this.mass = def.mass; this.rank = 0; this.t = Math.random() * 10; this.cd = 1 + Math.random() * 2; this.st = 0;
    this.sx = this.sy = this.aux = this.aux2 = 0; this.flash = 0; this.slowT = 0; this.slowF = 1; this.stunT = 0; this.burnT = 0; this.face = 1; this.anim = Math.random() * 4;
    this.spawnT = 0.35; this.qs = 0; this.imm.fill(0); this.shield = 0; this.phase = 0; this.frenzy = 1;
  }
}

export class Proj {
  dead = true; kind = 0; frame: Frame | null = null; tint = '#fff';
  x = 0; y = 0; vx = 0; vy = 0; r = 6; dmg = 1; pierce = 1; life = 1; t = 0;
  hostile = false; slot = -1; hits = new Int32Array(10); hn = 0;
  rot = 0; spin = 0; knock = 0; aoe = 0; bounce = 0; scale = 1; special = 0;
  ox = 0; oy = 0; ret = 0; // boomerang
  tx = 0; ty = 0; arc = 0; // lob target
  crit = 0;
}
export const PK = { DART: 1, SHURIKEN: 2, WHEEL: 3, BALL: 4, BOTTLE: 5, DRONE: 6, BOOMER: 7, ORB: 8, ORB_FIRE: 9, ORB_CYAN: 10, BOMBLET: 11, ROCK: 12 } as const;

export class Zone {
  dead = true; kind = 0; x = 0; y = 0; r = 10; life = 1; max = 1; dmg = 0; tick = 0.3; tt = 0;
  hostile = false; slot = -1; slow = 0; delay = 0; col = '#fff'; grow = 0; special = 0; vx = 0; vy = 0; a = 0; len = 0; w = 0;
}
export const ZK = { PUDDLE: 1, FIRE: 2, TELEGRAPH: 3, BLAST: 4, RING: 5, SLASH: 6, BEAM: 7, BOLT: 8, HAZARD_PATCH: 9, LASER_LINE: 10, SHOCK: 11 } as const;

export class Pickup {
  dead = true; kind = 0; x = 0; y = 0; v = 0; mag = false; vx = 0; vy = 0; t = 0;
}
export const PU = { GEM: 0, GOLD: 1, HEAL: 2, MAGNET: 3, BOMB: 4, CHEST: 5 } as const;

/** Shared gameplay types. Content lives in src/data/*.ts and is fully data-driven. */

export interface Stats {
  might: number;      // damage multiplier
  cooldown: number;   // cooldown multiplier (lower = faster)
  area: number;       // area multiplier
  projSpeed: number;  // projectile speed multiplier
  duration: number;   // duration multiplier
  amount: number;     // extra projectiles
  move: number;       // move speed multiplier
  magnet: number;     // pickup radius (world units)
  luck: number;       // luck multiplier
  growth: number;     // xp multiplier
  greed: number;      // gold multiplier
  maxHp: number;
  armor: number;      // flat damage reduction
  regen: number;      // hp per second
  crit: number;       // crit chance 0..1
  critMult: number;
  revival: number;    // second-wind speed (faster revive, fewer penalties)
}
export function baseStats(): Stats {
  return { might: 1, cooldown: 1, area: 1, projSpeed: 1, duration: 1, amount: 0, move: 1, magnet: 105, luck: 1, growth: 1, greed: 1, maxHp: 100, armor: 0, regen: 0, crit: 0.05, critMult: 2, revival: 0 };
}

export type WeaponBehavior = 'shot' | 'whip' | 'cannon' | 'aura' | 'lob' | 'orbit' | 'strike' | 'boomerang' | 'beam' | 'trail';
export interface WStats {
  dmg: number; cd: number; area: number; speed: number; dur: number; amount: number; pierce: number; knock: number;
  aoe: number;        // blast radius / puddle radius / aura radius
  tick: number;       // damage tick interval for zones
  bounce: number;     // ricochets / chain count
  special: number;    // behavior-specific flag (evolutions)
}
export interface WeaponDef {
  id: string; name: string; desc: string; behavior: WeaponBehavior;
  color: string;
  base: WStats;
  /** per-level additive deltas (index 0 = level 2) with short text */
  levels: [string, Partial<WStats>][];
  evo?: { with: string; into: string };
  evolved?: boolean;
}
export interface PassiveDef {
  id: string; name: string; desc: string; max: number; color: string;
  /** apply level n (1-based) worth of effect */
  apply: (s: Stats, lv: number) => void;
  per: string; // per-level description
}

export type EnemyBehavior = 'chase' | 'swarm' | 'charger' | 'ranged' | 'splitter' | 'shielded' | 'exploder' | 'phaser' | 'healer' | 'boss';
export interface EnemyDef {
  id: string; behavior: EnemyBehavior;
  hp: number; speed: number; dmg: number; r: number; xp: number; mass: number;
  range?: number; fireCd?: number; projSpeed?: number; projDmg?: number;
  chargeSpeed?: number; chargeCd?: number; windup?: number;
  splitInto?: string; splitCount?: number;
  fuse?: number; blastR?: number; blastDmg?: number;
  healR?: number; healPct?: number;
  hidden?: boolean; // not spawned by the director directly
}

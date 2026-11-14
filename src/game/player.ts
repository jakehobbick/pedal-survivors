/** The rider: stats, steering, power→speed/attack mapping, abilities, damage & second wind. */
import { Stats, baseStats, WStats, WeaponDef } from './types';
import { WEAPON_BY_ID, PASSIVE_BY_ID, MAX_WEAPON_LV } from '../data/weapons';
import { CharacterDef } from '../data/characters';
import { input, consume } from '../core/input';
import { settings, FTP } from '../core/settings';
import { clamp } from '../core/math';
import { sensors } from '../trainer/sensors';
import { trainer } from '../trainer/control';
import { sim } from '../trainer/sim';
import type { RiderSheet } from '../art/rider';

export class WeaponInst {
  def: WeaponDef; lv = 1; cdT = 0.4; s!: WStats; slot: number;
  dmgDone = 0; kills = 0; st = 0; t = 0; ang = 0; side = 1; aux = 0;
  constructor(def: WeaponDef, slot: number) { this.def = def; this.slot = slot; this.recompute(); }
  recompute() {
    const s = { ...this.def.base };
    for (let i = 0; i < this.lv - 1 && i < this.def.levels.length; i++) {
      const d = this.def.levels[i][1];
      for (const k in d) (s as any)[k] += (d as any)[k];
    }
    this.s = s;
  }
  get maxed() { return this.def.evolved || this.lv >= MAX_WEAPON_LV; }
}
export interface PassiveInst { id: string; lv: number }

/** dynamic per-frame modifiers from power, cadence, surge, character style */
export interface Dyn { dmg: number; cd: number; move: number; area: number; armor: number; crit: number; rate: number; xp: number; surge: number }

export class Player {
  x = 0; y = 0; hx = 1; hy = 0; tx = 1; ty = 0; vx = 0; vy = 0; r = 16;
  face = 1; anim = 0; hitT = 0; invuln = 0;
  hp = 100; maxHp = 100;
  level = 1; xp = 0; xpNext = 15;
  weapons: WeaponInst[] = []; passives: PassiveInst[] = [];
  base: Stats = baseStats(); stats: Stats = baseStats();
  meta: Partial<Stats> = {};
  dyn: Dyn = { dmg: 1, cd: 1, move: 1, area: 1, armor: 0, crit: 0, rate: 1, xp: 1, surge: 0 };
  char!: CharacterDef; sheet!: RiderSheet;
  dashT = 0; dashCd = 0; dashMax = 6; ultCharge = 0; ultT = 0;
  downT = 0; falls = 0;
  steerIdle = 0; speedNow = 0; moving = true;
  rerolls = 0; banishes = 0; skips = 0;
  rateMult = 1; // from ults etc
  lastPct = 0;

  init(c: CharacterDef, sheet: RiderSheet, meta: Partial<Stats>, extra: { rerolls: number; banishes: number; skips: number }) {
    this.char = c; this.sheet = sheet; this.meta = meta;
    const b = baseStats(); b.maxHp = c.base.maxHp; b.move = c.base.move; b.might = c.base.might; b.armor = c.base.armor;
    this.base = b;
    this.weapons = []; this.passives = [];
    this.addWeapon(c.weapon);
    this.rerolls = extra.rerolls + (c.style === 'allrounder' ? 1 : 0); this.banishes = extra.banishes; this.skips = extra.skips;
    this.dashMax = c.style === 'sprinter' ? 4.2 : 6;
    this.recompute(); this.hp = this.maxHp;
    this.x = this.y = 0; this.level = 1; this.xp = 0; this.xpNext = xpFor(1);
  }
  addWeapon(id: string) { const d = WEAPON_BY_ID[id]; const w = new WeaponInst(d, this.weapons.length); w.cdT = 0.3; this.weapons.push(w); return w; }
  recompute() {
    const s: Stats = { ...this.base };
    const m = this.meta as any;
    for (const k in m) { if (k === 'cooldown') s.cooldown *= m[k]; else if (k === 'magnet') s.magnet *= m[k]; else (s as any)[k] += m[k]; }
    for (const p of this.passives) PASSIVE_BY_ID[p.id].apply(s, p.lv);
    if (this.char && this.char.style === 'domestique') s.magnet *= 1.5;
    if (this.char && this.char.style === 'allrounder') s.growth += 0.1;
    const old = this.maxHp; this.stats = s; this.maxHp = Math.round(s.maxHp);
    if (this.maxHp > old) this.hp += this.maxHp - old;
    this.hp = Math.min(this.hp, this.maxHp);
  }
  /** power & cadence → dynamic modifiers (all relative to FTP) */
  updateDyn(surge: number, inBand: boolean) {
    const pct = sensors.p3 / FTP(); this.lastPct = pct;
    const cad = sensors.cadSm;
    const d = this.dyn;
    // attack rate: 55% at 0 W → 100% at FTP → 160% at 2.2x FTP
    d.rate = (pct <= 1 ? 0.55 + 0.45 * clamp(pct, 0, 1) : 1 + 0.5 * clamp(pct - 1, 0, 1.2)) * this.rateMult;
    d.move = 1; d.dmg = 1; d.cd = 1; d.area = 1; d.armor = 0; d.crit = 0; d.xp = 1;
    // cadence sweet spot: 85–100 rpm = +10% crit
    if (cad >= 85 && cad <= 100) d.crit += 0.1;
    const st = this.char.style;
    if (st === 'sprinter' && pct >= 1.2) { d.dmg *= 1.3; d.move *= 1.2; }
    if (st === 'climber') { if (cad > 20 && cad < 80) { d.armor += 2; d.area *= 1.25; } if (trainer.mode === 'gear' && trainer.gear >= 16) d.dmg *= 1.15; }
    if (st === 'tt' && inBand) { d.move *= 1.15; d.cd *= 0.87; }
    if (st === 'allrounder') d.dmg *= 1 + 0.01 * (this.level - 1);
    // surge: up to +50% damage & xp
    d.surge = surge;
    d.dmg *= 1 + surge * 0.5; d.xp *= 1 + surge * 0.5;
  }
  /** movement speed in world units/s from power */
  speedFor(pct: number) {
    const f = 0.35 + 0.65 * clamp(pct, 0, 1) + 0.5 * clamp(pct - 1, 0, 0.8);
    return 225 * f * this.stats.move * this.dyn.move;
  }
  steer(dt: number, auto: (out: { x: number; y: number }) => boolean) {
    let dx = 0, dy = 0; let manual = false;
    if (input.joy.active && (input.joy.x || input.joy.y)) { dx = input.joy.x; dy = input.joy.y; manual = true; }
    else if (settings.steer === '8way') {
      dx = (input.held.right ? 1 : 0) - (input.held.left ? 1 : 0); dy = (input.held.down ? 1 : 0) - (input.held.up ? 1 : 0);
      // tap-only controllers: a press without hold still sets the heading
      if (!dx && !dy) {
        if (consume('right')) dx = 1; if (consume('left')) dx = -1; if (consume('down')) dy = 1; if (consume('up')) dy = -1;
      } else { consume('right'); consume('left'); consume('up'); consume('down'); }
      if (dx || dy) manual = true;
    } else {
      // turn mode: left/right rotate heading (hold = continuous, tap = 30°), down = U-turn
      let rot = 0;
      if (input.held.left) rot -= 3.4 * dt; if (input.held.right) rot += 3.4 * dt;
      if (consume('left') && !input.held.left) rot -= 0.52; if (consume('right') && !input.held.right) rot += 0.52;
      if (consume('down')) rot += Math.PI; consume('up');
      if (rot) { const c = Math.cos(rot), s = Math.sin(rot); const nx = this.tx * c - this.ty * s, ny = this.tx * s + this.ty * c; this.tx = nx; this.ty = ny; this.hx = nx; this.hy = ny; manual = true; }
    }
    if (manual && (dx || dy)) { const l = Math.hypot(dx, dy); this.tx = dx / l; this.ty = dy / l; }
    if (manual) this.steerIdle = 0; else this.steerIdle += dt;
    if ((settings.autopilot || sim.bot) && this.steerIdle > 1.2) {
      const o = { x: 0, y: 0 };
      if (auto(o)) { const l = Math.hypot(o.x, o.y) || 1; this.tx = o.x / l; this.ty = o.y / l; }
    }
    // smooth heading toward target
    const cur = Math.atan2(this.hy, this.hx), tgt = Math.atan2(this.ty, this.tx);
    let da = tgt - cur; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const turn = ((settings.autopilot || sim.bot) && !manual ? 4 : 14) * dt;
    const na = cur + clamp(da, -turn, turn);
    this.hx = Math.cos(na); this.hy = Math.sin(na);
    if (Math.abs(this.hx) > 0.15) this.face = this.hx > 0 ? 1 : -1;
  }
}

export function xpFor(level: number) { return Math.round(10 + level * 7 + Math.pow(Math.max(0, level - 20), 1.5) * 2); }

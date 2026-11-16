/**
 * Wave director: turns the current workout step into enemy pressure.
 * intensity = target power as a fraction of FTP for the current step (or rolling 3-min power in Free Ride).
 * Missing the target raises `pressure` (more & faster enemies) but never ends the run.
 */
import type { World } from './world';
import { rng } from '../core/math';
import { ENEMY_BY_ID } from '../data/enemies';
import { arenaHazard } from './hazards';

export type WaveKind = 'normal' | 'elite' | 'swarm' | 'siege' | 'calm' | 'boss' | 'sprint';
export class Director {
  w: World;
  acc = 0; eliteT = 45; groupT = 8; hazardT = 20;
  intensity = 0.65;
  pressure = 1;        // 1..2.2 (missed target)
  kind: WaveKind = 'normal';
  progress = 0;        // 0..1 through the run
  enabled = true;
  spawnScale = 1;      // debug / stress
  constructor(w: World) { this.w = w; }
  reset() { this.acc = 0; this.eliteT = 45; this.groupT = 8; this.hazardT = 25; this.pressure = 1; this.kind = 'normal'; }
  minutes() { return this.w.t / 60; }
  update(dt: number) {
    const w = this.w; if (!this.enabled) return;
    const m = this.minutes(); const I = Math.max(0.3, this.intensity);
    w.enemyHpMult = w.arena.hpMult * (1 + 0.06 * m + 0.0028 * m * m) * (0.85 + 0.25 * I);
    w.enemyDmgMult = (1 + 0.022 * m) * (this.pressure > 1 ? 1 + (this.pressure - 1) * 0.3 : 1);
    w.enemySpeedMult = 1 + (this.pressure - 1) * 0.25;
    let rate = (0.6 + 0.28 * m) * (0.5 + I * I * 0.6) * this.pressure * this.spawnScale;
    let cap = Math.min(440, 20 + m * 10.5 + I * 60) * this.pressure;
    switch (this.kind) {
      case 'calm': rate *= 0.3; cap *= 0.35; break;
      case 'swarm': rate *= 1.6; break;
      case 'elite': rate *= 0.95; break;
      case 'boss': rate *= 0.3; cap *= 0.35; break;
      case 'sprint': rate *= 0.6; break;
    }
    cap = Math.min(cap * this.spawnScale, 470);
    this.acc += dt * rate;
    while (this.acc >= 1) {
      this.acc -= 1;
      if (w.enemies.n >= cap) { this.acc = 0; break; }
      this.spawnOne();
    }
    // groups (swarm packs)
    this.groupT -= dt;
    if (this.groupT <= 0) { this.groupT = this.kind === 'swarm' ? 3 : this.kind === 'calm' ? 18 : 11 - Math.min(5, m * 0.2); if (w.enemies.n < cap + 20) this.spawnGroup(); }
    // arena hazards (not during calm/boss)
    this.hazardT -= dt;
    if (this.hazardT <= 0) { this.hazardT = 28 + rng.next() * 20; if (this.kind !== 'calm' && this.kind !== 'boss' && m > 2) arenaHazard(w); }
    // elites
    this.eliteT -= dt;
    if (this.eliteT <= 0 && this.kind !== 'calm' && this.kind !== 'boss') {
      this.eliteT = this.kind === 'elite' ? 24 : 60;
      this.spawnOne(1);
    }
  }
  pick(): string {
    const pool = this.w.arena.pool; let tot = 0;
    for (const [id, wt, from] of pool) if (this.progress >= from) tot += wt * this.weightFor(id);
    let r = rng.next() * tot;
    for (const [id, wt, from] of pool) { if (this.progress < from) continue; r -= wt * this.weightFor(id); if (r <= 0) return id; }
    return pool[0][0];
  }
  weightFor(id: string) {
    const b = ENEMY_BY_ID[id].behavior;
    if (this.kind === 'swarm') return b === 'swarm' || b === 'exploder' ? 3 : 0.6;
    if (this.kind === 'siege') return b === 'ranged' || b === 'shielded' || b === 'healer' ? 3 : 0.7;
    if (this.kind === 'elite') return b === 'charger' || b === 'shielded' || b === 'chase' ? 1.6 : 1;
    return 1;
  }
  spawnPos(): [number, number] {
    const w = this.w; const P = w.player;
    const R = Math.hypot(w.viewW, w.viewH) * 0.55 + 40;
    let a: number;
    if (rng.next() < 0.6) a = Math.atan2(P.hy, P.hx) + (rng.next() - 0.5) * 2.2; else a = rng.next() * Math.PI * 2;
    return [P.x + Math.cos(a) * R, P.y + Math.sin(a) * R];
  }
  spawnOne(rank = 0) {
    const [x, y] = this.spawnPos();
    let id = this.pick();
    if (rank === 1 && ENEMY_BY_ID[id].behavior === 'swarm') id = 'goblin';
    return this.w.spawnEnemy(id, x, y, rank);
  }
  spawnGroup() {
    const [x, y] = this.spawnPos();
    const id = rng.next() < 0.6 ? 'gnat' : this.pick();
    const n = 5 + Math.floor(rng.next() * 6);
    for (let i = 0; i < n; i++) this.w.spawnEnemy(id, x + (rng.next() - 0.5) * 90, y + (rng.next() - 0.5) * 90);
  }
}

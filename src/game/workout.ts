/**
 * Workout runtime: walks the template's steps in real time, exposes the target band,
 * tracks compliance, time-in-zone, kJ, the Surge meter and the "missed target" pressure.
 */
import { Step, Template } from '../data/workouts';
import { sensors } from '../trainer/sensors';
import { FTP } from '../core/settings';
import { clamp } from '../core/math';
import { powerZone } from '../ui/hud';

export class WorkoutRuntime {
  tpl: Template; steps: Step[]; idx = 0; stepT = 0; elapsed = 0; total = 0; minutes: number;
  surge = 0; overdriveT = 0;
  inBand = false; below = false; belowT = 0; inBandT = 0;
  targetTime = 0; bandTime = 0; zoneTime = new Float32Array(7); kj = 0;
  overtime = false; overtimeT = 0; done = false;
  rolling = new Float32Array(180); ri = 0; rsum = 0; rN = 0; rolling3 = 0; secAcc = 0; secP = 0;
  surgeMult = 1;
  stepStarted: (s: Step, i: number) => void = () => {};
  constructor(tpl: Template, minutes: number) {
    this.tpl = tpl; this.minutes = minutes; this.steps = tpl.build(minutes);
    this.total = this.steps.reduce((a, s) => a + s.dur, 0);
  }
  get step(): Step { return this.steps[Math.min(this.idx, this.steps.length - 1)]; }
  start() { this.idx = 0; this.stepT = 0; this.stepStarted(this.step, 0); }
  stepLeft() { return Math.max(0, this.step.dur - this.stepT); }
  nextStep(): Step | null { return this.steps[this.idx + 1] || null; }
  label() { return this.step.label; }
  progress() { return clamp(this.elapsed / this.total, 0, 1); }
  /** current target band [lo, hi] as FTP fractions, or null when there is no target */
  targetBand(): [number, number] | null {
    const s = this.step; if (s.kind === 'free' || s.hi <= 0) return null;
    if (s.lo2 != null && s.hi2 != null) { const u = clamp(this.stepT / s.dur, 0, 1); return [s.lo + (s.lo2 - s.lo) * u, s.hi + (s.hi2 - s.hi) * u]; }
    return [s.lo, s.hi];
  }
  targetMid(): number {
    const b = this.targetBand(); if (!b) return clamp(this.rolling3 / FTP(), 0.4, 1.4);
    return b[1] >= 9 ? b[0] : (b[0] + b[1]) / 2;
  }
  /** hold the boss step open (overtime) while the boss lives */
  holdBoss = false;
  update(dt: number): boolean {
    if (this.done) return false;
    const P = sensors.p3, ftp = FTP(), pct = P / ftp;
    this.elapsed += dt; this.stepT += dt;
    this.kj += sensors.power * dt / 1000;
    this.zoneTime[powerZone(pct)] += dt;
    // 1 Hz rolling 3-min average for Free Ride
    this.secAcc += dt; this.secP += sensors.power * dt;
    if (this.secAcc >= 1) { const v = this.secP / this.secAcc; this.secAcc = 0; this.secP = 0; this.rsum -= this.rolling[this.ri]; this.rolling[this.ri] = v; this.rsum += v; this.ri = (this.ri + 1) % 180; this.rN = Math.min(180, this.rN + 1); this.rolling3 = this.rsum / this.rN; }
    // compliance + surge
    const band = this.targetBand(); const s = this.step;
    if (band && s.kind !== 'boss') {
      const lo = band[0], hi = band[1];
      // ±5% grace: tight bands are widened to at least ±5% of target around the middle
      const mid = (lo + hi) / 2; const glo = hi >= 9 ? lo : Math.min(lo, mid - 0.05), ghi = hi >= 9 ? 99 : Math.max(hi, mid + 0.05);
      this.inBand = pct >= glo && pct <= ghi; this.below = pct < glo;
      this.targetTime += dt; if (this.inBand) this.bandTime += dt;
      const intense = s.kind === 'interval' || s.kind === 'sprint' || s.kind === 'tempo' || s.kind === 'endurance';
      if (this.inBand) { this.surge = Math.min(1, this.surge + dt * (intense ? 0.022 : 0.012) * this.surgeMult); this.belowT = 0; this.inBandT += dt; }
      else { this.surge = Math.max(0, this.surge - dt * 0.03); this.inBandT = 0; if (this.below && s.kind !== 'warmup' && s.kind !== 'cooldown' && s.kind !== 'recovery') this.belowT += dt; else this.belowT = 0; }
    } else if (s.kind === 'free') {
      this.inBand = pct >= 0.7; this.below = false;
      if (this.inBand) this.surge = Math.min(1, this.surge + dt * 0.012 * this.surgeMult); else this.surge = Math.max(0, this.surge - dt * 0.02);
    } else { this.inBand = false; this.below = false; }
    if (this.overdriveT > 0) { this.overdriveT -= dt; if (this.overdriveT <= 0) this.surge = 0.45; }
    // advance
    let changed = false;
    if (this.stepT >= s.dur) {
      if (s.kind === 'boss' && this.holdBoss && this.overtimeT < 150) { this.overtime = true; this.overtimeT += dt; }
      else {
        this.overtime = false; this.overtimeT = 0;
        if (this.idx >= this.steps.length - 1) { this.done = true; return true; }
        this.stepT -= s.dur; if (s.kind === 'boss') this.stepT = 0;
        this.idx++; this.stepStarted(this.step, this.idx); changed = true;
      }
    }
    return changed;
  }
  /** jump to the next step (debug / boss killed early) */
  skip() { const s = this.step; this.elapsed += Math.max(0, s.dur - this.stepT); this.stepT = s.dur; }
  compliance() { return this.targetTime > 0 ? this.bandTime / this.targetTime : 0; }
}

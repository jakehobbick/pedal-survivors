/**
 * Simulated trainer: lets every system be tested without hardware.
 *  - Manual: watts / cadence sliders + hold-to-sprint.
 *  - Bot: a scripted rider that follows the workout target (with realistic noise,
 *         occasional fades, and all-out sprints when the boss shield is up).
 * It emulates the trainer too: ERG pulls power to the target with a lag,
 * virtual gears change the cadence needed for a given power.
 */
import { sensors } from './sensors';
import { trainer, gearWatts, rpmFor, gearFor, shift } from './control';
import { FTP } from '../core/settings';
import { clamp, rng } from '../core/math';

export interface BotTarget { lo: number; hi: number; sprint: boolean; free?: boolean }
export const sim = {
  bot: false,
  watts: 150,      // rider intent (manual slider)
  cad: 88,         // manual cadence slider (ERG mode)
  sprint: false,   // manual hold-to-sprint
  getTarget: null as null | (() => BotTarget | null),
  // bot internals
  noise: 0, fade: 0, fadeT: 0, shiftCd: 0, cadWander: 0,
  botSkill: 0.92, // probability-ish of staying on target; lower to test misses
};

export function simTick(dt: number) {
  if (sensors.src !== 'sim') return;
  const ftp = FTP();
  let intent = sim.watts;
  let wantCad = sim.cad;
  if (sim.bot) {
    const t = sim.getTarget ? sim.getTarget() : null;
    // Ornstein-Uhlenbeck noise around target
    sim.noise += (-sim.noise * 0.8 + (rng.next() - 0.5) * 1.6) * dt;
    sim.cadWander += (-sim.cadWander * 0.5 + (rng.next() - 0.5) * 8) * dt;
    if (sim.fadeT > 0) { sim.fadeT -= dt; if (sim.fadeT <= 0) sim.fade = 0; }
    else if (rng.next() < dt * (1 - sim.botSkill) / 6) { sim.fade = rng.chance(0.6) ? -0.14 : 0.12; sim.fadeT = 8 + rng.next() * 14; }
    let frac = 0.7;
    if (t) {
      if (t.sprint) frac = 1.8 + sim.noise * 0.05;
      else if (t.free) frac = 0.72 + 0.35 * Math.max(0, Math.sin(performance.now() / 47000)) + sim.noise * 0.03;
      else frac = (t.lo + t.hi) / 2 + sim.noise * 0.018 + sim.fade;
    }
    intent = clamp(frac, 0.2, 2.6) * ftp;
    wantCad = (t && t.sprint ? 104 : 89) + sim.cadWander;
    sim.watts = Math.round(intent);
    sim.cad = Math.round(wantCad);
    // bot shifts to keep cadence ~90 in gear mode
    if (trainer.mode === 'gear') {
      sim.shiftCd -= dt;
      if (sim.shiftCd <= 0) {
        const g = gearFor(intent / ftp * Math.pow(90 / clamp(wantCad, 60, 120), 1));
        if (g !== trainer.gear) { shift(g > trainer.gear ? 1 : -1); sim.shiftCd = 0.35; }
      }
    }
  } else if (sim.sprint) intent = Math.max(intent, 1.8 * ftp);

  let p: number, c: number;
  if (trainer.mode === 'erg') {
    const tgt = trainer.ergFrac * ftp;
    p = sensors.power + (tgt - sensors.power) * (1 - Math.exp(-dt / 1.3)); // ERG lag
    c = clamp(wantCad + (sim.sprint ? 15 : 0), 0, 160);
    if (sim.watts <= 0 && !sim.bot) { p = 0; c = 0; }
  } else {
    // virtual gears: legs deliver intent; cadence follows the gear
    c = clamp(rpmFor(Math.max(1, intent)), 30, 140);
    const target = intent <= 0 ? 0 : gearWatts(c);
    p = sensors.power + (target - sensors.power) * (1 - Math.exp(-dt / 0.5));
    if (intent <= 0) c = 0;
  }
  sensors.power = Math.max(0, p);
  sensors.cadence = c;
  sensors.lastP = sensors.lastC = performance.now();
  if (sim.bot || sensors.hr > 0 || simHr.on) simHrTick(dt);
}
/** crude HR model so HR displays/zones can be tested in sim */
export const simHr = { on: true, v: 95 };
function simHrTick(dt: number) {
  if (!simHr.on || sensors.hrOK) return;
  const tgt = 85 + 95 * clamp(sensors.p3 / FTP(), 0, 1.6) / 1.15;
  simHr.v += (tgt - simHr.v) * (1 - Math.exp(-dt / 25));
  sensors.hr = Math.round(simHr.v);
  sensors.lastHR = performance.now();
}

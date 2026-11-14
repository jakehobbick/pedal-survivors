/**
 * Trainer target + virtual gearing.
 * Modes:
 *  - 'erg'  : trainer holds target watts (intervals, recovery)
 *  - 'gear' : virtual gears. Resistance follows gear + cadence (sprints, free ride, sim-mode intervals)
 * The BLE layer subscribes via onTrainerChange; the sim trainer reads `trainer` directly.
 */
import { settings, FTP } from '../core/settings';
import { clamp } from '../core/math';
import { sensors } from './sensors';

export const GEARS = 24;
export const trainer = {
  mode: 'erg' as 'erg' | 'gear',
  ergFrac: 0.55,       // fraction of FTP when in erg
  gear: 10,            // 1..GEARS
  grade: 0,            // only used in 'grade' gear mode
};
/** Gear ratio factor: watts at 90 rpm = FTP * gearFrac(g). Spans ~0.40x..2.6x FTP. */
export function gearFrac(g = trainer.gear) {
  return 0.40 * Math.pow(2.6 / 0.40, (clamp(g, 1, GEARS) - 1) / (GEARS - 1));
}
/** Target watts for current gear at a cadence (ERG-curve virtual gearing). */
export function gearWatts(cad: number, g = trainer.gear) {
  const k = settings.gearCurve;
  return clamp(FTP() * gearFrac(g) * Math.pow(Math.max(0, cad) / 90, k), 25, 3 * FTP());
}
/** rpm needed for watts in a gear */
export function rpmFor(w: number, g = trainer.gear) { return 90 * Math.pow(w / (FTP() * gearFrac(g)), 1 / settings.gearCurve); }
/** Best gear for a power target at ~90 rpm */
export function gearFor(frac: number) {
  let best = 1, bd = 1e9;
  for (let g = 1; g <= GEARS; g++) { const d = Math.abs(gearFrac(g) - frac); if (d < bd) { bd = d; best = g; } }
  return best;
}

type Listener = (force: boolean) => void;
const listeners: Listener[] = [];
export function onTrainerChange(fn: Listener) { listeners.push(fn); }
function emit(force: boolean) { for (const l of listeners) l(force); }

export function setErg(frac: number) {
  const changed = trainer.mode !== 'erg' || Math.abs(trainer.ergFrac - frac) > 0.001;
  trainer.mode = 'erg'; trainer.ergFrac = frac;
  if (changed) emit(true);
}
export function setGearMode(suggestGear?: number) {
  const changed = trainer.mode !== 'gear';
  trainer.mode = 'gear';
  if (suggestGear && changed) trainer.gear = suggestGear;
  if (changed) emit(true);
}
export function shift(d: number) {
  const ng = clamp(trainer.gear + d, 1, GEARS);
  if (ng === trainer.gear) return false;
  trainer.gear = ng;
  emit(true);
  return true;
}
/** Called every frame; BLE layer throttles writes. */
export function trainerTick() { emit(false); }
/** Current resistance target in watts for display (null if gears with no cadence). */
export function currentTargetW() {
  if (trainer.mode === 'erg') return Math.round(trainer.ergFrac * FTP());
  return Math.round(gearWatts(sensors.cadSm || 0));
}

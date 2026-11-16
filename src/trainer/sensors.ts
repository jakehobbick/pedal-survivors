/**
 * Unified sensor state. Source is either the simulated trainer or Bluetooth.
 * All gameplay reads p3 (3 s average power) and cadSm (smoothed cadence).
 */
export const sensors = {
  src: 'sim' as 'sim' | 'ble',
  power: 0, cadence: 0, hr: 0,
  p3: 0, cadSm: 0, pFast: 0,
  lastP: 0, lastC: 0, lastHR: 0,
  hrOK: false,
};
// 3-second average using a 10 Hz ring buffer (30 slots).
const RING = 30;
const ring = new Float32Array(RING);
let ri = 0, acc = 0, ringSum = 0;

export function updateSensors(dt: number) {
  const now = performance.now();
  if (sensors.src === 'ble') {
    if (now - sensors.lastP > 3000) sensors.power = 0;
    if (now - sensors.lastC > 3000) sensors.cadence = 0;
  }
  if (now - sensors.lastHR > 5000) { sensors.hr = 0; }
  acc += dt;
  while (acc >= 0.1) {
    acc -= 0.1;
    ringSum -= ring[ri]; ring[ri] = sensors.power; ringSum += sensors.power;
    ri = (ri + 1) % RING;
  }
  sensors.p3 = ringSum / RING;
  sensors.pFast += (sensors.power - sensors.pFast) * (1 - Math.exp(-dt / 0.6));
  sensors.cadSm += (sensors.cadence - sensors.cadSm) * (1 - Math.exp(-dt / 0.8));
}
export function resetSensorAvg() { ring.fill(sensors.power); ringSum = sensors.power * RING; sensors.p3 = sensors.power; }

/** 1 Hz ride recorder in preallocated typed arrays (6 h capacity). */
export class Recorder {
  static CAP = 6 * 3600;
  t = new Float64Array(Recorder.CAP);
  p = new Uint16Array(Recorder.CAP);
  c = new Uint8Array(Recorder.CAP);
  hr = new Uint8Array(Recorder.CAP);
  tgt = new Uint16Array(Recorder.CAP); // target watts (0 = none), for share card graph
  step = new Uint8Array(Recorder.CAP); // workout step index per second → TCX laps
  n = 0; start = Date.now();
  private accum = 0;
  private pSum = 0; private cSum = 0; private hSum = 0; private cnt = 0; private hCnt = 0;
  reset() { this.n = 0; this.accum = 0; this.pSum = this.cSum = this.hSum = this.cnt = this.hCnt = 0; }
  /** call every frame with real (unscaled) dt */
  tick(dt: number, targetW: number, stepIdx = 0) {
    this.accum += dt;
    this.pSum += sensors.power * dt; this.cSum += sensors.cadence * dt; this.cnt += dt;
    if (sensors.hr > 0) { this.hSum += sensors.hr * dt; this.hCnt += dt; }
    if (this.accum >= 1) {
      this.accum -= 1;
      if (this.n < Recorder.CAP) {
        const i = this.n++;
        this.t[i] = this.start + i * 1000;
        this.p[i] = Math.round(this.cnt ? this.pSum / this.cnt : 0);
        this.c[i] = Math.min(255, Math.round(this.cnt ? this.cSum / this.cnt : 0));
        this.hr[i] = Math.min(255, Math.round(this.hCnt ? this.hSum / this.hCnt : 0));
        this.tgt[i] = Math.round(targetW); this.step[i] = Math.min(255, stepIdx);
      }
      this.pSum = this.cSum = this.hSum = this.cnt = this.hCnt = 0;
      return true;
    }
    return false;
  }
  /** best average power over a window of w seconds */
  bestAvg(w: number) {
    if (this.n < w) return 0;
    let s = 0, best = 0;
    for (let i = 0; i < this.n; i++) { s += this.p[i]; if (i >= w) s -= this.p[i - w]; if (i >= w - 1 && s > best) best = s; }
    return best / w;
  }
}
export const recorder = new Recorder();

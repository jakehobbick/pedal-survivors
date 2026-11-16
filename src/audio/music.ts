/**
 * Adaptive synthesized music. A lookahead step sequencer (16th notes) builds layers on top of
 * each other as the workout gets harder:
 *   level 0 (warm-up / recovery / cool-down): pad + soft pluck
 *   level 1 (endurance / tempo):              + bass, kick, snare, hats
 *   level 2 (target intervals, sprints):      + driving 16th bass, four-on-the-floor, arpeggio
 *   level 3 (boss):                           + lead line, toms, faster tempo
 * Being IN the target band keeps the top layer playing; drop out of the band and the arp/lead
 * fade away (the music literally rewards hitting the target). Overdrive adds a shimmer octave.
 * Each arena supplies root note, scale and bpm (src/data/arenas.ts).
 */
import { audioCtx, buses } from './sfx';
import { settings } from '../core/settings';

type Arr = { root: number; scale: number[]; bpm: number };
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

let cfg: Arr | null = null;
let timer: number | null = null;
let nextT = 0, step = 0, bar = 0;
let level = 0, levelSm = 0, inBand = true, od = false, ducked = false;
let out: GainNode | null = null, filt: BiquadFilterNode | null = null, delay: DelayNode | null = null, fb: GainNode | null = null;
let noise: AudioBuffer | null = null;
const bandSm = { v: 1 };

function quant(scale: number[], semis: number) {
  const o = Math.floor(semis / 12), r = ((semis % 12) + 12) % 12;
  let best = scale[0], bd = 99; for (const s of scale) { const d = Math.abs(s - r); if (d < bd) { bd = d; best = s; } }
  return o * 12 + best;
}
/** scale-degree -> semitones (wraps octaves) */
function deg(scale: number[], d: number) { const n = scale.length; const o = Math.floor(d / n); return o * 12 + scale[((d % n) + n) % n]; }
function progression(scale: number[]) { return scale.includes(4) ? [0, -3, 5, 7] : [0, 8, 10, 7]; }

function ensureGraph() {
  const ac = audioCtx(); if (!ac) return false;
  if (out) return true;
  out = ac.createGain(); out.gain.value = 0;
  filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 1400; filt.Q.value = 0.6;
  delay = ac.createDelay(1); fb = ac.createGain(); fb.gain.value = 0.28;
  const wet = ac.createGain(); wet.gain.value = 0.22;
  filt.connect(out); filt.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(out);
  out.connect(buses().musicBus);
  const len = ac.sampleRate * 0.5; noise = ac.createBuffer(1, len, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return true;
}
function env(g: GainNode, t: number, a: number, peak: number, dcy: number) {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy);
}
function tone(type: OscillatorType, f: number, t: number, dur: number, vol: number, dest: AudioNode, detune = 0, a = 0.005) {
  const ac = audioCtx()!; const o = ac.createOscillator(); const g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune; env(g, t, a, vol, dur);
  o.connect(g).connect(dest); o.start(t); o.stop(t + a + dur + 0.05);
}
function kick(t: number, v: number) {
  const ac = audioCtx()!; const o = ac.createOscillator(); const g = ac.createGain();
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); env(g, t, 0.002, v, 0.22);
  o.connect(g).connect(out!); o.start(t); o.stop(t + 0.3);
}
function hit(t: number, v: number, f: number, dur: number, type: BiquadFilterType, dest: AudioNode = out!) {
  const ac = audioCtx()!; const s = ac.createBufferSource(); s.buffer = noise; const bf = ac.createBiquadFilter(); bf.type = type; bf.frequency.value = f; bf.Q.value = 0.9;
  const g = ac.createGain(); env(g, t, 0.001, v, dur); s.connect(bf).connect(g).connect(dest); s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.05);
}
function tom(t: number, f: number, v: number) {
  const ac = audioCtx()!; const o = ac.createOscillator(); const g = ac.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.25); env(g, t, 0.002, v, 0.28); o.connect(g).connect(out!); o.start(t); o.stop(t + 0.35);
}

function schedule(t: number, s16: number) {
  if (!cfg || !filt) return;
  const { root, scale } = cfg; const prog = progression(scale);
  const chordRoot = root + prog[bar % 4];
  const L = levelSm; const band = bandSm.v;
  const beat = s16 % 4 === 0, s8 = s16 % 2 === 0, q = Math.floor(s16 / 4);
  const spb = 60 / curBpm() / 4; // seconds per 16th
  // ---- pad: once per bar
  if (s16 === 0) {
    const tri = [0, quant(scale, 3.5), 7, 12].map((x) => chordRoot + (x === 0 ? 0 : quant(scale.map((v) => v), x)));
    for (const n of tri) { tone('sawtooth', mtof(n), t, spb * 16 * 0.95, 0.018, filt, -7, 0.4); tone('sawtooth', mtof(n), t, spb * 16 * 0.95, 0.018, filt, 7, 0.4); }
    tone('sine', mtof(chordRoot - 12), t, spb * 16, 0.05, filt, 0, 0.3);
  }
  // ---- soft pluck melody (all levels): sparse
  if (L < 1.5 && (s16 === 6 || s16 === 10 || (s16 === 14 && bar % 2))) {
    const d = [2, 4, 1, 3, 5, 2][(bar + s16) % 6]; tone('triangle', mtof(root + 12 + deg(scale, d) + prog[bar % 4] % 12), t, 0.35, 0.05, filt);
  }
  // ---- drums
  if (L >= 0.8) {
    if (L >= 1.8 ? beat : (s16 === 0 || s16 === 8 || s16 === 10)) kick(t, 0.32);
    if (s16 === 4 || s16 === 12) hit(t, 0.16, 1800, 0.16, 'bandpass');
    if (s8 || L >= 1.8) hit(t, s8 ? 0.045 : 0.025, 8000, 0.04, 'highpass');
    if (L >= 1.8 && s16 % 8 === 6) hit(t, 0.05 * band, 6500, 0.18, 'highpass'); // open hat when in band
  }
  if (L >= 2.6 && bar % 2 === 1 && s16 >= 12) tom(t, [220, 180, 150, 120][s16 - 12], 0.18);
  // ---- bass
  if (L >= 0.8) {
    const bn = chordRoot - 24;
    if (L >= 1.8) { const n = s16 % 4 === 2 ? bn + 12 : bn; tone('sawtooth', mtof(n), t, spb * 0.9, 0.07, filt); tone('square', mtof(n), t, spb * 0.8, 0.03, filt, 5); }
    else if (s8) { const n = s16 % 8 === 6 ? bn + 7 : bn; tone('sawtooth', mtof(n), t, spb * 1.6, 0.075, filt); }
  }
  // ---- arpeggio (level 2+), fades out when you leave the target band
  if (L >= 1.8 && band > 0.05) {
    const pattern = [0, 2, 4, 2, 5, 4, 2, 4];
    const n = chordRoot + 12 + deg(scale, pattern[s16 % 8] + (q % 2 ? 1 : 0));
    tone('square', mtof(n), t, spb * 0.8, 0.028 * band, filt, 0, 0.003);
    if (od) tone('triangle', mtof(n + 12), t, spb * 0.7, 0.03, filt);
  }
  // ---- lead (boss)
  if (L >= 2.6 && band > 0.05 && (s16 % 4 === 0 || s16 === 14)) {
    const mel = [4, 5, 4, 2, 4, 7, 6, 4, 2, 1, 2, 4, 5, 4, 2, 0];
    const n = root + 12 + deg(scale, mel[(bar % 4) * 4 + q]);
    tone('sawtooth', mtof(n), t, spb * 3.6, 0.04 * band, filt, -4, 0.02); tone('sawtooth', mtof(n), t, spb * 3.6, 0.04 * band, filt, 4, 0.02);
  }
}
function curBpm() { if (!cfg) return 120; return cfg.bpm * (1 + Math.max(0, levelSm - 1) * 0.04); }
function tick() {
  const ac = audioCtx(); if (!ac || !cfg || !out || !filt) return;
  // smooth layer & band transitions
  levelSm += (level - levelSm) * 0.08; bandSm.v += ((inBand ? 1 : 0) - bandSm.v) * 0.06;
  const cutoff = 900 + levelSm * 1300 + (od ? 1800 : 0); filt.frequency.setTargetAtTime(cutoff, ac.currentTime, 0.3);
  if (delay) delay.delayTime.setTargetAtTime(60 / curBpm() * 0.75, ac.currentTime, 0.5);
  while (nextT < ac.currentTime + 0.15) {
    if (nextT < ac.currentTime - 0.2) nextT = ac.currentTime + 0.02; // tab was asleep: resync
    schedule(nextT, step);
    nextT += 60 / curBpm() / 4; step = (step + 1) % 16; if (step === 0) bar++;
  }
}
export const music = {
  start(m: Arr) {
    if (!ensureGraph()) return;
    const ac = audioCtx()!; cfg = m; step = 0; bar = 0; levelSm = level = 0; nextT = ac.currentTime + 0.1; ducked = false;
    out!.gain.cancelScheduledValues(ac.currentTime); out!.gain.setTargetAtTime(1, ac.currentTime, 0.8);
    if (timer == null) timer = window.setInterval(tick, 30);
  },
  stop() {
    const ac = audioCtx(); if (out && ac) out.gain.setTargetAtTime(0, ac.currentTime, 0.4);
    setTimeout(() => { if (timer != null && out && audioCtx() && out.gain.value < 0.05) { clearInterval(timer); timer = null; cfg = null; } }, 1600);
  },
  /** 0 calm · 1 steady · 2 interval · 3 boss */
  setIntensity(n: number) { level = n; },
  update(_dt: number, band: boolean, overdrive: boolean) { inBand = band; od = overdrive; },
  duck(on: boolean) { ducked = on; const ac = audioCtx(); if (out && ac && cfg) out.gain.setTargetAtTime(on ? 0.25 : 1, ac.currentTime, 0.3); },
  get playing() { return timer != null && !!cfg && !ducked && !settings.muted; },
};

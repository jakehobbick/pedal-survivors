/**
 * Synthesized WebAudio sound effects. Every sound is generated from oscillators/noise —
 * no audio files. Each effect is rate-limited so 400 enemies dying at once stays pleasant.
 */
import { settings } from '../core/settings';

let ac: AudioContext | null = null;
let master: GainNode, sfxBus: GainNode, musicBus: GainNode, comp: DynamicsCompressorNode;
let noiseBuf: AudioBuffer | null = null;
export function audioCtx() { return ac; }
export function buses() { return { master, sfxBus, musicBus }; }
export function initAudio() {
  try {
    if (!ac) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      ac = new AC();
      comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
      master = ac.createGain(); sfxBus = ac.createGain(); musicBus = ac.createGain();
      sfxBus.connect(comp); musicBus.connect(comp); comp.connect(master); master.connect(ac.destination);
      const len = ac.sampleRate * 1; noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      applyVolumes();
    }
    if (ac.state === 'suspended') ac.resume();
  } catch { /* no audio */ }
}
export function applyVolumes() {
  if (!ac) return;
  const m = settings.muted ? 0 : settings.volume;
  master.gain.setTargetAtTime(m, ac.currentTime, 0.05);
  sfxBus.gain.setTargetAtTime(settings.sfx * 0.9, ac.currentTime, 0.05);
  musicBus.gain.setTargetAtTime(settings.music * 0.55, ac.currentTime, 0.05);
}
const last: Record<string, number> = {};
function ok(key: string, gap: number) { if (!ac || settings.muted) return false; const t = ac.currentTime; if ((last[key] || 0) + gap > t) return false; last[key] = t; return true; }
function osc(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0, bus?: AudioNode) {
  if (!ac) return; const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.03);
}
function noise(dur: number, vol: number, f: number, q = 1, type: BiquadFilterType = 'bandpass', delay = 0, f1?: number) {
  if (!ac || !noiseBuf) return; const t = ac.currentTime + delay;
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const bf = ac.createBiquadFilter(); bf.type = type; bf.frequency.setValueAtTime(f, t); if (f1) bf.frequency.exponentialRampToValueAtTime(f1, t + dur); bf.Q.value = q;
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(bf).connect(g).connect(sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
let gemChain = 0, gemT = 0;
export const sfx = {
  ui: () => ok('ui', 0.04) && osc('triangle', 660, 880, 0.07, 0.12),
  back: () => ok('ui', 0.04) && osc('triangle', 520, 380, 0.08, 0.1),
  shoot: (v = 1) => { if (ok('shoot', 0.07)) { osc('square', 1300, 600, 0.05, 0.035 * v); noise(0.04, 0.03 * v, 3000, 2); } },
  whip: () => { if (ok('whip', 0.08)) { noise(0.14, 0.13, 900, 0.8, 'bandpass', 0, 3500); osc('sawtooth', 300, 120, 0.1, 0.03); } },
  cannon: () => { if (ok('cannon', 0.1)) { osc('sine', 160, 50, 0.25, 0.25); noise(0.15, 0.12, 600, 1); } },
  bell: (n = 0) => { if (ok('bell', 0.12)) { const f = n ? 784 : 1046; osc('sine', f, f, 0.9, 0.11); osc('sine', f * 2.76, f * 2.76, 0.5, 0.04); osc('sine', f * 5.4, f * 5.4, 0.25, 0.02); } },
  lob: () => ok('lob', 0.1) && osc('triangle', 400, 900, 0.12, 0.05),
  splash: () => { if (ok('splash', 0.08)) noise(0.25, 0.12, 1800, 0.7, 'bandpass', 0, 500); },
  zap: () => { if (ok('zap', 0.08)) { noise(0.18, 0.18, 4000, 0.6, 'highpass'); osc('sawtooth', 1800, 200, 0.15, 0.05); } },
  whoosh: () => { if (ok('whoosh', 0.1)) noise(0.3, 0.1, 500, 1.5, 'bandpass', 0, 2200); },
  laser: () => { if (ok('laser', 0.08)) { osc('sawtooth', 1600, 300, 0.22, 0.07); osc('square', 2400, 1200, 0.1, 0.03); } },
  drone: () => ok('drone', 0.3) && osc('triangle', 300, 600, 0.2, 0.06),
  tink: () => ok('tink', 0.05) && osc('triangle', 2400, 2000, 0.06, 0.06),
  kill: (rank = 0) => {
    if (rank >= 1) { if (ok('killbig', 0.1)) { osc('square', 220, 55, 0.4, 0.12); noise(0.4, 0.2, 400, 0.8); } return; }
    if (ok('kill', 0.045)) { osc('square', 520 + Math.random() * 200, 120, 0.07, 0.035); noise(0.05, 0.04, 2500, 1.2); }
  },
  boom: (r = 60) => { if (ok('boom', 0.06)) { const v = Math.min(0.4, 0.12 + r / 600); osc('sine', 120, 35, 0.4, v); noise(0.35, v * 0.8, 700, 0.6, 'lowpass', 0, 150); } },
  hurt: () => { if (ok('hurt', 0.15)) { osc('sawtooth', 220, 90, 0.18, 0.12); noise(0.1, 0.1, 800, 1); } },
  gem: () => {
    if (!ac) return; const t = ac.currentTime; if (t - gemT > 0.6) gemChain = 0; gemT = t;
    if (ok('gem', 0.035)) { const f = 880 * Math.pow(2, Math.min(gemChain, 14) / 12); gemChain++; osc('sine', f, f, 0.08, 0.06); osc('triangle', f * 2, f * 2, 0.05, 0.02); }
  },
  coin: () => { if (ok('coin', 0.05)) { osc('square', 1318, 1318, 0.06, 0.05); osc('square', 1760, 1760, 0.12, 0.05, 0.06); } },
  heal: () => { if (ok('heal', 0.2)) [523, 659, 784].forEach((f, i) => osc('sine', f, f, 0.2, 0.08, i * 0.06)); },
  magnet: () => { if (ok('magnet', 0.2)) osc('sine', 200, 1600, 0.5, 0.1); },
  chest: () => { if (ok('chest', 0.2)) [392, 523, 659, 784, 1046].forEach((f, i) => osc('triangle', f, f, 0.25, 0.08, i * 0.07)); },
  levelUp: () => { if (ok('lvl', 0.3)) { [523, 659, 784, 1046, 1318].forEach((f, i) => { osc('square', f, f, 0.18, 0.06, i * 0.06); osc('sine', f * 2, f * 2, 0.25, 0.04, i * 0.06); }); noise(0.6, 0.05, 6000, 0.5, 'highpass', 0.3); } },
  pick: () => { if (ok('pick', 0.1)) { osc('triangle', 784, 1568, 0.15, 0.1); osc('sine', 1568, 1568, 0.3, 0.05, 0.1); } },
  evolve: () => { if (ok('evo', 0.5)) { [262, 330, 392, 523, 659, 784, 1046].forEach((f, i) => osc('sawtooth', f, f, 0.4, 0.05, i * 0.08)); noise(1.2, 0.08, 3000, 0.4, 'highpass', 0.5); } },
  dash: () => { if (ok('dash', 0.1)) { noise(0.25, 0.18, 600, 0.8, 'bandpass', 0, 3000); osc('sine', 300, 900, 0.18, 0.06); } },
  ult: () => { if (ok('ult', 0.3)) { osc('sawtooth', 80, 40, 1.0, 0.2); osc('square', 440, 1760, 0.6, 0.06); noise(1.0, 0.2, 300, 0.5, 'lowpass', 0, 3000); } },
  revive: () => { if (ok('revive', 0.5)) [392, 523, 784].forEach((f, i) => osc('triangle', f, f * 1.01, 0.3, 0.1, i * 0.1)); },
  warn: () => { if (ok('warn', 0.5)) { osc('square', 880, 880, 0.12, 0.06); osc('square', 660, 660, 0.12, 0.06, 0.16); } },
  surge: () => { if (ok('surge', 1)) [659, 880, 1175, 1568].forEach((f, i) => osc('triangle', f, f, 0.22, 0.07, i * 0.05)); },
  shieldHit: () => { if (ok('shield', 0.15)) { osc('sine', 1500, 1450, 0.1, 0.05); } },
  shieldBreak: () => { if (ok('sbreak', 0.5)) { noise(0.9, 0.35, 5000, 0.4, 'highpass'); osc('sawtooth', 1200, 60, 0.8, 0.15); [1046, 1318, 1568].forEach((f, i) => osc('triangle', f, f, 0.4, 0.07, 0.2 + i * 0.07)); } },
  roar: () => { if (ok('roar', 1)) { osc('sawtooth', 90, 45, 1.4, 0.25); osc('square', 60, 40, 1.4, 0.15); noise(1.4, 0.25, 300, 0.7, 'lowpass', 0, 120); } },
  charge: () => { if (ok('charge', 0.15)) noise(0.3, 0.09, 300, 1, 'bandpass', 0, 1200); },
  fuse: () => { if (ok('fuse', 0.15)) noise(0.6, 0.05, 5000, 2, 'bandpass'); },
  shift: (up: boolean) => { if (ok('shift', 0.03)) { osc('square', up ? 1400 : 900, up ? 1400 : 900, 0.04, 0.05); noise(0.03, 0.06, 4000, 3); } },
  achieve: () => { if (ok('ach', 0.6)) { [784, 988, 1175, 1568].forEach((f, i) => { osc('triangle', f, f, 0.3, 0.07, i * 0.09); osc('sine', f * 2, f * 2, 0.4, 0.03, i * 0.09); }); } },
  buy: () => { if (ok('buy', 0.08)) { osc('square', 988, 988, 0.05, 0.05); osc('square', 1318, 1318, 0.05, 0.05, 0.05); osc('square', 1976, 1976, 0.14, 0.05, 0.1); } },
  count: (hi = false) => ok('count', 0.2) && osc('square', hi ? 1320 : 880, hi ? 1320 : 880, hi ? 0.35 : 0.12, 0.09),
};

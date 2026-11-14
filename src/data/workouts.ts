/**
 * WORKOUT TEMPLATES — every run is one of these. `build(minutes)` returns the step list
 * scaled to the chosen run length (20/30/45/60). Targets are fractions of FTP; hi >= 9 means
 * "at least lo" (sprints). `wave` sets the enemy mix, `mode` the trainer behavior:
 *   'erg'  = trainer holds the target (or virtual gears if Settings → Intervals = Gears)
 *   'gear' = virtual gears, effort comes from you (sprints, free riding)
 * Add a template by appending to TEMPLATES.
 */
import type { WaveKind } from '../game/director';

export type StepKind = 'warmup' | 'endurance' | 'tempo' | 'interval' | 'recovery' | 'sprint' | 'boss' | 'cooldown' | 'free';
export interface Step {
  kind: StepKind; dur: number; lo: number; hi: number; lo2?: number; hi2?: number;
  label: string; wave: WaveKind; mode: 'erg' | 'gear'; banner?: string; sub?: string; shop?: boolean; chest?: boolean; mini?: boolean;
}
export interface Template { id: string; name: string; short: string; desc: string; color: string; build(min: number): Step[] }

const M = 60;
const pct = (f: number) => Math.round(f * 100) + '%';
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
function frame(min: number) {
  const W = min <= 20 ? 4 : min <= 30 ? 5 : min <= 45 ? 7 : 10;
  const C = min <= 30 ? 3 : 5;
  const B = 3;
  return { W, C, B, main: min - W - C - B };
}
function warmup(mins: number): Step { return { kind: 'warmup', dur: mins * M, lo: 0.48, hi: 0.58, lo2: 0.62, hi2: 0.72, label: 'Warm-up', wave: 'calm', mode: 'erg', banner: 'WARM-UP', sub: 'Spin easy — the horde is waking up' }; }
function endurance(mins: number, label = 'Endurance', n = 0): Step { return { kind: 'endurance', dur: Math.round(mins * M), lo: 0.65, hi: 0.75, label, wave: 'normal', mode: 'erg', banner: n ? `Z2 WAVE ${n}` : 'ENDURANCE WAVE', sub: `Hold 65–75% FTP for ${mmss(mins * M)}` }; }
function recovery(mins: number, shop = true): Step { return { kind: 'recovery', dur: Math.round(mins * M), lo: 0.45, hi: 0.6, label: shop ? 'Recovery · Pit stop' : 'Recovery', wave: 'calm', mode: 'erg', banner: shop ? 'PIT STOP' : 'RECOVER', sub: shop ? 'Easy spin — the shop is open' : 'Easy spin, breathe', shop }; }
function boss(): Step { return { kind: 'boss', dur: 3 * M, lo: 1.5, hi: 99, label: 'BOSS', wave: 'boss', mode: 'gear', banner: 'BOSS INCOMING', sub: 'Sprint all-out to break its shield!' }; }
function cooldown(mins: number): Step { return { kind: 'cooldown', dur: mins * M, lo: 0.4, hi: 0.55, lo2: 0.35, hi2: 0.5, label: 'Cool-down · Victory lap', wave: 'calm', mode: 'erg', banner: 'VICTORY LAP', sub: 'Cool down and scoop up the loot', chest: true }; }
function interval(lo: number, hi: number, secs: number, name: string, wave: WaveKind, rep: number, reps: number, mini = false): Step {
  const mid = (lo + hi) / 2; const tgt = Math.abs(hi - lo - 0.1) < 0.011 ? pct(mid) : `${pct(lo)}–${pct(hi)}`;
  return { kind: 'interval', dur: Math.round(secs), lo, hi, label: `${name} ${rep}/${reps}`, wave, mode: 'erg', banner: `${name.toUpperCase()}: hold ${tgt} FTP for ${mmss(secs)}`, sub: `Interval ${rep} of ${reps} · stay in the band to build Surge`, mini };
}
function sprint(secs: number, rep: number): Step { return { kind: 'sprint', dur: secs, lo: 1.5, hi: 99, label: `Sprint ${rep} · ${secs}s`, wave: 'swarm', mode: 'gear', banner: `SPRINT ${secs}s!`, sub: 'Shift up and go all-out (≥150% FTP)' }; }
const fill = (steps: Step[], leftoverMin: number) => { if (leftoverMin >= 1) steps.splice(1, 0, endurance(leftoverMin, 'Settle in')); else if (leftoverMin > 0) steps[0].dur += Math.round(leftoverMin * M); };

export const TEMPLATES: Template[] = [
  {
    id: 'endurance', name: 'Endurance', short: 'Z2', color: '#5ef38c',
    desc: 'Steady zone 2 (65–75% FTP) waves with pit stops. Great base miles.',
    build(min) {
      const f = frame(min); const s: Step[] = [warmup(f.W)];
      const blocks = Math.max(2, Math.round(f.main / 8)); const pit = f.main >= 20 ? 1.5 : 1;
      const on = (f.main - (blocks - 1) * pit) / blocks;
      for (let i = 0; i < blocks; i++) { const e = endurance(on, `Z2 Wave ${i + 1}`, i + 1); e.mini = i === Math.floor(blocks / 2); s.push(e); if (i < blocks - 1) s.push(recovery(pit)); }
      s.push(boss(), cooldown(f.C)); return s;
    },
  },
  {
    id: 'sweetspot', name: 'Sweet Spot', short: '3×10', color: '#ffd166',
    desc: '3 intervals at 88–94% FTP (3×10 min at 60 min, scaled down for shorter runs).',
    build(min) {
      const f = frame(min); const s: Step[] = [warmup(f.W)];
      const reps = f.main >= 17 ? 3 : 2; let off = Math.min(5, Math.max(2, Math.round(f.main * 0.12))); let on = Math.min(10, (f.main - (reps - 1) * off) / reps);
      on = Math.max(2, on); const used = reps * on + (reps - 1) * off;
      for (let i = 0; i < reps; i++) { s.push(interval(0.88, 0.94, on * M, 'Sweet Spot', 'elite', i + 1, reps, i === 1)); if (i < reps - 1) s.push(recovery(off)); }
      fill(s, f.main - used); s.push(boss(), cooldown(f.C)); return s;
    },
  },
  {
    id: 'threshold', name: 'Threshold', short: '2×20', color: '#ff9f43',
    desc: '2 long intervals at 95–102% FTP (2×20 min at 60 min). Siege waves of ranged & shielded foes.',
    build(min) {
      const f = frame(min); const s: Step[] = [warmup(f.W)];
      const off = f.main >= 40 ? 4 : f.main >= 25 ? 4 : f.main >= 15 ? 3 : 2; const on = Math.min(20, (f.main - off) / 2);
      s.push(interval(0.95, 1.02, on * M, 'Threshold Siege', 'siege', 1, 2, true), recovery(off), interval(0.95, 1.02, on * M, 'Threshold Siege', 'siege', 2, 2));
      fill(s, f.main - (on * 2 + off)); s.push(boss(), cooldown(f.C)); return s;
    },
  },
  {
    id: 'vo2', name: 'VO₂ Max', short: '5×3', color: '#ff4d5e',
    desc: '3-minute elite waves at 110–120% FTP with equal recoveries (up to 5 reps).',
    build(min) {
      const f = frame(min); const s: Step[] = [warmup(f.W)];
      const on = 3, off = 3; const reps = Math.max(2, Math.min(5, Math.floor((f.main + off) / (on + off))));
      for (let i = 0; i < reps; i++) { s.push(interval(1.1, 1.2, on * M, 'Elite Wave', 'elite', i + 1, reps, i === Math.floor(reps / 2))); if (i < reps - 1) s.push(recovery(off, i % 2 === 0)); }
      fill(s, f.main - (reps * on + (reps - 1) * off)); s.push(boss(), cooldown(f.C)); return s;
    },
  },
  {
    id: 'ladder', name: 'Sprint Ladder', short: '10→30s', color: '#e056fd',
    desc: 'Tempo blocks broken up by all-out sprints that climb 10 → 15 → 20 → 25 → 30 s. Uses virtual gears.',
    build(min) {
      const f = frame(min); const s: Step[] = [warmup(f.W)];
      const rungs = [10, 15, 20, 25, 30, 20, 15];
      const n = Math.max(2, Math.min(rungs.length, Math.floor(f.main / 4.2)));
      const tempo = (f.main * M - rungs.slice(0, n).reduce((a, b) => a + b, 0) - n * 90) / n;
      for (let i = 0; i < n; i++) {
        s.push({ kind: 'tempo', dur: Math.round(tempo), lo: 0.76, hi: 0.86, label: `Tempo ${i + 1}`, wave: 'normal', mode: 'erg', banner: 'TEMPO', sub: `Hold 76–86% FTP · sprint coming`, mini: i === Math.floor(n / 2) });
        s.push(sprint(rungs[i], i + 1));
        s.push(recovery(1.5, i % 2 === 1));
      }
      s.push(boss(), cooldown(f.C)); return s;
    },
  },
  {
    id: 'overunder', name: 'Over-Unders', short: '92/107', color: '#4cc9f0',
    desc: 'Alternate 2 min just under threshold (92–97%) with 1 min just over (104–110%).',
    build(min) {
      const f = frame(min); const s: Step[] = [warmup(f.W)];
      const blocks = Math.max(1, Math.min(4, Math.floor((f.main + 3) / 12))); let used = 0;
      for (let b = 0; b < blocks; b++) {
        for (let k = 0; k < 3; k++) {
          s.push(interval(0.92, 0.97, 120, 'Under', 'normal', b * 3 + k + 1, blocks * 3, b === 0 && k === 1));
          s.push(interval(1.04, 1.1, 60, 'Over', 'swarm', b * 3 + k + 1, blocks * 3));
        }
        used += 9; if (b < blocks - 1) { s.push(recovery(3)); used += 3; }
      }
      fill(s, f.main - used); s.push(boss(), cooldown(f.C)); return s;
    },
  },
  {
    id: 'free', name: 'Free Ride', short: 'no targets', color: '#c9b6ff',
    desc: 'No targets. Enemy waves scale with your rolling 3-minute power. Virtual gears all the way.',
    build(min) {
      const f = frame(min);
      return [
        { kind: 'free', dur: (min - f.B - f.C) * M, lo: 0, hi: 0, label: 'Free Ride', wave: 'normal', mode: 'gear', banner: 'FREE RIDE', sub: 'Waves follow your rolling 3-min power', mini: true },
        boss(), { ...cooldown(f.C), mode: 'gear' },
      ];
    },
  },
];
export const TEMPLATE_BY_ID: Record<string, Template> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));
export const RUN_LENGTHS = [20, 30, 45, 60];

/**
 * End-of-run bookkeeping: computes the ride metrics once, folds them into lifetime stats,
 * appends the run history and fires the 'runEnd' achievement event.
 */
import { game } from '../game/game';
import { save, persist, RunSummary } from '../core/save';
import { recorder } from '../trainer/sensors';
import { FTP, settings } from '../core/settings';
import { achEvent, runUnlocked, RunEnd } from './achievements';
import { funnyTitle } from '../export/title';

export interface RunReport {
  quit: boolean; won: boolean; fled: boolean;
  secs: number; kills: number; level: number; gold: number; kj: number;
  avg: number; np: number; maxP: number; ifactor: number; tss: number;
  avgCad: number; avgHr: number; maxHr: number;
  best1: number; best5: number; best20: number;
  compliance: number; structured: boolean; zoneTime: number[]; hrZoneTime: number[];
  falls: number; evolutions: number; overdrives: number; sprintSecs: number; sprintPeak: number;
  title: string; achievements: string[]; newBests: string[];
  tpl: string; min: number; char: string; arena: string;
  weapons: { id: string; lv: number; dmg: number; evolved: boolean }[];
}

/** Normalized Power: 30 s rolling mean, 4th-power average, 4th root. */
export function normalizedPower(p: ArrayLike<number>, n: number) {
  if (n < 30) { let s = 0; for (let i = 0; i < n; i++) s += p[i]; return n ? s / n : 0; }
  let win = 0, acc = 0, cnt = 0;
  for (let i = 0; i < n; i++) {
    win += p[i]; if (i >= 30) win -= p[i - 30];
    if (i >= 29) { const m = win / 30; acc += m * m * m * m; cnt++; }
  }
  return Math.pow(acc / cnt, 0.25);
}
export function hrZone(hr: number, maxHr: number) { const f = hr / maxHr; return f < 0.6 ? 0 : f < 0.7 ? 1 : f < 0.8 ? 2 : f < 0.9 ? 3 : 4; }

let lastReport: RunReport | null = null;
export function getLastReport() { return lastReport; }

export function commitRun(quit: boolean): RunReport {
  const W = game.world, wk = game.wk!, o = game.opts!, R = recorder, n = R.n;
  let sum = 0, maxP = 0, cS = 0, cN = 0, hS = 0, hN = 0, hMax = 0;
  const hrZ = [0, 0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    const p = R.p[i]; sum += p; if (p > maxP) maxP = p;
    if (R.c[i] > 0) { cS += R.c[i]; cN++; }
    const h = R.hr[i]; if (h > 0) { hS += h; hN++; if (h > hMax) hMax = h; hrZ[hrZone(h, settings.maxHr)]++; }
  }
  const avg = n ? sum / n : 0; const np = normalizedPower(R.p, n); const ftp = FTP();
  const ifactor = ftp ? np / ftp : 0; const tss = n * np * ifactor / (ftp * 36) || 0;
  const best1 = R.bestAvg(60), best5 = R.bestAvg(300), best20 = R.bestAvg(1200);
  const won = game.boss.phase === 'dead'; const fled = game.boss.phase === 'fled';
  const structured = wk.tpl.id !== 'free';
  const compliance = wk.compliance();
  const report: RunReport = {
    quit, won, fled, secs: n, kills: W.stats.kills, level: W.player.level, gold: W.stats.gold, kj: wk.kj,
    avg, np, maxP, ifactor, tss, avgCad: cN ? cS / cN : 0, avgHr: hN ? hS / hN : 0, maxHr: hMax,
    best1, best5, best20, compliance, structured, zoneTime: Array.from(wk.zoneTime), hrZoneTime: hrZ,
    falls: W.stats.falls, evolutions: W.stats.evolutions, overdrives: W.stats.overdrives,
    sprintSecs: game.boss.best, sprintPeak: game.boss.peakW,
    title: '', achievements: [], newBests: [], tpl: o.tpl, min: o.min, char: o.char, arena: o.arena,
    weapons: W.player.weapons.map((w) => ({ id: w.def.id, lv: w.lv, dmg: Math.round(w.dmgDone), evolved: !!w.def.evolved })),
  };
  report.title = funnyTitle(report);

  // ---- lifetime stats
  const L = save.life;
  if (best1 > L.best1) { if (L.best1 > 0) report.newBests.push('1-min'); L.best1 = Math.round(best1); }
  if (best5 > L.best5) { if (L.best5 > 0) report.newBests.push('5-min'); L.best5 = Math.round(best5); }
  if (best20 > L.best20) { if (L.best20 > 0) report.newBests.push('20-min'); L.best20 = Math.round(best20); }
  if (maxP > L.bestPower) { if (L.bestPower > 0) report.newBests.push('peak'); L.bestPower = maxP; }
  save.gold += W.stats.gold; L.gold += W.stats.gold;
  L.runs++; L.kills += W.stats.kills; L.kj += wk.kj; L.secs += n; L.falls += W.stats.falls;
  L.distance += W.stats.distance; L.maxLevel = Math.max(L.maxLevel, W.player.level);
  L.evolutions += W.stats.evolutions; L.chests += W.stats.chests; L.elites += W.stats.elites; L.minis += W.stats.minis;
  L.overdrives += W.stats.overdrives;
  if (won) { L.wins++; const b = W.arena.boss; L.bossKills[b] = (L.bossKills[b] || 0) + 1; }
  if (!quit) {
    L.templates[o.tpl] = (L.templates[o.tpl] || 0) + 1;
    L.arenas[o.arena] = (L.arenas[o.arena] || 0) + 1;
    save.charRuns[o.char] = (save.charRuns[o.char] || 0) + 1;
    if (structured) L.bestCompliance = Math.max(L.bestCompliance, compliance);
    if (W.stats.falls === 0 && o.min >= 30) L.deathless++;
  }
  if (won && game.boss.best > 0 && (L.sprintBest === 0 || game.boss.best < L.sprintBest)) L.sprintBest = game.boss.best;
  const sum1: RunSummary = { date: R.start, char: o.char, arena: o.arena, tpl: o.tpl, min: o.min, won, kills: W.stats.kills, level: W.player.level, avg: Math.round(avg), np: Math.round(np), kj: Math.round(wk.kj), compliance, title: report.title, secs: n };
  save.history.push(sum1); if (save.history.length > 30) save.history.splice(0, save.history.length - 30);
  persist();

  const e: RunEnd = { quit, won, tpl: o.tpl, min: o.min, char: o.char, arena: o.arena, compliance, structured, falls: W.stats.falls, best20, elapsed: wk.elapsed };
  achEvent('runEnd', e);
  report.achievements = runUnlocked.slice();
  lastReport = report;
  return report;
}

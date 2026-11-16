/** Persistent progress (localStorage, try/catch wrapped) with export/import for backups. */
import { LS } from './storage';

export interface LifeStats {
  kj: number; secs: number; kills: number; runs: number; wins: number; falls: number; gold: number; distance: number;
  best1: number; best5: number; best20: number; bestPower: number; maxLevel: number; evolutions: number; chests: number;
  elites: number; minis: number; bossKills: Record<string, number>; templates: Record<string, number>; overdrives: number;
  bestCompliance: number; deathless: number; sprintBest: number; arenas: Record<string, number>;
}
export interface RunSummary { date: number; char: string; arena: string; tpl: string; min: number; won: boolean; kills: number; level: number; avg: number; np: number; kj: number; compliance: number; title: string; secs: number }
export interface SaveData {
  v: number; gold: number; upgrades: Record<string, number>; ach: Record<string, number>;
  life: LifeStats; last: { char: string; arena: string; tpl: string; min: number };
  history: RunSummary[]; seenTutorial: boolean; charRuns: Record<string, number>;
}
const freshLife = (): LifeStats => ({ kj: 0, secs: 0, kills: 0, runs: 0, wins: 0, falls: 0, gold: 0, distance: 0, best1: 0, best5: 0, best20: 0, bestPower: 0, maxLevel: 0, evolutions: 0, chests: 0, elites: 0, minis: 0, bossKills: {}, templates: {}, overdrives: 0, bestCompliance: 0, deathless: 0, sprintBest: 0, arenas: {} });
const fresh = (): SaveData => ({ v: 1, gold: 0, upgrades: {}, ach: {}, life: freshLife(), last: { char: 'kai', arena: 'sakura', tpl: 'sweetspot', min: 30 }, history: [], seenTutorial: false, charRuns: {} });
function normalize(o: Partial<SaveData>): SaveData {
  const f = fresh();
  const s: SaveData = { ...f, ...o } as SaveData;
  s.life = { ...freshLife(), ...(o.life || {}) };
  s.last = { ...f.last, ...(o.last || {}) };
  s.upgrades = { ...(o.upgrades || {}) }; s.charRuns = { ...(o.charRuns || {}) }; s.ach = { ...(o.ach || {}) }; s.history = Array.isArray(o.history) ? o.history.slice(-30) : [];
  s.gold = Math.max(0, Math.floor(+s.gold || 0));
  return s;
}
export const save: SaveData = normalize(LS.get<Partial<SaveData>>('save', {}));
export function persist() { return LS.set('save', save); }
export function exportSave(): string {
  return JSON.stringify({ app: 'pedal-survivors', exported: new Date().toISOString(), save }, null, 1);
}
export function importSave(text: string): boolean {
  try {
    const o = JSON.parse(text); const d = o && o.save ? o.save : o;
    if (!d || typeof d !== 'object' || !('life' in d)) return false;
    const n = normalize(d); Object.assign(save, n); persist(); return true;
  } catch { return false; }
}
export function wipeSave() { Object.assign(save, fresh()); persist(); }

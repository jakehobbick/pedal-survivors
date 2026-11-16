/**
 * ACHIEVEMENTS — data-driven. Each entry listens to one or more game events (`on`) and
 * unlocks when `test` returns true. Events are fired with achEvent(type, data) from the
 * game code; 'runEnd' carries the finished-run summary (see meta/progress.ts).
 * Unlocking pays `gold` into the bank and is shown as a toast + on the post-run screen.
 */
import { save, persist } from '../core/save';
import { game } from '../game/game';
import { FTP } from '../core/settings';
import { toast } from '../ui/ui';
import { sfx } from '../audio/sfx';

export interface RunEnd {
  quit: boolean; won: boolean; tpl: string; min: number; char: string; arena: string;
  compliance: number; structured: boolean; falls: number; best20: number; elapsed: number;
}
interface Ctx { type: string; d: any; run: RunCtx }
interface RunCtx { shopBuys: number; banishes: number; maxedWeapons: number }
export interface AchDef { id: string; name: string; desc: string; icon: string; gold: number; on: string[]; test: (c: Ctx) => boolean; secret?: boolean }

const W = () => game.world;
const L = () => save.life;
const end = (c: Ctx) => c.d as RunEnd;
const finished = (c: Ctx) => !end(c).quit;

export const ACHIEVEMENTS: AchDef[] = [
  // ---- first steps
  { id: 'first', name: 'Clipped In', desc: 'Finish your first run.', icon: '🚲', gold: 50, on: ['runEnd'], test: finished },
  { id: 'kills100', name: 'Road Rage', desc: 'Defeat 100 enemies in one run.', icon: '💥', gold: 25, on: ['kill'], test: () => W().stats.kills >= 100 },
  { id: 'kills1000', name: 'Peloton Pulverizer', desc: 'Defeat 1,000 enemies in one run.', icon: '🔥', gold: 75, on: ['kill'], test: () => W().stats.kills >= 1000 },
  { id: 'kills3000', name: 'Mass Start Massacre', desc: 'Defeat 3,000 enemies in one run.', icon: '☄️', gold: 150, on: ['kill'], test: () => W().stats.kills >= 3000 },
  { id: 'life25k', name: 'Grand Tour Body Count', desc: 'Defeat 25,000 enemies in total.', icon: '🏔️', gold: 200, on: ['kill', 'runEnd'], test: () => L().kills + (game.state === 'run' ? W().stats.kills : 0) >= 25000 },
  // ---- build
  { id: 'maxweapon', name: 'Fully Built', desc: 'Get a weapon to max level.', icon: '🛠️', gold: 30, on: ['levelPick'], test: (c) => c.d.kind === 'weapon' && c.d.lv >= 6 },
  { id: 'evolve1', name: 'Upgrade Path', desc: 'Evolve any weapon. Unlocks Yuki the Domestique.', icon: '🧬', gold: 60, on: ['evolve'], test: () => W().stats.evolutions >= 1 },
  { id: 'evolve3', name: 'Full Groupset', desc: 'Evolve 3 weapons in one run.', icon: '⚙️', gold: 150, on: ['evolve'], test: () => W().stats.evolutions >= 3 },
  { id: 'level30', name: 'Category 1', desc: 'Reach level 30 in a run.', icon: '⛰️', gold: 50, on: ['levelPick'], test: () => W().player.level >= 30 },
  { id: 'level50', name: 'Hors Catégorie', desc: 'Reach level 50 in a run.', icon: '🗻', gold: 120, on: ['levelPick'], test: () => W().player.level >= 50 },
  { id: 'banish', name: 'Commissaire’s Ruling', desc: 'Banish an upgrade.', icon: '🚫', gold: 15, on: ['banish'], test: () => true },
  { id: 'shopper', name: 'Feed Zone Regular', desc: 'Buy 3 things at pit stops in one run.', icon: '🛒', gold: 40, on: ['shopBuy'], test: (c) => c.run.shopBuys >= 3 },
  // ---- workout
  { id: 'comp90', name: 'Coach’s Pet', desc: 'Finish a structured workout with ≥ 90% compliance.', icon: '📋', gold: 80, on: ['runEnd'], test: (c) => finished(c) && end(c).structured && end(c).compliance >= 0.9 },
  { id: 'comp97', name: 'Metronome', desc: 'Finish a structured workout with ≥ 97% compliance.', icon: '⏱️', gold: 150, on: ['runEnd'], test: (c) => finished(c) && end(c).structured && end(c).compliance >= 0.97 },
  { id: 'sweetspot', name: 'Sweet Spot Sommelier', desc: 'Finish a Sweet Spot run.', icon: '🍯', gold: 40, on: ['runEnd'], test: (c) => finished(c) && end(c).tpl === 'sweetspot' },
  { id: 'vo2', name: 'Lung Buster', desc: 'Finish a VO₂ run with ≥ 80% compliance.', icon: '🫁', gold: 100, on: ['runEnd'], test: (c) => finished(c) && end(c).tpl === 'vo2' && end(c).compliance >= 0.8 },
  { id: 'hour', name: 'The Hour', desc: 'Finish a 60-minute run.', icon: '🕐', gold: 120, on: ['runEnd'], test: (c) => finished(c) && end(c).min >= 60 },
  { id: 'freeride', name: 'No Plan, No Problem', desc: 'Finish a 30+ minute Free Ride.', icon: '🌄', gold: 50, on: ['runEnd'], test: (c) => finished(c) && end(c).tpl === 'free' && end(c).min >= 30 },
  { id: 'collector', name: 'Training Plan', desc: 'Finish 5 different workout templates.', icon: '📚', gold: 150, on: ['runEnd'], test: () => Object.keys(L().templates).filter((k) => L().templates[k] > 0).length >= 5 },
  { id: 'ftp20', name: 'FTP Test Passed', desc: 'Hold ≥ 95% of your FTP for 20 minutes in a run.', icon: '📈', gold: 150, on: ['runEnd'], test: (c) => end(c).best20 >= FTP() * 0.95 },
  // ---- surge & sprint
  { id: 'overdrive', name: 'Overdrive!', desc: 'Fill the Surge meter and trigger Overdrive.', icon: '⚡', gold: 30, on: ['overdrive'], test: () => true },
  { id: 'overdrive5', name: 'Diesel Engine', desc: 'Trigger Overdrive 5 times in one run.', icon: '🚂', gold: 100, on: ['overdrive'], test: () => W().stats.overdrives >= 5 },
  { id: 'shield', name: 'Shield Breaker', desc: 'Break a boss shield with a sprint.', icon: '🛡️', gold: 50, on: ['shieldBreak'], test: () => true },
  { id: 'shield18', name: 'Track Sprinter', desc: 'Break a boss shield in under 18 seconds.', icon: '🏁', gold: 100, on: ['shieldBreak'], test: (c) => c.d.secs < 18 },
  { id: 'peak200', name: 'Wattbomb', desc: 'Hit 200% of FTP during a boss sprint.', icon: '💣', gold: 80, on: ['shieldBreak'], test: (c) => c.d.peak >= FTP() * 2 },
  // ---- bosses & survival
  { id: 'mini', name: 'Giant Slayer', desc: 'Defeat a mini-boss.', icon: '🗡️', gold: 40, on: ['kill'], test: (c) => c.d.rank === 2 },
  { id: 'oni', name: 'Summit Conqueror', desc: 'Defeat the Oni Shogun. Unlocks Neon Criterium.', icon: '👹', gold: 120, on: ['bossKill'], test: (c) => c.d.id === 'oni' },
  { id: 'leviathan', name: 'Circuit Breaker', desc: 'Defeat the Neon Leviathan. Unlocks Volcano Col.', icon: '🐉', gold: 160, on: ['bossKill'], test: (c) => c.d.id === 'leviathan' },
  { id: 'wyrm', name: 'King of the Mountains', desc: 'Defeat the Magma Wyrm.', icon: '🌋', gold: 220, on: ['bossKill'], test: (c) => c.d.id === 'wyrm' },
  { id: 'deathless', name: 'Rubber Side Down', desc: 'Finish a 30+ minute run without falling.', icon: '😇', gold: 120, on: ['runEnd'], test: (c) => finished(c) && end(c).min >= 30 && end(c).falls === 0 },
  { id: 'roster', name: 'Team Roster', desc: 'Finish a run with 4 different riders.', icon: '👥', gold: 100, on: ['runEnd'], test: () => Object.keys(save.charRuns || {}).length >= 4 },
  { id: 'dash50', name: 'Bunny Hopper', desc: 'Dash 50 times in one run.', icon: '🐇', gold: 30, on: ['dash'], test: () => W().stats.dashes >= 50 },
  { id: 'ult10', name: 'Signature Move', desc: 'Use your ultimate 10 times in one run.', icon: '✨', gold: 50, on: ['ult'], test: () => W().stats.ults >= 10 },
  // ---- lifetime
  { id: 'kj1000', name: 'Kilojoule Club', desc: 'Ride 1,000 kJ in total.', icon: '🔋', gold: 60, on: ['runEnd'], test: () => L().kj >= 1000 },
  { id: 'kj10000', name: 'Power Plant', desc: 'Ride 10,000 kJ in total.', icon: '🏭', gold: 250, on: ['runEnd'], test: () => L().kj >= 10000 },
  { id: 'hours10', name: 'Base Miles', desc: 'Ride 10 hours in total.', icon: '🛣️', gold: 200, on: ['runEnd'], test: () => L().secs >= 36000 },
  { id: 'bank1000', name: 'Prize Purse', desc: 'Earn 1,000 gold in total.', icon: '💰', gold: 50, on: ['runEnd'], test: () => L().gold >= 1000 },
  { id: 'meta10', name: 'Invested', desc: 'Buy 10 permanent upgrade ranks.', icon: '📦', gold: 75, on: ['metaBuy'], test: () => Object.values(save.upgrades).reduce((a, b) => a + b, 0) >= 10 },
];
export const ACH_BY_ID: Record<string, AchDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
const byEvent = new Map<string, AchDef[]>();
for (const a of ACHIEVEMENTS) for (const e of a.on) { if (!byEvent.has(e)) byEvent.set(e, []); byEvent.get(e)!.push(a); }

const run: RunCtx = { shopBuys: 0, banishes: 0, maxedWeapons: 0 };
/** achievements unlocked since the current run started (for the post-run screen) */
export const runUnlocked: string[] = [];
const ctx: Ctx = { type: '', d: null, run };

export function achEvent(type: string, data: Record<string, unknown> | RunEnd = {}) {
  if (game.stress) return;
  if (type === 'runStart') { run.shopBuys = 0; run.banishes = 0; run.maxedWeapons = 0; runUnlocked.length = 0; }
  if (type === 'shopBuy') run.shopBuys++;
  if (type === 'banish') run.banishes++;
  const list = byEvent.get(type); if (!list) return;
  ctx.type = type; ctx.d = data;
  for (let i = 0; i < list.length; i++) {
    const a = list[i]; if (save.ach[a.id]) continue;
    let ok = false; try { ok = a.test(ctx); } catch { ok = false; }
    if (ok) unlock(a);
  }
}
function unlock(a: AchDef) {
  save.ach[a.id] = Date.now(); save.gold += a.gold; persist();
  runUnlocked.push(a.id);
  if (ctx.type !== 'runEnd') toast(`<b>🏆 ${a.name}</b><br><small>${a.desc} · +${a.gold} gold</small>`, 'ach', 4200);
  try { sfx.achieve(); } catch { /* audio not ready */ }
}
export function achCount() { return ACHIEVEMENTS.filter((a) => save.ach[a.id]).length; }

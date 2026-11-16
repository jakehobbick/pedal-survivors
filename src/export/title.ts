/**
 * Funny auto-generated Strava titles. Picks a template that fits what actually happened
 * in the run (boss won/fled, compliance, kills, falls, evolutions, workout type) and fills it in.
 */
import type { RunReport } from '../meta/progress';
import { CHAR_BY_ID } from '../data/characters';
import { BOSSES } from '../data/enemies';
import { ARENA_BY_ID } from '../data/arenas';
import { TEMPLATE_BY_ID } from '../data/workouts';

const pick = <T>(a: T[], seed: number) => a[Math.abs(Math.floor(seed)) % a.length];
const k = (n: number) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n));

export function funnyTitle(r: RunReport): string {
  const seed = r.kills * 7 + r.level * 13 + Math.round(r.kj) + r.secs;
  const ch = CHAR_BY_ID[r.char]?.name || 'Rider';
  const arena = ARENA_BY_ID[r.arena]; const boss = arena ? BOSSES[arena.boss]?.name || 'the boss' : 'the boss';
  const tpl = TEMPLATE_BY_ID[r.tpl]?.name || 'Workout';
  const K = k(r.kills); const comp = Math.round(r.compliance * 100);
  const pools: string[][] = [];
  if (r.won) pools.push([
    `Dropped ${boss} on the final sprint`,
    `${boss} has been relegated to the grupetto`,
    `${tpl}, ${K} kills and one very sad ${boss}`,
    `Shield broken in ${r.sprintSecs.toFixed(0)} s. My quads are also broken.`,
    `Sprinted through a boss's shield, as one does on a Tuesday`,
  ]);
  if (r.fled) pools.push([`${boss} saw my watts and fled`, `Boss escaped. My legs did not.`, `Chased ${boss} into the mist. Strava says I'm still chasing.`]);
  if (r.structured && r.compliance >= 0.95) pools.push([`${comp}% compliant. Coach, are you seeing this?`, `Nailed every interval, also ${K} monsters`, `Robot legs: ${comp}% in the band`]);
  if (r.structured && r.compliance < 0.6 && r.secs > 600) pools.push([`${comp}% compliance, 100% vibes`, `The intervals were more of a suggestion`, `Coach said 88–94%. I said "hold my bidon".`]);
  if (r.falls >= 3) pools.push([`Fell over ${r.falls} times on a stationary bike`, `Rubber side up ×${r.falls}`, `${r.falls} crashes and zero road rash`]);
  if (r.kills >= 2000) pools.push([`${K} kills, ${Math.round(r.kj)} kJ, 0 regrets`, `Peloton? More like PELOTOMB (${K} KOs)`, `Mass start, mass destruction`]);
  if (r.evolutions >= 2) pools.push([`Evolved ${r.evolutions} weapons and my FTP (hopefully)`, `Full send, full build`]);
  if (r.tpl === 'vo2') pools.push([`VO₂ max? More like VO₂ maxed out`, `5 × 3 min of seeing through time`, `Lungs: present. Dignity: elsewhere.`]);
  if (r.tpl === 'sweetspot') pools.push([`Sweet Spot, sour legs`, `Found the sweet spot. Also ${K} goblins.`, `Not too hard, not too easy, extremely haunted`]);
  if (r.tpl === 'threshold') pools.push([`2 × 20 at threshold, 1 × me on the floor`, `Threshold of pain, threshold of power`]);
  if (r.tpl === 'endurance') pools.push([`Zone 2, but make it monster-infested`, `Easy spin through a haunted forest`, `Base miles and boss kills`]);
  if (r.tpl === 'ladder') pools.push([`Climbed the Sprint Ladder, fell off the Sprint Ladder`, `Sprints so fast the monsters filed a complaint`]);
  if (r.tpl === 'overunder') pools.push([`Over, under, over, under, over it`, `Lactate juggling with extra goblins`]);
  if (r.tpl === 'free') pools.push([`Free Ride: no plan, ${K} kills`, `Rode however I wanted and the horde adapted`]);
  pools.push([
    `${ch} vs ${K} monsters on ${arena?.name || 'the trainer'}`,
    `Indoor ride, outdoor-level carnage`,
    `${Math.round(r.np)} W NP and a ${r.level}-level power fantasy`,
    `Rode ${Math.round(r.secs / 60)} min, saved the world (virtually)`,
  ]);
  const pool = pick(pools.slice(0, 2), seed);
  return `${pick(pool, seed >> 2)} · Pedal Survivors`;
}

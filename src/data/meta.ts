/** PERMANENT UPGRADES bought with gold between runs. cost(rank) = base * (rank+1)^1.5 rounded. */
import type { Stats } from '../game/types';
export interface MetaNode { id: string; name: string; desc: string; icon: string; max: number; base: number; apply: (s: Partial<Stats> & Record<string, number>, r: number) => void }
const add = (k: string, v: number) => (s: Record<string, number>, r: number) => { s[k] = (s[k] || 0) + v * r; };
export const META: MetaNode[] = [
  { id: 'might', name: 'Power Training', desc: '+5% damage per rank', icon: 'pm', max: 5, base: 60, apply: add('might', 0.05) },
  { id: 'armor', name: 'Thicker Tires', desc: '+1 armor per rank', icon: 'sealant', max: 3, base: 90, apply: add('armor', 1) },
  { id: 'maxhp', name: 'Base Fitness', desc: '+10 max HP per rank', icon: 'chamois', max: 5, base: 50, apply: add('maxHp', 10) },
  { id: 'regen', name: 'Recovery Rides', desc: '+0.15 HP/s per rank', icon: 'electro', max: 5, base: 70, apply: add('regen', 0.15) },
  { id: 'cooldown', name: 'Smooth Shifting', desc: '−3% cooldowns per rank', icon: 'lube', max: 3, base: 120, apply: (s, r) => { s.cooldown = Math.pow(0.97, r); } },
  { id: 'area', name: 'Wide Bars', desc: '+5% area per rank', icon: 'co2', max: 3, base: 100, apply: add('area', 0.05) },
  { id: 'speed', name: 'Aero Position', desc: '+8% projectile speed per rank', icon: 'aero', max: 3, base: 60, apply: add('projSpeed', 0.08) },
  { id: 'duration', name: 'Long Rides', desc: '+8% duration per rank', icon: 'gel', max: 3, base: 80, apply: add('duration', 0.08) },
  { id: 'amount', name: 'Extra Bottle Cage', desc: '+1 projectile for every weapon', icon: 'cadence', max: 1, base: 900, apply: add('amount', 1) },
  { id: 'move', name: 'Bike Fit', desc: '+4% move speed per rank', icon: 'aero', max: 3, base: 70, apply: add('move', 0.04) },
  { id: 'magnet', name: 'Bigger Pockets', desc: '+20% pickup range per rank', icon: 'bag', max: 3, base: 50, apply: (s, r) => { s.magnet = 1 + 0.2 * r; } },
  { id: 'luck', name: 'Lucky Number', desc: '+8% luck per rank', icon: 'socks', max: 3, base: 90, apply: add('luck', 0.08) },
  { id: 'growth', name: 'Coach Notes', desc: '+4% XP per rank', icon: 'log', max: 5, base: 80, apply: add('growth', 0.04) },
  { id: 'greed', name: 'Prize Money', desc: '+8% gold per rank', icon: 'gold', max: 5, base: 60, apply: add('greed', 0.08) },
  { id: 'revival', name: 'Second Wind', desc: 'Get back up faster and with more HP', icon: 'heal', max: 3, base: 150, apply: add('revival', 1) },
  { id: 'reroll', name: 'Team Car', desc: '+1 reroll per run', icon: 'cadence', max: 3, base: 110, apply: add('rerolls', 1) },
  { id: 'banish', name: 'Commissaire', desc: '+1 banish per run', icon: 'sealant', max: 3, base: 110, apply: add('banishes', 1) },
  { id: 'dash', name: 'Quick Jump', desc: '−10% dash cooldown per rank', icon: 'aero', max: 3, base: 80, apply: add('dashcd', 0.1) },
];
export const META_BY_ID: Record<string, MetaNode> = Object.fromEntries(META.map((m) => [m.id, m]));
export function metaCost(n: MetaNode, rank: number) { return Math.round(n.base * Math.pow(rank + 1, 1.5) / 5) * 5; }
/** accumulate all bought ranks into a stats delta + run extras */
export function metaStats(upgrades: Record<string, number>) {
  const s: Record<string, number> = {};
  for (const n of META) { const r = upgrades[n.id] || 0; if (r > 0) n.apply(s, r); }
  const extra = { rerolls: s.rerolls || 0, banishes: s.banishes || 0, skips: 1, dashcd: s.dashcd || 0 };
  delete s.rerolls; delete s.banishes; delete s.dashcd;
  return { stats: s as Partial<Stats>, extra };
}

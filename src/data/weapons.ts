import type { WeaponDef, WStats, PassiveDef } from '../game/types';

/**
 * WEAPONS — add a new weapon by appending an entry. `behavior` picks the firing code in
 * src/game/weapons.ts; every number is in `base` and the per-level deltas are additive.
 * Evolutions: a max-level weapon + the passive in `evo.with` becomes `evo.into` when a chest opens.
 */
const W = (o: Partial<WStats>): WStats => ({ dmg: 10, cd: 1, area: 1, speed: 400, dur: 1, amount: 1, pierce: 1, knock: 40, aoe: 0, tick: 0.3, bounce: 0, special: 0, ...o });

export const WEAPONS: WeaponDef[] = [
  {
    id: 'darts', name: 'Valve Darts', behavior: 'shot', color: '#7fe0ff',
    desc: 'Fires Presta valve darts at the nearest enemy.',
    base: W({ dmg: 9, cd: 0.95, speed: 560, dur: 1.2, amount: 1, pierce: 1, knock: 30 }),
    levels: [['+1 dart', { amount: 1 }], ['+5 damage', { dmg: 5 }], ['+1 dart', { amount: 1 }], ['−15% cooldown', { cd: -0.15 }], ['+1 pierce, +6 damage', { pierce: 1, dmg: 6 }]],
    evo: { with: 'cadence', into: 'presta' },
  },
  {
    id: 'shuriken', name: 'Spoke Shuriken', behavior: 'shot', color: '#e0e6ff',
    desc: 'Spinning spoke stars that slice through several enemies.',
    base: W({ dmg: 14, cd: 1.3, speed: 400, dur: 1.5, amount: 1, pierce: 3, knock: 50, special: 1 }),
    levels: [['+1 shuriken', { amount: 1 }], ['+7 damage', { dmg: 7 }], ['+2 pierce', { pierce: 2 }], ['+1 shuriken', { amount: 1 }], ['+25% size, +8 damage', { area: 0.25, dmg: 8 }]],
    evo: { with: 'aero', into: 'wheel' },
  },
  {
    id: 'whip', name: 'Chain Whip', behavior: 'whip', color: '#ffd166',
    desc: 'Lashes a greasy chain to your sides.',
    base: W({ dmg: 18, cd: 1.25, area: 1, amount: 1, knock: 70 }),
    levels: [['Also whips behind you', { amount: 1 }], ['+8 damage', { dmg: 8 }], ['+15% area', { area: 0.15 }], ['+10 damage', { dmg: 10 }], ['−20% cooldown, +10% area', { cd: -0.2, area: 0.1 }]],
    evo: { with: 'lube', into: 'reaper' },
  },
  {
    id: 'cannon', name: 'Pump Cannon', behavior: 'cannon', color: '#ff9f43',
    desc: 'A floor-pump cannonball that bursts on impact.',
    base: W({ dmg: 32, cd: 2.3, speed: 330, dur: 2, amount: 1, aoe: 62, knock: 160 }),
    levels: [['+12 damage', { dmg: 12 }], ['+20% blast radius', { aoe: 12 }], ['+1 cannonball', { amount: 1 }], ['−0.4 s cooldown', { cd: -0.4 }], ['+18 damage', { dmg: 18 }]],
    evo: { with: 'co2', into: 'howitzer' },
  },
  {
    id: 'bell', name: 'Bell Ring', behavior: 'aura', color: '#ffe08a',
    desc: 'Ding! A shockwave that pushes the horde back.',
    base: W({ dmg: 14, cd: 1.35, aoe: 112, knock: 80 }),
    levels: [['+20% radius', { aoe: 20 }], ['+6 damage', { dmg: 6 }], ['−0.25 s cooldown', { cd: -0.25 }], ['+20% radius', { aoe: 20 }], ['+9 damage', { dmg: 9 }]],
    evo: { with: 'chamois', into: 'chime' },
  },
  {
    id: 'bidon', name: 'Bidon Bomb', behavior: 'lob', color: '#5ef38c',
    desc: 'Lobs bottles that leave a fizzing electrolyte puddle.',
    base: W({ dmg: 6, cd: 2.7, speed: 1, dur: 3, amount: 1, aoe: 54, tick: 0.3, knock: 0 }),
    levels: [['+1 bottle', { amount: 1 }], ['+20% puddle size', { aoe: 11 }], ['+3 damage', { dmg: 3 }], ['+1 bottle', { amount: 1 }], ['+1 s duration', { dur: 1 }]],
    evo: { with: 'electro', into: 'tsunami' },
  },
  {
    id: 'drone', name: 'Pace Drone', behavior: 'orbit', color: '#c9b6ff',
    desc: 'Orbiting pace drones bump enemies off your wheel.',
    base: W({ dmg: 10, cd: 3.0, dur: 3.2, amount: 2, aoe: 88, speed: 3.2, knock: 60 }),
    levels: [['+1 drone', { amount: 1 }], ['+25% orbit speed', { speed: 0.8 }], ['+1 drone', { amount: 1 }], ['+5 damage', { dmg: 5 }], ['+0.8 s uptime, +20% radius', { dur: 0.8, aoe: 18 }]],
    evo: { with: 'pm', into: 'swarm' },
  },
  {
    id: 'lightning', name: 'Tire Lightning', behavior: 'strike', color: '#fff3a0',
    desc: 'Static from your tires strikes random enemies.',
    base: W({ dmg: 22, cd: 2.1, amount: 2, aoe: 34, knock: 20 }),
    levels: [['+1 strike', { amount: 1 }], ['+10 damage', { dmg: 10 }], ['+1 strike', { amount: 1 }], ['+25% blast', { aoe: 9 }], ['−0.3 s cooldown', { cd: -0.3 }]],
    evo: { with: 'rims', into: 'tubular' },
  },
  {
    id: 'boomer', name: 'Peloton Boomerang', behavior: 'boomerang', color: '#ff5d8f',
    desc: 'A wheel that flies out and rolls back through the pack.',
    base: W({ dmg: 16, cd: 1.8, speed: 440, dur: 1.4, amount: 1, area: 1, knock: 50 }),
    levels: [['+1 boomerang', { amount: 1 }], ['+8 damage', { dmg: 8 }], ['+20% size', { area: 0.2 }], ['+1 boomerang', { amount: 1 }], ['+25% speed', { speed: 110 }]],
    evo: { with: 'socks', into: 'grandtour' },
  },
  {
    id: 'laser', name: 'Gel Laser', behavior: 'beam', color: '#ff7ae8',
    desc: 'A caffeinated beam that pierces everything in a line.',
    base: W({ dmg: 20, cd: 1.55, area: 1, amount: 1, aoe: 400, knock: 30 }),
    levels: [['+8 damage', { dmg: 8 }], ['+25% width', { area: 0.25 }], ['+1 beam', { amount: 1 }], ['−0.25 s cooldown', { cd: -0.25 }], ['+12 damage', { dmg: 12 }]],
    evo: { with: 'gel', into: 'hyper' },
  },
  {
    id: 'trail', name: 'Draft Trail', behavior: 'trail', color: '#ff6a1a',
    desc: 'Your slipstream ignites. Anything that drafts you burns.',
    base: W({ dmg: 5, cd: 0.12, aoe: 22, dur: 1.6, tick: 0.25, knock: 0 }),
    levels: [['+2 damage', { dmg: 2 }], ['+25% flame size', { aoe: 6 }], ['+0.6 s burn', { dur: 0.6 }], ['+3 damage', { dmg: 3 }], ['+25% flame size', { aoe: 6 }]],
    evo: { with: 'sealant', into: 'inferno' },
  },
  // ---------- evolutions (never offered directly) ----------
  { id: 'presta', name: 'Presta Storm', behavior: 'shot', color: '#7fe0ff', evolved: true, desc: 'A non-stop fan of darts in every direction.',
    base: W({ dmg: 16, cd: 0.32, speed: 640, dur: 1.2, amount: 6, pierce: 3, knock: 30, special: 2 }), levels: [] },
  { id: 'wheel', name: 'Wheel of Ruin', behavior: 'shot', color: '#ffffff', evolved: true, desc: 'Huge spinning wheels ricochet between enemies.',
    base: W({ dmg: 32, cd: 1.1, speed: 460, dur: 2.6, amount: 3, pierce: 6, area: 1.8, knock: 80, bounce: 6, special: 1 }), levels: [] },
  { id: 'reaper', name: 'Derailleur Reaper', behavior: 'whip', color: '#ffd166', evolved: true, desc: 'Full-circle chain slashes that heal you.',
    base: W({ dmg: 40, cd: 0.9, area: 1.5, amount: 4, knock: 90, special: 1 }), levels: [] },
  { id: 'howitzer', name: 'CO₂ Howitzer', behavior: 'cannon', color: '#ff9f43', evolved: true, desc: 'Shells burst into a cluster of bomblets.',
    base: W({ dmg: 60, cd: 1.6, speed: 360, dur: 2, amount: 2, aoe: 100, knock: 200, special: 1 }), levels: [] },
  { id: 'chime', name: 'Cathedral Chime', behavior: 'aura', color: '#fff6c8', evolved: true, desc: 'A holy peal that stuns enemies and heals you.',
    base: W({ dmg: 26, cd: 1.15, aoe: 180, knock: 220, special: 1 }), levels: [] },
  { id: 'tsunami', name: 'Tsunami Bidon', behavior: 'lob', color: '#5ef38c', evolved: true, desc: 'Puddles swell into slowing tidal pools.',
    base: W({ dmg: 13, cd: 2.0, dur: 4.5, amount: 4, aoe: 86, tick: 0.3, knock: 0, special: 1 }), levels: [] },
  { id: 'swarm', name: 'Domestique Swarm', behavior: 'orbit', color: '#c9b6ff', evolved: true, desc: 'A permanent team of drones that also open fire.',
    base: W({ dmg: 20, cd: 0, dur: 999, amount: 6, aoe: 120, speed: 3.6, knock: 70, special: 1 }), levels: [] },
  { id: 'tubular', name: 'Thunder Tubular', behavior: 'strike', color: '#fff3a0', evolved: true, desc: 'Lightning that chains through the pack.',
    base: W({ dmg: 42, cd: 1.4, amount: 5, aoe: 56, knock: 30, bounce: 3, special: 1 }), levels: [] },
  { id: 'grandtour', name: 'Grand Tour Boomerang', behavior: 'boomerang', color: '#ff5d8f', evolved: true, desc: 'Four lucky wheels spiral out and back. Always crits.',
    base: W({ dmg: 34, cd: 1.3, speed: 520, dur: 1.8, amount: 4, area: 1.5, knock: 70, special: 1 }), levels: [] },
  { id: 'hyper', name: 'Hyper Beam', behavior: 'beam', color: '#ff7ae8', evolved: true, desc: 'A sustained, sweeping mega-beam.',
    base: W({ dmg: 14, cd: 2.2, area: 2.4, amount: 2, aoe: 560, dur: 1.4, tick: 0.12, knock: 20, special: 1 }), levels: [] },
  { id: 'inferno', name: 'Inferno Draft', behavior: 'trail', color: '#ff3d00', evolved: true, desc: 'A firestorm wake; burning enemies take +25% damage.',
    base: W({ dmg: 12, cd: 0.08, aoe: 40, dur: 2.4, tick: 0.2, knock: 0, special: 1 }), levels: [] },
];
export const WEAPON_BY_ID: Record<string, WeaponDef> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
export const MAX_WEAPON_LV = 6;
export const MAX_SLOTS = 6;

/** PASSIVES — `apply(stats, level)` adds the effect of `level` levels. */
export const PASSIVES: PassiveDef[] = [
  { id: 'aero', name: 'Aero Helmet', color: '#4cc9f0', max: 5, desc: 'Slices the wind.', per: '+8% move speed, +10% projectile speed', apply: (s, l) => { s.move += 0.08 * l; s.projSpeed += 0.1 * l; } },
  { id: 'lube', name: 'Chain Lube', color: '#ffd166', max: 5, desc: 'Silky drivetrain.', per: '−6% cooldowns', apply: (s, l) => { s.cooldown *= Math.pow(0.94, l); } },
  { id: 'co2', name: 'CO₂ Cartridge', color: '#ff9f43', max: 5, desc: 'Everything gets bigger.', per: '+10% area', apply: (s, l) => { s.area += 0.1 * l; } },
  { id: 'electro', name: 'Electrolytes', color: '#5ef38c', max: 5, desc: 'Stay salty.', per: '+0.3 HP/s regeneration', apply: (s, l) => { s.regen += 0.3 * l; } },
  { id: 'pm', name: 'Power Meter', color: '#ff5d8f', max: 5, desc: 'What gets measured gets mashed.', per: '+10% damage', apply: (s, l) => { s.might += 0.1 * l; } },
  { id: 'rims', name: 'Carbon Rims', color: '#c0c6d8', max: 5, desc: 'Deep-section crits.', per: '+5% crit chance, +10% crit damage', apply: (s, l) => { s.crit += 0.05 * l; s.critMult += 0.1 * l; } },
  { id: 'gel', name: 'Caffeine Gel', color: '#ff7ae8', max: 5, desc: 'It lasts longer.', per: '+10% duration', apply: (s, l) => { s.duration += 0.1 * l; } },
  { id: 'socks', name: 'Lucky Socks', color: '#9b5de5', max: 5, desc: 'Never washed.', per: '+12% luck', apply: (s, l) => { s.luck += 0.12 * l; } },
  { id: 'cadence', name: 'Cadence Sensor', color: '#7fe0ff', max: 3, desc: 'More revs, more shots.', per: '+1 projectile', apply: (s, l) => { s.amount += l; } },
  { id: 'bag', name: 'Saddle Bag', color: '#b08968', max: 5, desc: 'Room for everything.', per: '+25% pickup range, +6% gold', apply: (s, l) => { s.magnet *= 1 + 0.25 * l; s.greed += 0.06 * l; } },
  { id: 'chamois', name: 'Chamois Cream', color: '#ffb3d1', max: 5, desc: 'Comfort is health.', per: '+20 max HP', apply: (s, l) => { s.maxHp += 20 * l; } },
  { id: 'sealant', name: 'Tubeless Sealant', color: '#e0e0e0', max: 5, desc: 'Seals the holes.', per: '+1 armor', apply: (s, l) => { s.armor += l; } },
  { id: 'log', name: 'Training Log', color: '#a0e7a0', max: 5, desc: 'Gains are logged.', per: '+8% XP', apply: (s, l) => { s.growth += 0.08 * l; } },
];
export const PASSIVE_BY_ID: Record<string, PassiveDef> = Object.fromEntries(PASSIVES.map((p) => [p.id, p]));
export const MAX_PASSIVE_SLOTS = 6;

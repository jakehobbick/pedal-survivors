/**
 * ARENAS — each has its own ground art, enemy set (with themed art + names), hazards and bosses.
 * `pool` entries: [enemyId, weight, fromProgress(0..1)].
 */
export interface ArenaDef {
  id: string; name: string; sub: string; theme: 'sakura' | 'neon' | 'volcano';
  pool: [string, number, number][];
  names: Record<string, string>;
  minis: string[]; boss: string;
  hazard: 'boulder' | 'laser' | 'geyser';
  hpMult: number;
  unlock: null | { text: string; check: (meta: { bossKills: Record<string, number> }) => boolean };
  music: { root: number; scale: number[]; bpm: number };
}
export const ARENAS: ArenaDef[] = [
  {
    id: 'sakura', name: 'Sakura Switchbacks', sub: 'Blossom-lined mountain roads haunted by folklore spirits.', theme: 'sakura',
    pool: [['goblin', 10, 0], ['gnat', 7, 0], ['slime', 5, 0.05], ['boar', 4, 0.12], ['wisp', 4, 0.2], ['tanuki', 3, 0.28], ['golem', 3, 0.35], ['knight', 3, 0.45], ['fox', 2, 0.55]],
    names: { gnat: 'Kodama Sprite', goblin: 'Tengu Scout', golem: 'Moss Golem', boar: 'Inoshishi Boar', wisp: 'Hitodama Wisp', slime: 'Mochi Slime', slimelet: 'Mochi Bit', knight: 'Ashigaru Guard', tanuki: 'Bomb Tanuki', phantom: 'Yūrei', fox: 'Shrine Kitsune' },
    minis: ['ninetails', 'colossus', 'mecha'], boss: 'oni', hazard: 'boulder', hpMult: 1,
    unlock: null,
    music: { root: 57, scale: [0, 2, 4, 7, 9], bpm: 112 },
  },
  {
    id: 'neon', name: 'Neon Criterium', sub: 'A rain-slick midnight city circuit full of rogue machines.', theme: 'neon',
    pool: [['goblin', 10, 0], ['gnat', 8, 0], ['boar', 4, 0.05], ['wisp', 5, 0.1], ['slime', 4, 0.15], ['phantom', 4, 0.22], ['tanuki', 4, 0.3], ['knight', 3, 0.38], ['golem', 3, 0.45], ['fox', 2, 0.55]],
    names: { gnat: 'Glitch Drone', goblin: 'Street Punk Bot', golem: 'Riot Mech', boar: 'Hover-Bike Charger', wisp: 'Holo Turret', slime: 'Gel Virus', slimelet: 'Gel Fragment', knight: 'Firewall Sentinel', tanuki: 'Bomb Cart', phantom: 'Packet Ghost', fox: 'Repair Fox-Bot' },
    minis: ['mecha', 'ninetails', 'colossus'], boss: 'leviathan', hazard: 'laser', hpMult: 1.25,
    unlock: { text: 'Defeat the Oni Shogun in Sakura Switchbacks', check: (m) => (m.bossKills.oni || 0) > 0 },
    music: { root: 50, scale: [0, 3, 5, 7, 10], bpm: 124 },
  },
  {
    id: 'volcano', name: 'Volcano Col', sub: 'The hors-catégorie climb to a demon-infested caldera.', theme: 'volcano',
    pool: [['goblin', 9, 0], ['gnat', 7, 0], ['phantom', 4, 0.05], ['boar', 5, 0.08], ['tanuki', 3, 0.12], ['wisp', 5, 0.18], ['slime', 4, 0.22], ['golem', 4, 0.3], ['knight', 4, 0.36], ['fox', 3, 0.5]],
    names: { gnat: 'Cinder Imp', goblin: 'Ash Goblin', golem: 'Magma Golem', boar: 'Hellhog', wisp: 'Ember Eye', slime: 'Lava Slime', slimelet: 'Lava Drip', knight: 'Obsidian Knight', tanuki: 'Fuse Fiend', phantom: 'Smoke Wraith', fox: 'Flame Kitsune' },
    minis: ['colossus', 'mecha', 'ninetails'], boss: 'wyrm', hazard: 'geyser', hpMult: 1.5,
    unlock: { text: 'Defeat the Neon Leviathan in Neon Criterium', check: (m) => (m.bossKills.leviathan || 0) > 0 },
    music: { root: 45, scale: [0, 1, 4, 5, 7, 8, 10], bpm: 132 },
  },
];
export const ARENA_BY_ID: Record<string, ArenaDef> = Object.fromEntries(ARENAS.map((a) => [a.id, a]));

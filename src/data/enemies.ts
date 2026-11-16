import type { EnemyDef } from '../game/types';

/**
 * ENEMIES — stats are at minute 0; the director scales HP/damage with time and wave intensity.
 * `behavior` selects the AI in src/game/enemies.ts. Art per arena comes from src/art/enemies.ts
 * (keyed by the same id), names per arena from ARENAS[*].names.
 */
export const ENEMIES: EnemyDef[] = [
  { id: 'gnat', behavior: 'swarm', hp: 6, speed: 118, dmg: 5, r: 10, xp: 1, mass: 0.5 },
  { id: 'goblin', behavior: 'chase', hp: 16, speed: 74, dmg: 8, r: 14, xp: 1, mass: 1 },
  { id: 'golem', behavior: 'chase', hp: 80, speed: 46, dmg: 16, r: 23, xp: 5, mass: 4 },
  { id: 'boar', behavior: 'charger', hp: 34, speed: 62, dmg: 14, r: 17, xp: 3, mass: 2, chargeSpeed: 400, chargeCd: 3.4, windup: 0.75, range: 330 },
  { id: 'wisp', behavior: 'ranged', hp: 22, speed: 66, dmg: 6, r: 13, xp: 2, mass: 0.8, range: 270, fireCd: 2.6, projSpeed: 175, projDmg: 9 },
  { id: 'slime', behavior: 'splitter', hp: 42, speed: 56, dmg: 9, r: 18, xp: 2, mass: 1.5, splitInto: 'slimelet', splitCount: 2 },
  { id: 'slimelet', behavior: 'chase', hp: 12, speed: 84, dmg: 6, r: 11, xp: 1, mass: 0.6, hidden: true },
  { id: 'knight', behavior: 'shielded', hp: 64, speed: 52, dmg: 12, r: 18, xp: 4, mass: 3 },
  { id: 'tanuki', behavior: 'exploder', hp: 18, speed: 98, dmg: 6, r: 14, xp: 2, mass: 0.8, fuse: 0.9, blastR: 70, blastDmg: 12 },
  { id: 'phantom', behavior: 'phaser', hp: 26, speed: 86, dmg: 10, r: 14, xp: 3, mass: 0.7 },
  { id: 'fox', behavior: 'healer', hp: 32, speed: 62, dmg: 7, r: 15, xp: 4, mass: 1, range: 210, healR: 130, healPct: 0.12 },
  // mini-bosses
  { id: 'colossus', behavior: 'boss', hp: 1500, speed: 52, dmg: 22, r: 46, xp: 60, mass: 30, hidden: true },
  { id: 'ninetails', behavior: 'boss', hp: 1300, speed: 78, dmg: 18, r: 38, xp: 60, mass: 25, hidden: true },
  { id: 'mecha', behavior: 'boss', hp: 1400, speed: 64, dmg: 20, r: 40, xp: 60, mass: 25, hidden: true },
  // final bosses
  { id: 'oni', behavior: 'boss', hp: 7000, speed: 60, dmg: 26, r: 58, xp: 200, mass: 100, hidden: true },
  { id: 'leviathan', behavior: 'boss', hp: 8000, speed: 70, dmg: 26, r: 60, xp: 200, mass: 100, hidden: true },
  { id: 'wyrm', behavior: 'boss', hp: 9000, speed: 64, dmg: 30, r: 62, xp: 200, mass: 100, hidden: true },
];
export const ENEMY_BY_ID: Record<string, EnemyDef> = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));

/** Boss metadata: attack patterns are implemented in src/game/bosses.ts */
export interface BossDef { id: string; name: string; title: string; final: boolean; attacks: string[]; color: string }
export const BOSSES: Record<string, BossDef> = {
  colossus: { id: 'colossus', name: 'Gravel Colossus', title: 'Mini-boss', final: false, attacks: ['slam', 'rocks'], color: '#a39b8b' },
  ninetails: { id: 'ninetails', name: 'Nine-Tails Matriarch', title: 'Mini-boss', final: false, attacks: ['spiral', 'dashes'], color: '#ffb347' },
  mecha: { id: 'mecha', name: 'Mecha Domestique', title: 'Mini-boss', final: false, attacks: ['laser', 'summon'], color: '#7fe0ff' },
  oni: { id: 'oni', name: 'Oni Shogun of the Summit', title: 'Final boss', final: true, attacks: ['slam', 'ring', 'charge', 'summon'], color: '#ff4d5e' },
  leviathan: { id: 'leviathan', name: 'Neon Leviathan', title: 'Final boss', final: true, attacks: ['laser', 'spiral', 'summon', 'ring'], color: '#22e5ff' },
  wyrm: { id: 'wyrm', name: 'Magma Wyrm', title: 'Final boss', final: true, attacks: ['rocks', 'ring', 'charge', 'spiral'], color: '#ff6a1a' },
};

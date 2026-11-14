import type { RiderLook } from '../art/rider';

/**
 * Playable riders. Each has a starting weapon, a riding-style passive and an ultimate.
 * Passive hooks are implemented in game/player.ts (search for `passive ===`).
 */
export interface CharacterDef {
  id: string; name: string; title: string; style: 'sprinter' | 'climber' | 'tt' | 'allrounder' | 'domestique';
  weapon: string; ult: 'leadout' | 'summit' | 'tempo' | 'peloton' | 'bottles';
  passiveName: string; passiveDesc: string; ultName: string; ultDesc: string;
  look: RiderLook;
  base: { maxHp: number; move: number; might: number; armor: number };
  unlock: null | { ach: string; text: string };
}
export const CHARACTERS: CharacterDef[] = [
  {
    id: 'kai', name: 'Kai', title: 'the Sprinter', style: 'sprinter', weapon: 'darts', ult: 'leadout',
    passiveName: 'Kick', passiveDesc: 'Above 120% FTP: +30% damage and +20% move speed. Dash cooldown −30%.',
    ultName: 'Leadout Lightning', ultDesc: 'Calls down a storm of lightning on every enemy on screen.',
    look: { skin: '#ffe0c4', hair: '#ff7a3d', hairStyle: 'spiky', eye: '#ff4d5e', jersey: '#e23e3e', jersey2: '#ffd166', bike: '#ff2e63', helmet: '#f8f8ff', scarf: '#ffd166', mark: 'bolt' },
    base: { maxHp: 100, move: 1.05, might: 1.0, armor: 0 }, unlock: null,
  },
  {
    id: 'mira', name: 'Mira', title: 'the Climber', style: 'climber', weapon: 'bell', ult: 'summit',
    passiveName: 'Grinder', passiveDesc: 'Below 80 rpm: +2 armor and +25% area. Heavy gears (16+) add +15% damage.',
    ultName: 'Summit Quake', ultDesc: 'A mountain-shaking shockwave that stuns and crushes the horde.',
    look: { skin: '#f6d2b8', hair: '#6a4cff', hairStyle: 'long', eye: '#5ef38c', jersey: '#2fbf71', jersey2: '#ffffff', bike: '#1fa868', helmet: '#e8ffe8', scarf: '#c9b6ff', mark: 'leaf' },
    base: { maxHp: 120, move: 0.95, might: 1.0, armor: 1 }, unlock: null,
  },
  {
    id: 'sora', name: 'Sora', title: 'the TT Specialist', style: 'tt', weapon: 'laser', ult: 'tempo',
    passiveName: 'Metronome', passiveDesc: 'Surge builds 50% faster. Steady power (in target band) gives +15% move speed and cooldown.',
    ultName: 'Time Trial', ultDesc: 'Slows time for enemies for 6 s while your weapons fire at double speed.',
    look: { skin: '#fff0e0', hair: '#e8f4ff', hairStyle: 'bob', eye: '#4cc9f0', jersey: '#2a6cff', jersey2: '#4cc9f0', bike: '#1b1f3b', helmet: '#4cc9f0', scarf: '#ffffff', mark: 'wave' },
    base: { maxHp: 95, move: 1.0, might: 1.05, armor: 0 }, unlock: null,
  },
  {
    id: 'ren', name: 'Ren', title: 'the All-Rounder', style: 'allrounder', weapon: 'shuriken', ult: 'peloton',
    passiveName: 'Versatile', passiveDesc: '+10% XP and +1 reroll per run. Gains +1% damage per level.',
    ultName: 'Peloton Storm', ultDesc: 'Summons a spinning peloton of ghost riders that shreds everything nearby.',
    look: { skin: '#ffd9b5', hair: '#2b2b3a', hairStyle: 'pony', eye: '#ffd166', jersey: '#9b5de5', jersey2: '#ff5d8f', bike: '#9b5de5', helmet: '#1e1730', scarf: '#ff5d8f', mark: 'star' },
    base: { maxHp: 100, move: 1.0, might: 1.0, armor: 0 }, unlock: null,
  },
  {
    id: 'yuki', name: 'Yuki', title: 'the Domestique', style: 'domestique', weapon: 'drone', ult: 'bottles',
    passiveName: 'Team Player', passiveDesc: '+50% pickup range. Healing pickups heal 50% more. Chests give +1 extra item.',
    ultName: 'Feed Zone', ultDesc: 'Rains bottles that heal you and explode on enemies.',
    look: { skin: '#ffe6d6', hair: '#ffd3e8', hairStyle: 'twin', eye: '#c084fc', jersey: '#ffd166', jersey2: '#2b2b3a', bike: '#ffb703', helmet: '#ffffff', scarf: '#ff9ec7', mark: 'star' },
    base: { maxHp: 110, move: 1.0, might: 0.95, armor: 0 }, unlock: { ach: 'evolve1', text: 'Evolve any weapon' },
  },
];
export const CHAR_BY_ID: Record<string, CharacterDef> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

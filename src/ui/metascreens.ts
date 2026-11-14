/** Meta screens (upgrades shop, achievements, stats, save backup) — milestone 6. */
import { CHAR_BY_ID } from '../data/characters';
import { ARENA_BY_ID } from '../data/arenas';
import { save } from '../core/save';
import { toast } from './ui';
export function isCharUnlocked(id: string) { const c = CHAR_BY_ID[id]; return !!c && (!c.unlock || !!save.ach[c.unlock.ach]); }
export function isArenaUnlocked(id: string) { const a = ARENA_BY_ID[id]; return !!a && (!a.unlock || a.unlock.check({ bossKills: save.life.bossKills })); }
export function openMeta() { toast('Upgrades arrive in milestone 6'); }
export function openAchievements() { toast('Achievements arrive in milestone 6'); }
export function openStats() { toast('Stats arrive in milestone 6'); }
export function openBackup() { toast('Save backup arrives in milestone 6'); }

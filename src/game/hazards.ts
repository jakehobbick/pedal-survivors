/**
 * Telegraphed hazards (boss slams, falling rocks, arena hazards).
 * A TELEGRAPH zone counts down `delay`, then fires here.
 */
import type { World } from './world';
import { Zone, ZK } from './entities';
import { rng } from '../core/math';
import { particle, frameId } from './fx';

export function hazardFire(w: World, z: Zone) {
  if (z.kind === ZK.LASER_LINE) { z.delay = 0; return; } // becomes active; damage handled in world.updateZones
  z.dead = true;
  const col = w.theme === 'neon' ? '#ff7ae8' : w.theme === 'volcano' ? '#ff6a1a' : '#c9a27a';
  w.explode(z.x, z.y, z.r, z.dmg, true, -1, col, 120);
  if (z.special === 2) { // geyser leaves a burning patch
    const p = w.zone(ZK.HAZARD_PATCH, z.x, z.y, z.r * 0.9, 4, z.dmg * 0.25, true); if (p) { p.tick = 0.5; p.col = 'rgba(255,106,26,.55)'; }
    for (let k = 0; k < 10; k++) particle(0, frameId('ember'), z.x, z.y, (rng.next() - 0.5) * 120, -200 - rng.next() * 200, 1, 10, 1);
  }
}
/** arena hazard waves, triggered by the director */
export function arenaHazard(w: World) {
  const P = w.player; const dmg = 14 * w.enemyDmgMult;
  const ahead = (k: number) => [P.x + P.hx * (140 + k * 40) + (rng.next() - 0.5) * 260, P.y + P.hy * (110 + k * 30) + (rng.next() - 0.5) * 200];
  switch (w.arena.hazard) {
    case 'boulder':
      for (let k = 0; k < 5; k++) { const [x, y] = ahead(k); tele(w, x, y, 62, 1.3 + k * 0.18, dmg, 0); }
      w.ev.banner('ROCKSLIDE!', 'Dodge the shadows', 1400); break;
    case 'geyser':
      for (let k = 0; k < 4; k++) { const [x, y] = ahead(k); tele(w, x, y, 70, 1.4 + k * 0.2, dmg, 2); }
      w.ev.banner('ERUPTION!', 'Lava geysers ahead', 1400); break;
    case 'laser': {
      const a = Math.atan2(P.hy, P.hx) + Math.PI / 2;
      for (let k = -1; k <= 1; k += 2) { const z = w.zone(ZK.LASER_LINE, P.x + P.hx * 180 + Math.cos(a) * k * 60, P.y + P.hy * 140, 0, 0.7, dmg, true); if (z) { z.a = a + k * 0.3; z.len = 1300; z.w = 22; z.delay = 1.4; z.max = 1.4; z.life = 0.7; } }
      w.ev.banner('SECURITY GRID!', 'Laser sweep incoming', 1400); break;
    }
  }
}
function tele(w: World, x: number, y: number, r: number, delay: number, dmg: number, special: number) {
  const z = w.zone(ZK.TELEGRAPH, x, y, r, 0.01, dmg, true); if (!z) return;
  z.delay = delay; z.max = delay; z.special = special;
}

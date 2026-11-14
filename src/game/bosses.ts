/** Boss & mini-boss brains (attack patterns + sprint-only shields). Fleshed out in milestone 4/5. */
import type { World } from './world';
import type { Enemy } from './entities';
export function updateBoss(w: World, e: Enemy, dt: number, dx: number, dy: number, d: number): [number, number] {
  void w; void dt; void d;
  const s = e.speed * e.slowF;
  return [dx * s, dy * s];
}

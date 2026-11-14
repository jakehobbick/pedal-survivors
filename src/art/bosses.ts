/** Boss art (milestone 5 replaces this stub with bespoke bosses). */
import type { Enemy } from '../game/entities';
export function drawBoss(g: CanvasRenderingContext2D, e: Enemy, now: number) {
  const f = e.spr.run[Math.floor(e.anim) & 3]; const sc = e.r / 23;
  g.drawImage(f.c, e.x - f.ax * sc, e.y - f.ay * sc, f.w * sc, f.h * sc);
  void now;
}

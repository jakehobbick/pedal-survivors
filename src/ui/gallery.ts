/** ?gallery — renders every generated sprite for art review. */
import { enemySprites, ART_IDS, Theme } from '../art/enemies';
import { buildRiderSheet } from '../art/rider';
import { CHARACTERS } from '../data/characters';
export function showGallery(ctx: CanvasRenderingContext2D, W: number, H: number, DPR: number, extra?: (ctx: CanvasRenderingContext2D, y: number) => void) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#3a4a3a'; ctx.fillRect(0, 0, W, H);
  const themes: Theme[] = ['sakura', 'neon', 'volcano'];
  let y = 70;
  for (const T of themes) {
    let x = 20;
    for (const id of ART_IDS) {
      const s = enemySprites(id, T); const f = s.run[1];
      const sc = 1.5;
      ctx.drawImage(f.c, x, y - f.ay * sc, f.w * sc, f.h * sc);
      if (s.pose[0] && s.pose[0] !== s.run[0]) ctx.drawImage(s.pose[0].c, x, y + 8, f.w * 0.8, f.h * 0.8);
      x += f.w * sc + 8;
    }
    y += 140;
  }
  let x = 20;
  for (const c of CHARACTERS) { const sh = buildRiderSheet(c.look); ctx.drawImage(sh.run[2].c, x, y, sh.run[2].w * 2, sh.run[2].h * 2); ctx.drawImage(sh.portrait, x + 150, y, 80, 80); x += 240; }
  if (extra) extra(ctx, y + 160);
  void W; void H;
}

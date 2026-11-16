/** ?gallery — renders every generated sprite for art review. */
import { enemySprites, ART_IDS, Theme } from '../art/enemies';
import { buildRiderSheet } from '../art/rider';
import { CHARACTERS } from '../data/characters';
import { bossSprites, BOSS_IDS } from '../art/bosses';
import { buildArenaArt } from '../art/arena';
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
  if (location.search.includes('arenas')) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ['sakura', 'neon', 'volcano'].forEach((id, k) => { const a = buildArenaArt(id); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) ctx.drawImage(a.tile, k * 395 + i * 190, j * 190, 190, 190); a.props.forEach((p, n) => ctx.drawImage(p, k * 395 + n * 120, 400, p.width * 0.8, p.height * 0.8)); });
  }
  if (location.search.includes('bosses')) {
    ctx.fillStyle = '#2a3a2a'; ctx.fillRect(0, 0, W, H); let bx = 10; let by = 20;
    for (const id of BOSS_IDS) { const b = bossSprites(id); const f = b.run[1]; const p = b.pose[0]; const sc = 1.1; if (bx + f.w * sc * 2 > W) { bx = 10; by += 300; } ctx.drawImage(f.c, bx, by, f.w * sc, f.h * sc); ctx.drawImage(p.c, bx + f.w * sc, by, f.w * sc, f.h * sc); bx += f.w * sc * 2 + 10; }
  }
  if (extra) extra(ctx, y + 160);
  void W; void H;
}

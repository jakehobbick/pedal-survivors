/**
 * Strava share card (1080×1350, portrait, Instagram/Strava friendly) + title/description text.
 * Layout follows Crank Crypt's card: scene art on top, power graph, stat tiles, footer.
 */
import type { RunReport } from '../meta/progress';
import { recorder } from '../trainer/sensors';
import { FTP } from '../core/settings';
import { buildArenaArt } from '../art/arena';
import { bossSprites } from '../art/bosses';
import { sheetFor } from '../game/game';
import { ARENA_BY_ID } from '../data/arenas';
import { BOSSES } from '../data/enemies';
import { CHAR_BY_ID } from '../data/characters';
import { TEMPLATE_BY_ID } from '../data/workouts';
import { ACH_BY_ID } from '../meta/achievements';
import { WEAPON_BY_ID } from '../data/weapons';
import { ZONE_COLS, powerZone } from '../ui/hud';
import { deliverFile, fileStamp } from './tcx';

const CW = 1080, CH = 1350;
const fmtH = (x: number) => { x = Math.round(x); const h = Math.floor(x / 3600), m = Math.floor(x % 3600 / 60), s = x % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`; };
function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function wrap(c: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' '); const lines: string[] = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}

export async function ensureFonts() {
  try { await Promise.all(['400 40px Bungee', '700 40px Rajdhani', '800 30px "M PLUS Rounded 1c"', '700 30px "M PLUS Rounded 1c"'].map((f) => (document as any).fonts.load(f))); } catch { /* fallback fonts */ }
}

export function makeShareCard(r: RunReport): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; const c = cv.getContext('2d')!;
  const arena = ARENA_BY_ID[r.arena]; const art = buildArenaArt(arena.id); const ch = CHAR_BY_ID[r.char]; const tpl = TEMPLATE_BY_ID[r.tpl];
  const ftp = FTP();
  // ---- scene backdrop: arena ground
  c.save(); c.translate(-80, -40); c.scale(1.3, 1.3);
  for (let y = 0; y < CH; y += art.tile.height) for (let x = 0; x < CW + 200; x += art.tile.width) c.drawImage(art.tile, x, y);
  c.restore();
  c.fillStyle = art.fog; c.fillRect(0, 0, CW, CH);
  // props for depth
  const pr = art.props; if (pr.length) { const p0 = pr[0]; const s0 = 320 / p0.height; c.drawImage(p0, CW - p0.width * s0 + 60, 250, p0.width * s0, p0.height * s0); if (pr[1]) { const s1 = 130 / pr[1].height; c.drawImage(pr[1], 40, 560, pr[1].width * s1, pr[1].height * s1); } }
  // glow under rider
  const gy = 690;
  const glow = c.createRadialGradient(330, gy, 10, 330, gy, 300); glow.addColorStop(0, r.won ? 'rgba(255,209,102,.55)' : 'rgba(127,224,255,.35)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = glow; c.fillRect(0, 300, CW, 700);
  // boss (defeated or escaped)
  try {
    const bs = bossSprites(arena.boss); const f = r.won ? bs.pose[1] || bs.pose[0] : bs.run[0]; const sc = 1.55;
    c.save(); c.globalAlpha = r.won ? 0.95 : 0.45; c.translate(760, gy + 20); if (r.won) c.rotate(0.18);
    c.drawImage(f.c, -f.ax * sc, -f.ay * sc, f.w * sc, f.h * sc); c.restore();
    c.save(); c.translate(780, gy - 260); c.rotate(-0.2); c.font = '400 64px Bungee'; c.textAlign = 'center';
    c.lineWidth = 10; c.strokeStyle = 'rgba(0,0,0,.75)'; const stamp = r.won ? 'K.O.!' : r.fled ? 'ESCAPED' : '';
    if (stamp) { c.strokeText(stamp, 0, 0); c.fillStyle = r.won ? '#ffd166' : '#c9b6ff'; c.fillText(stamp, 0, 0); }
    c.restore();
  } catch { /* boss art missing: skip */ }
  // rider
  try {
    const sh = sheetFor(r.char); const f = sh.run[2]; const sc = 3.3;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(330, gy + 6, 150, 26, 0, 0, 7); c.fill();
    c.drawImage(f.c, 330 - f.ax * sc, gy - f.ay * sc, f.w * sc, f.h * sc);
  } catch { /* no sprite */ }
  // sparkles
  for (let i = 0; i < 40; i++) { const x = (i * 197) % CW, y = 260 + (i * 131) % 520; c.globalAlpha = 0.25 + (i % 5) * 0.12; c.fillStyle = i % 3 ? '#7fe0ff' : '#ffd166'; c.beginPath(); c.arc(x, y, 2 + (i % 4), 0, 7); c.fill(); }
  c.globalAlpha = 1;
  // ---- header
  const hg = c.createLinearGradient(0, 0, 0, 280); hg.addColorStop(0, 'rgba(12,6,26,.95)'); hg.addColorStop(1, 'rgba(12,6,26,0)'); c.fillStyle = hg; c.fillRect(0, 0, CW, 300);
  c.textAlign = 'center'; c.font = '400 86px Bungee';
  const lg = c.createLinearGradient(0, 40, 0, 120); lg.addColorStop(0, '#ffe08a'); lg.addColorStop(0.55, '#ff9f43'); lg.addColorStop(1, '#ff5d8f');
  c.lineWidth = 10; c.strokeStyle = 'rgba(0,0,0,.7)'; c.strokeText('PEDAL SURVIVORS', CW / 2, 118); c.fillStyle = lg; c.fillText('PEDAL SURVIVORS', CW / 2, 118);
  c.font = '800 40px "M PLUS Rounded 1c"'; c.lineWidth = 7;
  const sub = r.won ? `${BOSSES[arena.boss].name.toUpperCase()} DEFEATED` : r.quit ? 'RUN ENDED EARLY' : r.fled ? 'THE BOSS ESCAPED' : 'RUN COMPLETE';
  c.strokeText(sub, CW / 2, 178); c.fillStyle = r.won ? '#ffd166' : '#ffffff'; c.fillText(sub, CW / 2, 178);
  c.font = '700 27px "M PLUS Rounded 1c"'; c.fillStyle = '#d8cdf0';
  c.fillText(`${new Date(recorder.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ${tpl?.name || r.tpl} ${r.min}′ · ${arena.name} · ${ch.name} ${ch.title}`, CW / 2, 224);
  // ---- lower panel
  const py = 790;
  const pg = c.createLinearGradient(0, py - 80, 0, CH); pg.addColorStop(0, 'rgba(14,8,30,0)'); pg.addColorStop(0.1, 'rgba(14,8,30,.96)'); pg.addColorStop(1, '#0e081e');
  c.fillStyle = pg; c.fillRect(0, py - 80, CW, CH - py + 80);
  // funny title
  c.font = '800 38px "M PLUS Rounded 1c"'; c.textAlign = 'center'; c.fillStyle = '#ffffff';
  const t = r.title.replace(/ · Pedal Survivors$/, ''); const lines = wrap(c, `“${t}”`, CW - 140).slice(0, 2);
  lines.forEach((l, i) => c.fillText(l, CW / 2, py + i * 46));
  // power graph with target
  const gx = 60, gw = CW - 120, gyy = py + (lines.length > 1 ? 80 : 50), gh = 120; const R = recorder; const n = Math.min(R.n, 540);
  if (R.n > 20) {
    const step = R.n / n; let mx = ftp * 1.6;
    const pts = new Float32Array(n), tg = new Float32Array(n);
    for (let i = 0; i < n; i++) { let s = 0, k = 0, ts = 0; for (let j = Math.floor(i * step); j < Math.floor((i + 1) * step); j++) { s += R.p[j]; ts += R.tgt[j]; k++; } pts[i] = k ? s / k : 0; tg[i] = k ? ts / k : 0; mx = Math.max(mx, pts[i]); }
    const X = (i: number) => gx + i / (n - 1) * gw, Y = (v: number) => gyy + gh - Math.min(1, v / mx) * gh;
    const bw = gw / n + 0.6;
    for (let i = 0; i < n; i++) { c.fillStyle = ZONE_COLS[powerZone(pts[i] / ftp)]; c.globalAlpha = 0.85; c.fillRect(X(i), Y(pts[i]), bw, gyy + gh - Y(pts[i])); }
    c.globalAlpha = 1;
    // target line
    c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.beginPath(); let on = false;
    for (let i = 0; i < n; i++) { if (tg[i] > 0) { if (!on) { c.moveTo(X(i), Y(tg[i])); on = true; } else c.lineTo(X(i), Y(tg[i])); } else on = false; }
    c.stroke();
    c.setLineDash([8, 8]); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; c.beginPath(); c.moveTo(gx, Y(ftp)); c.lineTo(gx + gw, Y(ftp)); c.stroke(); c.setLineDash([]);
    c.font = '700 20px "M PLUS Rounded 1c"'; c.textAlign = 'left'; c.fillStyle = 'rgba(255,255,255,.6)'; c.fillText(`FTP ${ftp} W`, gx + 6, Y(ftp) - 8);
    c.textAlign = 'right'; c.fillText('— target', gx + gw, gyy - 8);
  }
  // stat tiles
  const tiles: [string, string][] = [
    ['TIME', fmtH(r.secs)], ['AVG · NP', `${Math.round(r.avg)} · ${Math.round(r.np)} W`], ['TSS · IF', `${Math.round(r.tss)} · ${r.ifactor.toFixed(2)}`],
    ['WORK', `${Math.round(r.kj)} kJ`], r.structured ? ['IN THE BAND', `${Math.round(r.compliance * 100)}%`] : ['BEST 5 MIN', `${Math.round(r.best5)} W`],
    r.avgHr ? ['AVG HR', `${Math.round(r.avgHr)} bpm`] : ['KILLS', r.kills.toLocaleString()],
  ];
  const tw = (CW - 120 - 40) / 3, th = 96, ty = gyy + gh + 30;
  tiles.forEach(([k, v], i) => {
    const x = 60 + (i % 3) * (tw + 20), y = ty + Math.floor(i / 3) * (th + 14);
    c.fillStyle = '#1b1233'; rr(c, x, y, tw, th, 16); c.fill(); c.strokeStyle = 'rgba(255,209,102,.18)'; c.lineWidth = 2; c.stroke();
    c.textAlign = 'left'; c.font = '800 19px "M PLUS Rounded 1c"'; c.fillStyle = '#a99cc8'; c.fillText(k, x + 20, y + 32);
    c.font = '700 44px Rajdhani'; c.fillStyle = '#ffffff'; c.fillText(v, x + 20, y + 78);
  });
  // footer line: game stats + achievements + evolved weapons
  const fy = ty + 2 * (th + 14) + 34;
  c.textAlign = 'left'; c.font = '800 26px "M PLUS Rounded 1c"'; c.fillStyle = '#ffd166';
  const evo = r.weapons.filter((w) => w.evolved).map((w) => WEAPON_BY_ID[w.id].name);
  c.fillText(`☠ ${r.kills.toLocaleString()} kills · LV ${r.level}${r.falls === 0 ? ' · no falls' : ''}${evo.length ? ' · ' + evo.slice(0, 2).join(', ') : ''}`, 60, fy);
  if (r.achievements.length) { c.font = '34px system-ui, "Apple Color Emoji", sans-serif'; c.fillText(r.achievements.slice(0, 12).map((id) => ACH_BY_ID[id]?.icon || '🏆').join(' '), 60, fy + 48); }
  c.textAlign = 'right'; c.font = '700 22px "M PLUS Rounded 1c"'; c.fillStyle = 'rgba(255,255,255,.45)'; c.fillText('jakehobbick.github.io/pedal-survivors', CW - 60, CH - 26);
  return cv;
}

export function shareText(r: RunReport): { title: string; desc: string } {
  const tpl = TEMPLATE_BY_ID[r.tpl]; const arena = ARENA_BY_ID[r.arena]; const ch = CHAR_BY_ID[r.char];
  const lines = [
    `🚴 ${tpl?.name || r.tpl} ${r.min}′ in ${arena.name} as ${ch.name} ${ch.title}`,
    r.won ? `👑 Broke ${BOSSES[arena.boss].name}'s shield with a ${r.sprintSecs.toFixed(0)} s sprint (peak ${Math.round(r.sprintPeak)} W) and took it down` : r.fled ? `💨 ${BOSSES[arena.boss].name} escaped` : null,
    `⚡ ${fmtH(r.secs)} · avg ${Math.round(r.avg)} W · NP ${Math.round(r.np)} W · IF ${r.ifactor.toFixed(2)} · TSS ${Math.round(r.tss)} · ${Math.round(r.kj)} kJ${r.avgHr ? ` · avg HR ${Math.round(r.avgHr)}` : ''}`,
    r.structured ? `🎯 ${Math.round(r.compliance * 100)}% of target time inside the band` : null,
    `☠️ ${r.kills.toLocaleString()} monsters · level ${r.level}${r.evolutions ? ` · ${r.evolutions} evolution${r.evolutions > 1 ? 's' : ''}` : ''}${r.falls ? ` · ${r.falls} fall${r.falls > 1 ? 's' : ''}` : ' · rubber side down'}`,
    r.achievements.length ? `🏆 ${r.achievements.slice(0, 4).map((id) => ACH_BY_ID[id]?.name).join(', ')}${r.achievements.length > 4 ? '…' : ''}` : null,
    `Pedal Survivors: a horde-survival game where my smart trainer is the controller`,
  ].filter(Boolean);
  return { title: r.title, desc: lines.join('\n') };
}

export async function saveShareCard(cv: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, 'image/png'));
  if (!blob) return false;
  return deliverFile(blob, fileStamp(recorder.start, 'png'), 'image/png');
}
export async function copyText(t: string, btn?: HTMLElement) {
  try { await navigator.clipboard.writeText(t); if (btn) btn.textContent = 'Copied ✓'; return; } catch { /* fallback */ }
  const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); if (btn) btn.textContent = 'Copied ✓'; } catch { if (btn) btn.textContent = 'Select & copy manually'; }
  ta.remove();
}

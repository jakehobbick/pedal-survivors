/**
 * In-ride HUD (DOM, updated ~8 Hz so it costs nothing per frame).
 * Designed to be read at a glance while riding: big power number colored by zone,
 * the current interval with its target band and countdown, then everything else small.
 */
import { sensors } from '../trainer/sensors';
import { trainer, GEARS, gearWatts, rpmFor } from '../trainer/control';
import { settings, FTP } from '../core/settings';
import { fmtTime, clamp } from '../core/math';
import type { World } from '../game/world';
import type { WorkoutRuntime } from '../game/workout';

let root: HTMLElement;
const el: Record<string, HTMLElement> = {};
export function powerZone(pct: number) { return pct < 0.55 ? 1 : pct < 0.75 ? 2 : pct < 0.9 ? 3 : pct < 1.05 ? 4 : pct < 1.2 ? 5 : 6; }
export const ZONE_NAMES = ['', 'Recovery', 'Endurance', 'Tempo', 'Threshold', 'VO₂', 'Anaerobic'];
export const ZONE_COLS = ['#9aa3b5', '#7fd1ff', '#5ef38c', '#ffd166', '#ff9f43', '#ff4d5e', '#e056fd'];
export function hrZone(hr: number) { const m = settings.maxHr; const f = hr / m; return f < 0.6 ? 1 : f < 0.7 ? 2 : f < 0.8 ? 3 : f < 0.9 ? 4 : 5; }

export function initHud() {
  root = document.getElementById('hud')!;
  root.innerHTML = `
  <div class="box" id="h-power">
    <div><span class="big" id="hp-w">0</span><span class="unit">W</span> <span class="mv" id="hp-pct" style="font-size:22px">0%</span></div>
    <div style="display:flex;gap:14px;margin-top:4px;align-items:baseline">
      <div><div class="lbl">Cadence</div><span class="mv" id="hp-c">0</span><span class="unit">rpm</span></div>
      <div><div class="lbl">Heart</div><span class="mv" id="hp-hr">--</span><span class="unit">bpm</span></div>
    </div>
    <div class="lbl" id="hp-zone" style="margin-top:4px"></div>
  </div>
  <div class="box" id="h-int">
    <div class="lbl" id="hi-name">Free Ride</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
      <span class="mv" id="hi-target" style="font-size:26px"></span><span class="mv" id="hi-left" style="font-size:34px"></span>
    </div>
    <div class="ibar" id="hi-bar"><div class="band" id="hi-band"></div><div class="cur" id="hi-cur"></div></div>
    <div style="display:flex;justify-content:space-between;margin-top:4px" class="lbl"><span id="hi-next"></span><span id="hi-mode"></span></div>
    <div class="surge" id="hi-surge"><i id="hi-surgefill"></i></div>
  </div>
  <div class="box" id="h-right">
    <div class="mv" id="hr-time">0:00</div>
    <div class="lbl" id="hr-total"></div>
    <div style="margin-top:6px;font-size:20px;font-weight:700"><span style="color:#ffd166">●</span> <span id="hr-gold">0</span> &nbsp; ☠ <span id="hr-kills">0</span></div>
    <div class="lbl" id="hr-kj" style="margin-top:2px"></div>
  </div>
  <div class="box" id="h-gear"><div class="lbl">Gear</div><div class="big" id="hg-n" style="font-size:44px">10</div><div class="lbl" id="hg-sub"></div></div>
  <div id="h-ab">
    <div class="abil" id="ha-dash">💨<div class="cd" id="ha-dashcd"></div><small id="ha-dashk">DASH</small></div>
    <div class="abil" id="ha-ult">✨<div class="cd" id="ha-ultcd"></div><small id="ha-ultk">ULT</small></div>
  </div>
  <div class="box" id="h-xp"><i id="hx"></i></div>
  <div id="h-lv">LV 1</div>`;
  root.querySelectorAll<HTMLElement>('[id]').forEach((e) => (el[e.id] = e));
  const b = document.createElement('div'); b.id = 'banner'; document.body.appendChild(b); el.banner = b;
}
let bannerT = 0;
export function banner(text: string, sub = '', ms = 2600) {
  const b = el.banner; if (!b) return;
  b.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`;
  b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  clearTimeout(bannerT); bannerT = window.setTimeout(() => b.classList.remove('on'), ms);
}
export function showHud(on: boolean) { root.classList.toggle('hidden', !on); if (!on && el.banner) el.banner.classList.remove('on'); }
let last = 0;
export function updateHud(w: World, wk: WorkoutRuntime | null, force = false) {
  const now = performance.now(); if (!force && now - last < 120) return; last = now;
  const ftp = FTP(); const p = sensors.p3; const pct = p / ftp; const z = powerZone(pct);
  el['hp-w'].textContent = String(Math.round(p));
  el['hp-w'].className = 'big zone-' + z;
  el['hp-pct'].textContent = Math.round(pct * 100) + '%';
  el['hp-pct'].className = 'mv zone-' + z;
  el['hp-c'].textContent = String(Math.round(sensors.cadSm));
  el['hp-c'].style.color = sensors.cadSm >= 85 && sensors.cadSm <= 100 ? '#5ef38c' : '';
  const hr = sensors.hr; el['hp-hr'].textContent = hr > 0 ? String(hr) : '--';
  el['hp-hr'].className = 'mv' + (hr > 0 ? ' zone-' + Math.min(6, hrZone(hr) + (hrZone(hr) >= 5 ? 1 : 0)) : '');
  el['hp-zone'].textContent = `Z${z} ${ZONE_NAMES[z]}${sensors.cadSm >= 85 && sensors.cadSm <= 100 ? ' · crit cadence ✓' : ''}`;
  // interval
  if (wk) {
    const s = wk.step;
    el['hi-name'].textContent = wk.label();
    const tgt = wk.targetBand();
    if (tgt) {
      const lo = Math.round(tgt[0] * ftp), hi = Math.round(tgt[1] * ftp);
      el['hi-target'].textContent = tgt[1] >= 9 ? `≥ ${lo} W` : `${lo}–${hi} W`;
      el['hi-target'].className = 'mv ' + (wk.inBand ? 'zone-2' : wk.below ? 'zone-5' : 'zone-3');
      const max = Math.max(tgt[1] >= 9 ? tgt[0] * 1.4 : tgt[1] * 1.25, 0.6) * ftp;
      const L = (v: number) => clamp(v / max, 0, 1) * 100;
      el['hi-band'].style.left = L(lo) + '%'; el['hi-band'].style.width = (L(tgt[1] >= 9 ? max : hi) - L(lo)) + '%';
      el['hi-cur'].style.left = L(p) + '%';
      el['hi-bar'].style.display = '';
    } else { el['hi-target'].textContent = s && s.kind === 'free' ? `${Math.round(wk.rolling3 || 0)} W (3-min)` : ''; el['hi-bar'].style.display = 'none'; el['hi-target'].className = 'mv'; }
    el['hi-left'].textContent = wk.overtime ? 'OT ' + fmtTime(wk.overtimeT) : fmtTime(wk.stepLeft());
    const nx = wk.nextStep();
    el['hi-next'].textContent = nx ? `Next: ${nx.label}` : 'Final stretch';
    el['hi-mode'].textContent = trainer.mode === 'erg' ? `ERG ${Math.round(trainer.ergFrac * ftp)} W` : `GEARS`;
    el['hi-surgefill'].style.width = Math.round(wk.surge * 100) + '%';
    el['hi-surge'].classList.toggle('full', wk.overdriveT > 0);
    el['hr-time'].textContent = fmtTime(wk.elapsed);
    el['hr-total'].textContent = `of ${fmtTime(wk.total)}`;
  }
  // gear box
  const showGear = trainer.mode === 'gear';
  el['h-gear'].style.display = showGear ? '' : 'none';
  if (showGear) {
    el['hg-n'].textContent = String(trainer.gear);
    el['hg-sub'].textContent = `${Math.round(gearWatts(90))} W @90 · ${GEARS}`;
    if (wk && wk.targetBand()) { const t = wk.targetBand()!; const r = rpmFor(((t[0] + Math.min(t[1], t[0] * 1.2)) / 2) * ftp); el['hg-sub'].textContent += ` · target ${Math.round(r)} rpm`; }
  }
  el['hr-gold'].textContent = String(w.stats.gold);
  el['hr-kills'].textContent = String(w.stats.kills);
  el['hr-kj'].textContent = wk ? `${Math.round(wk.kj)} kJ` : '';
  const P = w.player;
  el['hx'].style.width = (P.xp / P.xpNext * 100).toFixed(1) + '%';
  el['h-lv'].textContent = `LV ${P.level}`;
  const dashF = P.dashCd / P.dashMax; el['ha-dashcd'].style.height = (dashF * 100) + '%'; el['ha-dash'].classList.toggle('ready', dashF <= 0);
  el['ha-ultcd'].style.height = ((1 - P.ultCharge) * 100) + '%'; el['ha-ult'].classList.toggle('ready', P.ultCharge >= 1);
  el['ha-dashk'].textContent = (settings.keys.dash[0] || 'DASH').toUpperCase();
  el['ha-ultk'].textContent = (settings.keys.ult[0] || 'ULT').toUpperCase();
}

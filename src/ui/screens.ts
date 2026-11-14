/** Menu screens: title, run setup, settings, controls. */
import { openScreen, closeTop, closeAll, select, toast, esc } from './ui';
import { settings, saveSettings, ACTION_LABELS, Action, DEFAULT_KEYS } from '../core/settings';
import { input } from '../core/input';
import { CHARACTERS, CHAR_BY_ID } from '../data/characters';
import { ARENAS } from '../data/arenas';
import { TEMPLATES, TEMPLATE_BY_ID, RUN_LENGTHS } from '../data/workouts';
import { save, persist } from '../core/save';
import { startRun, sheetFor } from '../game/game';
import { buildArenaArt } from '../art/arena';
import { sfx, initAudio, applyVolumes } from '../audio/sfx';
import { sensors } from '../trainer/sensors';
import { sim } from '../trainer/sim';
import { lastRide, exportRide } from '../export/tcx';
import { pairingPanelHTML, wirePairingPanel } from './pairing';
import { openMeta, openAchievements, openStats, isCharUnlocked, isArenaUnlocked } from './metascreens';
import { fmtTime } from '../core/math';

export function openTitle() {
  const lr = lastRide();
  const el = openScreen(`
    <div class="logo">PEDAL<br>SURVIVORS</div>
    <div class="tag">Every run is a workout. Your legs are the weapon.</div>
    <div class="panel mid col">${pairingPanelHTML()}</div>
    <div class="row" style="margin-top:16px"><button class="btn" style="font-size:24px;padding:16px 46px" data-default id="t-ride">🚴 RIDE</button></div>
    <div class="row" style="margin-top:14px">
      <button class="btn gold sm" id="t-meta">⬆ Upgrades · ${save.gold} gold</button>
      <button class="btn sec sm" id="t-ach">🏆 Achievements</button>
      <button class="btn sec sm" id="t-stats">📊 Stats</button>
      <button class="btn sec sm" id="t-set">⚙ Settings</button>
      <button class="btn sec sm" id="t-keys">🎮 Controls</button>
      ${lr ? `<button class="btn sec sm" id="t-last">⬇ Last ride (.tcx)</button>` : ''}
    </div>
    <p class="note" style="margin-top:14px;text-align:center">FTP ${settings.ftp} W · Max HR ${settings.maxHr} · ${save.life.runs} runs · ${fmtTime(save.life.secs)} ridden</p>`);
  wirePairingPanel(el);
  el.querySelector<HTMLButtonElement>('#t-ride')!.onclick = () => { initAudio(); sfx.ui(); openSetup(); };
  el.querySelector<HTMLButtonElement>('#t-meta')!.onclick = () => openMeta();
  el.querySelector<HTMLButtonElement>('#t-ach')!.onclick = () => openAchievements();
  el.querySelector<HTMLButtonElement>('#t-stats')!.onclick = () => openStats();
  el.querySelector<HTMLButtonElement>('#t-set')!.onclick = () => openSettings(true);
  el.querySelector<HTMLButtonElement>('#t-keys')!.onclick = () => openKeys();
  const b = el.querySelector<HTMLButtonElement>('#t-last'); if (b && lr) b.onclick = () => exportRide(lr, lr.notes);
  select(el.querySelector('#t-ride'));
}

const arenaThumbs = new Map<string, string>();
function arenaThumb(id: string) {
  let u = arenaThumbs.get(id); if (u) return u;
  const a = buildArenaArt(id); const c = document.createElement('canvas'); c.width = 240; c.height = 120; const g = c.getContext('2d')!;
  g.drawImage(a.tile, 0, 120, 512, 256, 0, 0, 240, 120);
  const p = a.props[0]; const s = 100 / p.height; g.drawImage(p, 150, 120 - p.height * s + 6, p.width * s, p.height * s);
  const p2 = a.props[1]; const s2 = 60 / p2.height; g.drawImage(p2, 30, 120 - p2.height * s2, p2.width * s2, p2.height * s2);
  u = c.toDataURL(); arenaThumbs.set(id, u); return u;
}
export function profileCanvas(tplId: string, min: number, w = 240, h = 56): string {
  const steps = TEMPLATE_BY_ID[tplId].build(min); const tot = steps.reduce((a, s) => a + s.dur, 0);
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const g = c.getContext('2d')!; g.scale(2, 2);
  let x = 0; const maxF = 1.6;
  for (const s of steps) {
    const sw = s.dur / tot * w;
    const lo = s.kind === 'free' ? 0.7 : s.kind === 'boss' ? 1.55 : s.hi >= 9 ? s.lo : (s.lo + s.hi) / 2;
    const lo2 = s.lo2 != null ? (s.lo2 + (s.hi2 || s.lo2)) / 2 : lo;
    const y0 = h - Math.min(1, lo / maxF) * h, y1 = h - Math.min(1, lo2 / maxF) * h;
    const col = lo < 0.6 ? '#7fd1ff' : lo < 0.76 ? '#5ef38c' : lo < 0.9 ? '#ffd166' : lo < 1.05 ? '#ff9f43' : lo < 1.25 ? '#ff4d5e' : '#e056fd';
    g.fillStyle = s.kind === 'free' ? 'rgba(201,182,255,.6)' : col;
    g.beginPath(); g.moveTo(x, h); g.lineTo(x, y0); g.lineTo(x + Math.max(1, sw), y1); g.lineTo(x + Math.max(1, sw), h); g.fill();
    if (s.kind === 'boss') { g.fillStyle = '#fff'; g.font = '700 10px sans-serif'; g.fillText('👑', x + sw / 2 - 6, 12); }
    x += sw;
  }
  return c.toDataURL();
}

export function openSetup() {
  const L = save.last;
  if (!isCharUnlocked(L.char)) L.char = 'kai';
  if (!isArenaUnlocked(L.arena)) L.arena = 'sakura';
  const render = () => {
    const el = openScreen(`
      <h2>Choose your ride</h2>
      <div class="wide col">
        <h3>Rider</h3>
        <div class="grid">${CHARACTERS.map((c) => { const u = isCharUnlocked(c.id); return `<div class="card ${L.char === c.id ? 'on' : ''} ${u ? '' : 'locked'}" data-char="${c.id}">
          <canvas data-portrait="${c.id}" width="160" height="160" style="width:110px;height:110px;float:right;margin:-4px -4px 0 6px"></canvas>
          <div class="ttl">${c.name} <span style="color:var(--mute);font-weight:700">${c.title}</span></div>
          <div class="sub"><b style="color:${c.look.jersey}">${c.passiveName}:</b> ${esc(c.passiveDesc)}</div>
          <div class="sub"><b style="color:#ffd166">Ult · ${c.ultName}:</b> ${esc(c.ultDesc)}</div>
          ${u ? '' : `<div class="pill pink">🔒 ${c.unlock?.text}</div>`}</div>`; }).join('')}</div>
        <h3>Arena</h3>
        <div class="grid">${ARENAS.map((a) => { const u = isArenaUnlocked(a.id); return `<div class="card ${L.arena === a.id ? 'on' : ''} ${u ? '' : 'locked'}" data-arena="${a.id}">
          <img src="${arenaThumb(a.id)}" style="width:100%;height:90px;object-fit:cover;border-radius:10px;margin-bottom:6px">
          <div class="ttl">${a.name}</div><div class="sub">${a.sub}</div>${u ? '' : `<div class="pill pink">🔒 ${a.unlock?.text}</div>`}</div>`; }).join('')}</div>
        <h3>Workout</h3>
        <div class="grid">${TEMPLATES.map((t) => `<div class="card ${L.tpl === t.id ? 'on' : ''}" data-tpl="${t.id}">
          <div class="ttl" style="color:${t.color}">${t.name} <span class="pill">${t.short}</span></div>
          <img src="${profileCanvas(t.id, L.min)}" style="width:100%;height:56px;margin:6px 0">
          <div class="sub">${t.desc}</div></div>`).join('')}</div>
        <h3>Length</h3>
        <div class="seg" id="lenSeg">${RUN_LENGTHS.map((m) => `<button data-len="${m}" class="${L.min === m ? 'on' : ''}">${m} min</button>`).join('')}</div>
        <div class="row" style="margin:20px 0 10px">
          <button class="btn sec" data-back id="su-back">← Back</button>
          <button class="btn" style="font-size:22px;padding:14px 40px" data-default id="su-go">Start ${TEMPLATE_BY_ID[L.tpl].name} · ${L.min} min</button>
        </div>
        <p class="note" style="text-align:center">${sensors.src === 'sim' ? 'No trainer paired — the simulated trainer will be used (sliders or 🤖 bot).' : 'Trainer paired ✓ Resistance follows each interval.'}</p>
      </div>`);
    el.querySelectorAll<HTMLCanvasElement>('canvas[data-portrait]').forEach((cv) => { const g = cv.getContext('2d')!; g.drawImage(sheetFor(cv.dataset.portrait!).portrait, 0, 0); });
    el.querySelectorAll<HTMLElement>('[data-char]').forEach((c) => c.onclick = () => { if (!isCharUnlocked(c.dataset.char!)) { toast(CHAR_BY_ID[c.dataset.char!].unlock?.text || 'Locked'); return; } L.char = c.dataset.char!; sfx.ui(); keep(c); });
    el.querySelectorAll<HTMLElement>('[data-arena]').forEach((c) => c.onclick = () => { if (!isArenaUnlocked(c.dataset.arena!)) { toast('Locked'); return; } L.arena = c.dataset.arena!; sfx.ui(); keep(c); });
    el.querySelectorAll<HTMLElement>('[data-tpl]').forEach((c) => c.onclick = () => { L.tpl = c.dataset.tpl!; sfx.ui(); keep(c); });
    el.querySelectorAll<HTMLElement>('[data-len]').forEach((c) => c.onclick = () => { L.min = +c.dataset.len!; sfx.ui(); keep(c); });
    el.querySelector<HTMLButtonElement>('#su-back')!.onclick = () => openTitle();
    el.querySelector<HTMLButtonElement>('#su-go')!.onclick = () => { persist(); closeAll(); startRun({ char: L.char, arena: L.arena, tpl: L.tpl, min: L.min }); };
    return el;
  };
  // re-render but keep the navigation cursor on the same element
  const keep = (c: HTMLElement) => {
    const key = Object.keys(c.dataset)[0]; const val = (c.dataset as any)[key];
    const top = render(); const again = top.querySelector<HTMLElement>(`[data-${key}="${val}"]`); if (again) select(again);
    const scroller = top; void scroller;
  };
  const el = render();
  select(el.querySelector('#su-go'));
}

export function openSettings(stack = false) {
  const el = openScreen(`
    <h2>Settings</h2>
    <div class="panel mid">
      <h3>Rider</h3>
      <div class="field"><label>FTP (W)</label><input type="number" id="s-ftp" min="80" max="600" value="${settings.ftp}"></div>
      <div class="field"><label>Max heart rate</label><input type="number" id="s-hr" min="120" max="230" value="${settings.maxHr}"></div>
      <h3>Trainer</h3>
      <div class="field"><label>Interval resistance</label><select id="s-int"><option value="erg">ERG (trainer holds target)</option><option value="gears">Virtual gears (+25% Surge)</option></select></div>
      <div class="field"><label>Virtual gear feel <small class="note">(cadence exponent)</small></label><select id="s-curve"><option value="1.3">Light (1.3)</option><option value="1.6">Default (1.6)</option><option value="2">Road-like (2.0)</option><option value="2.5">Heavy (2.5)</option></select></div>
      <h3>Controls</h3>
      <div class="field"><label>Steering</label><select id="s-steer"><option value="8way">8-direction (D-pad sets heading)</option><option value="turn">Turn (left/right rotates)</option></select></div>
      <div class="field"><label>Autopilot when not steering</label><select id="s-auto"><option value="0">Off</option><option value="1">On (dodges crowds, grabs gems)</option></select></div>
      <div class="field"><label>Auto-pick level-ups</label><select id="s-pick"><option value="0">Off</option><option value="8">After 8 s</option><option value="15">After 15 s</option></select></div>
      <div class="field"><label>Touch buttons on</label><select id="s-hand"><option value="right">Right side</option><option value="left">Left side</option></select></div>
      <h3>Audio</h3>
      <div class="field"><label>Master volume</label><input type="range" id="s-vol" min="0" max="1" step="0.05" value="${settings.volume}"></div>
      <div class="field"><label>Music</label><input type="range" id="s-mus" min="0" max="1" step="0.05" value="${settings.music}"></div>
      <div class="field"><label>Sound effects</label><input type="range" id="s-sfx" min="0" max="1" step="0.05" value="${settings.sfx}"></div>
      <div class="field"><label>Mute all</label><select id="s-mute"><option value="0">No</option><option value="1">Yes</option></select></div>
      <h3>Display</h3>
      <div class="field"><label>Screen shake</label><select id="s-shake"><option value="1">On</option><option value="0">Off</option></select></div>
      <div class="field"><label>Damage numbers</label><select id="s-dmg"><option value="1">On</option><option value="0">Off</option></select></div>
      <div class="field"><label>Reduced effects</label><select id="s-fx"><option value="0">Off</option><option value="1">On (fewer particles)</option></select></div>
      <div class="field"><label>Render resolution</label><select id="s-res"><option value="0">Auto (adapts to keep 60 fps)</option><option value="2">Sharp (2×)</option><option value="1.5">Balanced (1.5×)</option><option value="1">Fast (1×)</option></select></div>
      <div class="field"><label>Debug overlay</label><select id="s-dbg"><option value="0">Off</option><option value="1">On</option></select></div>
      <div class="row" style="margin-top:14px">
        <button class="btn sec sm" id="s-stress">🧪 Stress test (400 enemies + 200 projectiles)</button>
        <button class="btn sec sm" id="s-save">💾 Backup / restore save</button>
      </div>
    </div>
    <div class="row" style="margin:16px 0"><button class="btn" data-back data-default id="s-done">Done</button></div>`, 'dim', !stack);
  const $ = <T extends HTMLElement>(id: string) => el.querySelector<T>('#' + id)!;
  const sel = (id: string, v: string, fn: (v: string) => void) => { const s = $<HTMLSelectElement>(id); s.value = v; s.onchange = () => { fn(s.value); saveSettings(); }; };
  $<HTMLInputElement>('s-ftp').onchange = (e) => { settings.ftp = Math.max(80, Math.min(600, +(e.target as HTMLInputElement).value || 250)); saveSettings(); };
  $<HTMLInputElement>('s-hr').onchange = (e) => { settings.maxHr = Math.max(120, Math.min(230, +(e.target as HTMLInputElement).value || 190)); saveSettings(); };
  sel('s-int', settings.intervalMode, (v) => settings.intervalMode = v as any);
  sel('s-curve', String(settings.gearCurve), (v) => settings.gearCurve = +v);
  sel('s-steer', settings.steer, (v) => settings.steer = v as any);
  sel('s-auto', settings.autopilot ? '1' : '0', (v) => settings.autopilot = v === '1');
  sel('s-pick', String(settings.autoPick), (v) => settings.autoPick = +v);
  sel('s-hand', settings.hand, (v) => settings.hand = v as any);
  sel('s-mute', settings.muted ? '1' : '0', (v) => { settings.muted = v === '1'; applyVolumes(); });
  sel('s-shake', settings.shake ? '1' : '0', (v) => settings.shake = v === '1');
  sel('s-dmg', settings.dmgNumbers ? '1' : '0', (v) => settings.dmgNumbers = v === '1');
  sel('s-fx', settings.reduceFx ? '1' : '0', (v) => settings.reduceFx = v === '1');
  sel('s-res', String(settings.renderScale), (v) => settings.renderScale = +v);
  sel('s-dbg', settings.debug ? '1' : '0', (v) => settings.debug = v === '1');
  for (const [id, k] of [['s-vol', 'volume'], ['s-mus', 'music'], ['s-sfx', 'sfx']] as const) $<HTMLInputElement>(id).oninput = (e) => { (settings as any)[k] = +(e.target as HTMLInputElement).value; applyVolumes(); saveSettings(); };
  $('s-done').onclick = () => { saveSettings(); if (stack) closeTop(); else openTitle(); };
  $('s-stress').onclick = () => { closeAll(); settings.debug = true; sim.bot = true; startRun({ char: save.last.char, arena: save.last.arena, tpl: 'free', min: 60, stress: true }); };
  $('s-save').onclick = () => import('./metascreens').then((m) => m.openBackup());
}

export function openKeys() {
  const acts = Object.keys(ACTION_LABELS) as Action[];
  const render = () => {
    const el = openScreen(`
      <h2>Controls</h2>
      <div class="panel mid">
        <p class="note">Map your Zwift Ride buttons here. On your Pixel, set each Zwift Ride button in <b>BikeControl</b> to send the key shown, then tap <b>Change</b> and press the button. Every action takes two keys.</p>
        ${acts.map((a) => `<div class="field"><label>${ACTION_LABELS[a]}</label><span><kbd>${kn(settings.keys[a][0])}</kbd> <kbd>${kn(settings.keys[a][1])}</kbd> <button class="btn sec sm" data-k="${a}" data-slot="0">Change 1</button> <button class="btn sec sm" data-k="${a}" data-slot="1">Change 2</button></span></div>`).join('')}
        <p class="note" style="margin-top:12px">Defaults keep Crank Crypt's mapping: <kbd>E</kbd>/<kbd>Q</kbd> shift, <kbd>Enter</kbd> confirm, <kbd>A</kbd>/<kbd>D</kbd> left/right, <kbd>F</kbd> (Crank Crypt's potion button) is Dash, <kbd>Esc</kbd> pauses. Simulated trainer: <kbd>+</kbd>/<kbd>−</kbd> watts, <kbd>,</kbd>/<kbd>.</kbd> cadence, hold <kbd>X</kbd> to sprint, <kbd>B</kbd> bot, <kbd>\`</kbd> debug.</p>
      </div>
      <div class="row" style="margin:16px 0"><button class="btn sec" id="k-reset">Reset defaults</button><button class="btn" data-back data-default id="k-done">Done</button></div>`, 'dim', false);
    el.querySelectorAll<HTMLButtonElement>('[data-k]').forEach((b) => b.onclick = () => {
      b.textContent = 'Press a key…';
      input.capture = (k) => { const a = b.dataset.k as Action; const s = +b.dataset.slot!; const cur = [...settings.keys[a]] as [string, string]; cur[s] = k; settings.keys[a] = cur; saveSettings(); closeTop(); render(); };
    });
    el.querySelector<HTMLButtonElement>('#k-reset')!.onclick = () => { settings.keys = JSON.parse(JSON.stringify(DEFAULT_KEYS)); saveSettings(); closeTop(); render(); };
    el.querySelector<HTMLButtonElement>('#k-done')!.onclick = () => { input.capture = null; closeTop(); };
  };
  render();
}
const kn = (k: string) => (k === ' ' ? 'Space' : k || '—');

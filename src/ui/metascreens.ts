/** Meta screens: permanent upgrades shop, achievements, lifetime stats, save backup. */
import { CHAR_BY_ID, CHARACTERS } from '../data/characters';
import { ARENA_BY_ID, ARENAS } from '../data/arenas';
import { save, persist, exportSave, importSave, wipeSave } from '../core/save';
import { openScreen, closeTop, toast, select, esc } from './ui';
import { META, metaCost } from '../data/meta';
import { iconURL } from '../art/icons';
import { ACHIEVEMENTS, achCount, achEvent } from '../meta/achievements';
import { sfx } from '../audio/sfx';
import { FTP, settings } from '../core/settings';
import { fmtTime } from '../core/math';
import { TEMPLATE_BY_ID } from '../data/workouts';
import { BOSSES } from '../data/enemies';
import { deliverFile } from '../export/tcx';

export function isCharUnlocked(id: string) { const c = CHAR_BY_ID[id]; return !!c && (!c.unlock || !!save.ach[c.unlock.ach]); }
export function isArenaUnlocked(id: string) { const a = ARENA_BY_ID[id]; return !!a && (!a.unlock || a.unlock.check({ bossKills: save.life.bossKills })); }

const back = (onBack?: () => void) => () => { closeTop(); onBack?.(); };

// ---------------------------------------------------------------- upgrades
export function openMeta(onBack?: () => void) {
  let focus = '';
  const render = () => {
    const spent = META.reduce((a, n) => { let s = 0; for (let r = 0; r < (save.upgrades[n.id] || 0); r++) s += metaCost(n, r); return a + s; }, 0);
    const el = openScreen(`
      <h2>Permanent upgrades</h2>
      <div class="tag">Gold from every run is banked here. <b style="color:#ffd166">💰 ${save.gold} gold</b> · ${spent} invested</div>
      <div class="wide"><div class="grid metagrid">${META.map((n) => {
        const r = save.upgrades[n.id] || 0; const maxed = r >= n.max; const cost = maxed ? 0 : metaCost(n, r); const afford = save.gold >= cost;
        return `<div class="card meta ${maxed ? 'maxed' : afford ? '' : 'poor'}" data-m="${n.id}">
          <img src="${iconURL(n.icon)}" width="52" height="52" style="float:left;margin:0 10px 4px 0;border-radius:12px">
          <div class="ttl">${n.name}</div><div class="sub">${n.desc}</div>
          <div class="pips">${Array.from({ length: n.max }, (_, i) => `<i class="${i < r ? 'on' : ''}"></i>`).join('')}</div>
          <div class="price">${maxed ? 'MAX' : `💰 ${cost}`}</div></div>`;
      }).join('')}</div></div>
      <div class="row" style="margin:16px 0"><button class="btn sec" id="m-refund">↺ Refund all</button><button class="btn" data-back data-default id="m-done">Done</button></div>`, 'dim', false);
    el.querySelectorAll<HTMLElement>('[data-m]').forEach((c) => c.onclick = () => {
      const n = META.find((m) => m.id === c.dataset.m)!; const r = save.upgrades[n.id] || 0;
      if (r >= n.max) { toast('Already maxed'); return; }
      const cost = metaCost(n, r); if (save.gold < cost) { toast(`Need ${cost - save.gold} more gold`); sfx.back(); return; }
      save.gold -= cost; save.upgrades[n.id] = r + 1; persist(); sfx.buy(); achEvent('metaBuy');
      focus = n.id; closeTop(); const t = render(); const again = t.querySelector<HTMLElement>(`[data-m="${focus}"]`); if (again) select(again);
    });
    el.querySelector<HTMLButtonElement>('#m-refund')!.onclick = () => {
      if (!spent) { toast('Nothing to refund'); return; }
      if (!confirmTwice(el.querySelector('#m-refund')!, 'Tap again to refund')) return;
      save.gold += spent; save.upgrades = {}; persist(); sfx.coin(); toast(`Refunded ${spent} gold`); closeTop(); render();
    };
    el.querySelector<HTMLButtonElement>('#m-done')!.onclick = back(onBack);
    return el;
  };
  render();
}
/** two-tap confirm without window.confirm (dialogs block Bluefy/BLE callbacks) */
function confirmTwice(b: HTMLElement, msg: string) {
  if (b.dataset.armed) return true;
  b.dataset.armed = '1'; const t = b.textContent; b.textContent = msg; b.classList.add('pink');
  setTimeout(() => { delete b.dataset.armed; b.textContent = t; b.classList.remove('pink'); }, 3000);
  return false;
}

// ---------------------------------------------------------------- achievements
export function openAchievements(onBack?: () => void) {
  const n = achCount();
  const el = openScreen(`
    <h2>Achievements</h2>
    <div class="tag">${n} / ${ACHIEVEMENTS.length} unlocked · each one pays gold</div>
    <div class="wide"><div class="achbar"><i style="width:${(n / ACHIEVEMENTS.length * 100).toFixed(1)}%"></i></div>
    <div class="achgrid">${ACHIEVEMENTS.map((a) => { const t = save.ach[a.id]; return `<div class="achrow ${t ? '' : 'off'}" data-nav>
      <div class="ai">${t ? a.icon : '🔒'}</div><div style="flex:1"><b>${a.name}</b><div class="note">${a.desc}</div></div>
      <div class="note" style="text-align:right;min-width:70px">${t ? new Date(t).toLocaleDateString() : `+${a.gold} 💰`}</div></div>`; }).join('')}</div></div>
    <div class="row" style="margin:16px 0"><button class="btn" data-back data-default id="a-done">Done</button></div>`, 'dim', false);
  el.querySelector<HTMLButtonElement>('#a-done')!.onclick = back(onBack);
}

// ---------------------------------------------------------------- stats
export function openStats(onBack?: () => void) {
  const L = save.life; const ftp = FTP();
  const w = (v: number) => v > 0 ? `${Math.round(v)} W <small style="display:inline;color:var(--mute)">${Math.round(v / ftp * 100)}%</small>` : '—';
  const st = (k: string, v: string) => `<div class="stat"><small>${k}</small><b>${v}</b></div>`;
  const tpls = Object.entries(L.templates).filter(([, v]) => v > 0).map(([k, v]) => `${TEMPLATE_BY_ID[k]?.name || k} ×${v}`).join(' · ') || '—';
  const bosses = Object.entries(L.bossKills).map(([k, v]) => `${BOSSES[k]?.name || k} ×${v}`).join(' · ') || '—';
  const hist = save.history.slice().reverse();
  const el = openScreen(`
    <h2>Lifetime stats</h2>
    <div class="wide col">
      <div class="statgrid">
        ${st('Energy', `${Math.round(L.kj).toLocaleString()} kJ`)}${st('Time ridden', fmtTime(L.secs))}${st('Runs', `${L.runs}`)}${st('Boss wins', `${L.wins}`)}
        ${st('Kills', L.kills.toLocaleString())}${st('Best 1 min', w(L.best1))}${st('Best 5 min', w(L.best5))}${st('Best 20 min', w(L.best20))}
        ${st('Peak power', L.bestPower ? `${L.bestPower} W` : '—')}${st('Fastest shield', L.sprintBest ? `${L.sprintBest.toFixed(1)} s` : '—')}${st('Best compliance', L.bestCompliance ? `${Math.round(L.bestCompliance * 100)}%` : '—')}${st('Highest level', `${L.maxLevel || '—'}`)}
        ${st('Evolutions', `${L.evolutions}`)}${st('Overdrives', `${L.overdrives}`)}${st('Mini-bosses', `${L.minis}`)}${st('Falls', `${L.falls}`)}
        ${st('Achievements', `${achCount()} / ${ACHIEVEMENTS.length}`)}${st('Gold earned', `${L.gold.toLocaleString()}`)}${st('Deathless 30+', `${L.deathless}`)}${st('FTP / Max HR', `${settings.ftp} W · ${settings.maxHr}`)}
      </div>
      <p class="note" style="margin:10px 0 2px"><b>Workouts finished:</b> ${tpls}</p>
      <p class="note" style="margin:2px 0"><b>Bosses defeated:</b> ${bosses}</p>
      <p class="note" style="margin:2px 0"><b>Riders:</b> ${CHARACTERS.map((c) => `${c.name} ×${save.charRuns[c.id] || 0}`).join(' · ')} · <b>Arenas:</b> ${ARENAS.map((a) => `${a.name} ×${L.arenas[a.id] || 0}`).join(' · ')}</p>
      <h3>Recent runs</h3>
      <div class="scrollbox" style="max-height:34vh"><table class="hist">
        <tr><th>Date</th><th>Workout</th><th>Rider</th><th>Avg / NP</th><th>kJ</th><th>In band</th><th>Kills</th><th></th></tr>
        ${hist.length ? hist.map((h) => `<tr><td>${new Date(h.date).toLocaleDateString()}</td><td>${TEMPLATE_BY_ID[h.tpl]?.name || h.tpl} ${h.min}′</td><td>${CHAR_BY_ID[h.char]?.name || h.char}</td><td>${h.avg} / ${h.np} W</td><td>${h.kj}</td><td>${h.tpl === 'free' ? '—' : Math.round(h.compliance * 100) + '%'}</td><td>${h.kills}</td><td>${h.won ? '👑' : ''}</td></tr><tr class="sub"><td colspan="8">${esc(h.title || '')}</td></tr>`).join('') : '<tr><td colspan="8" class="note">No runs yet. Go ride!</td></tr>'}
      </table></div>
    </div>
    <div class="row" style="margin:16px 0"><button class="btn" data-back data-default id="st-done">Done</button></div>`, 'dim', false);
  el.querySelector<HTMLButtonElement>('#st-done')!.onclick = back(onBack);
}

// ---------------------------------------------------------------- backup
export function openBackup(onBack?: () => void) {
  const el = openScreen(`
    <h2>Save backup</h2>
    <div class="panel mid">
      <p class="note">Your progress lives in this browser's storage. Export a backup file now and then (Save to Files on iPad), and import it to restore or move to another device.</p>
      <div class="row"><button class="btn gold" id="b-exp">⬇ Export save file</button><button class="btn sec" id="b-copy">📋 Copy to clipboard</button></div>
      <h3>Restore</h3>
      <div class="row"><label class="btn sec" style="cursor:pointer">📂 Import from file<input type="file" id="b-file" accept=".json,application/json,text/plain" style="display:none"></label></div>
      <textarea id="b-text" rows="4" placeholder="…or paste a save here and tap Import text" style="width:100%;margin-top:10px"></textarea>
      <div class="row"><button class="btn sec" id="b-imp">Import text</button></div>
      <h3>Danger zone</h3>
      <div class="row"><button class="btn sec" id="b-wipe">🗑 Reset all progress</button></div>
      <p class="note">${save.life.runs} runs · ${save.gold} gold · ${achCount()} achievements in this save.</p>
    </div>
    <div class="row" style="margin:16px 0"><button class="btn" data-back data-default id="b-done">Done</button></div>`, 'dim', false);
  const $ = <T extends HTMLElement>(id: string) => el.querySelector<T>('#' + id)!;
  const stamp = () => { const d = new Date(); const z = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
  $('b-exp').onclick = () => deliverFile(new Blob([exportSave()], { type: 'application/json' }), `pedal-survivors-save-${stamp()}.json`, 'application/json');
  $('b-copy').onclick = async () => { try { await navigator.clipboard.writeText(exportSave()); toast('Save copied to clipboard'); } catch { $<HTMLTextAreaElement>('b-text').value = exportSave(); toast('Copy the text below'); } };
  const done = (ok: boolean) => { if (ok) { toast('Save restored ✓'); sfx.achieve(); closeTop(); onBack?.(); } else { toast('That doesn’t look like a Pedal Survivors save'); sfx.back(); } };
  $<HTMLInputElement>('b-file').onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return; f.text().then((t) => done(importSave(t))).catch(() => done(false)); };
  $('b-imp').onclick = () => done(importSave($<HTMLTextAreaElement>('b-text').value));
  $('b-wipe').onclick = () => { if (!confirmTwice($('b-wipe'), 'Tap again to erase everything')) return; wipeSave(); toast('Progress reset'); closeTop(); onBack?.(); };
  $('b-done').onclick = back(onBack);
}

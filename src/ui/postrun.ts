/** Post-run summary: workout compliance, zones, power bests, build, achievements, TCX + share card. */
import { openScreen, esc, toast } from './ui';
import { game, abandonToMenu, startRun } from '../game/game';
import { openTitle } from './screens';
import { exportRideNow, stashLastRide } from '../export/tcx';
import { fmtTime } from '../core/math';
import { commitRun, RunReport } from '../meta/progress';
import { ACH_BY_ID } from '../meta/achievements';
import { ZONE_NAMES, ZONE_COLS } from './hud';
import { makeShareCard, shareText, saveShareCard, copyText, ensureFonts } from '../export/share';
import { iconURL } from '../art/icons';
import { WEAPON_BY_ID } from '../data/weapons';
import { save } from '../core/save';
import { FTP } from '../core/settings';
import { sfx } from '../audio/sfx';

const HR_COLS = ['#9aa3b5', '#7fd1ff', '#5ef38c', '#ffd166', '#ff9f43', '#ff4d5e'];
function zoneBar(times: number[], cols: string[], names: string[], from: number) {
  const tot = times.reduce((a, b, i) => a + (i >= from ? b : 0), 0) || 1;
  const segs = times.map((t, i) => i < from || t <= 0 ? '' : `<i style="width:${(t / tot * 100).toFixed(2)}%;background:${cols[i]}" title="${names[i]}"></i>`).join('');
  const legend = times.map((t, i) => i < from || t < 1 ? '' : `<span class="zl"><b style="background:${cols[i]}"></b>${names[i]} ${fmtTime(t)}</span>`).join('');
  return `<div class="zbar">${segs}</div><div class="zleg">${legend}</div>`;
}

export function openPostRun(quit: boolean) {
  const rep = commitRun(quit);
  stashLastRide(rep.title);
  render(rep);
  sfx.chest();
}

function render(r: RunReport) {
  const ftp = FTP(); const L = save.life;
  const head = r.quit ? 'RUN ENDED' : r.won ? 'VICTORY!' : 'RUN COMPLETE';
  const st = (k: string, v: string, cls = '') => `<div class="stat ${cls}"><small>${k}</small><b>${v}</b></div>`;
  const best = (lbl: string, v: number, key: string, life: number) => `<div class="stat"><small>Best ${lbl}${r.newBests.includes(key) ? ' <span class="pill gold">NEW PB</span>' : ''}</small><b>${v > 0 ? Math.round(v) + ' W' : '—'}</b><small style="text-transform:none">${v > 0 ? Math.round(v / ftp * 100) + '% FTP · ' : ''}lifetime ${life ? life + ' W' : '—'}</small></div>`;
  const hrTimes = r.hrZoneTime.reduce((a, b) => a + b, 0);
  const el = openScreen(`
    <h2 style="margin-top:3vh">${head}</h2>
    <div class="tag" style="max-width:860px;text-align:center"><i>“${esc(r.title.replace(/ · Pedal Survivors$/, ''))}”</i></div>
    <div class="post wide">
      <div class="col postL">
        <img id="pr-card" class="card-img" alt="Share card" style="width:100%">
        <div class="row" style="margin-top:10px">
          <button class="btn gold" data-default id="pr-tcx">⬇ Save ride for Garmin (.tcx)</button>
          <button class="btn cyan" id="pr-card-save">📸 Save share card</button>
        </div>
        <div class="row"><button class="btn sec sm" id="pr-ct">📋 Copy Strava title</button><button class="btn sec sm" id="pr-cd">📋 Copy description</button></div>
        <p class="note">On iPad the share sheet opens: choose <b>Save to Files</b>, then upload the .tcx in Garmin Connect (Activities → Import Data on the web, or share the file to the Garmin Connect app). It syncs on to Strava as usual.</p>
      </div>
      <div class="col postR">
        ${r.structured ? `<div class="stat big"><small>Workout compliance</small><b style="color:${r.compliance >= 0.9 ? '#5ef38c' : r.compliance >= 0.7 ? '#ffd166' : '#ff9f43'}">${Math.round(r.compliance * 100)}%</b><small style="text-transform:none">time inside the target band (±5%)</small></div>` : ''}
        <div class="statgrid">
          ${st('Time', fmtTime(r.secs))}${st('Avg power', `${Math.round(r.avg)} W`)}${st('Normalized', `${Math.round(r.np)} W`)}${st('IF · TSS', `${r.ifactor.toFixed(2)} · ${Math.round(r.tss)}`)}
          ${st('Work', `${Math.round(r.kj)} kJ`)}${st('Max power', `${r.maxP} W`)}${st('Avg cadence', r.avgCad ? `${Math.round(r.avgCad)} rpm` : '—')}${st('Heart rate', r.avgHr ? `${Math.round(r.avgHr)} / ${r.maxHr}` : '—')}
        </div>
        <h3>Time in power zones</h3>${zoneBar(r.zoneTime, ZONE_COLS, ZONE_NAMES.map((n, i) => i ? `Z${i} ${n}` : ''), 1)}
        ${hrTimes > 0 ? `<h3>Time in HR zones</h3>${zoneBar(r.hrZoneTime, HR_COLS.slice(1), ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'], 0)}` : ''}
        <h3>Power bests (this ride)</h3>
        <div class="statgrid">${best('1 min', r.best1, '1-min', L.best1)}${best('5 min', r.best5, '5-min', L.best5)}${best('20 min', r.best20, '20-min', L.best20)}${r.won ? st('Shield sprint', `${r.sprintSecs.toFixed(1)} s`) : ''}</div>
        <h3>The run</h3>
        <div class="statgrid">
          ${st('Kills', r.kills.toLocaleString())}${st('Level', String(r.level))}${st('Gold banked', `+${r.gold}`)}${st('Falls', String(r.falls))}${st('Overdrives', String(r.overdrives))}${st('Evolutions', String(r.evolutions))}
        </div>
        <div class="wlist">${r.weapons.sort((a, b) => b.dmg - a.dmg).map((w) => `<div class="wrow"><img src="${iconURL(w.id)}" width="36" height="36"><span>${WEAPON_BY_ID[w.id].name} <small>${w.evolved ? 'EVOLVED' : 'LV ' + w.lv}</small></span><b>${w.dmg.toLocaleString()}</b></div>`).join('')}</div>
        ${r.achievements.length ? `<h3>Achievements unlocked</h3>${r.achievements.map((id) => `<div class="achrow"><div class="ai">${ACH_BY_ID[id].icon}</div><div style="flex:1"><b>${ACH_BY_ID[id].name}</b><div class="note">${ACH_BY_ID[id].desc}</div></div><div class="note">+${ACH_BY_ID[id].gold} 💰</div></div>`).join('')}` : ''}
      </div>
    </div>
    <div class="row" style="margin:16px 0 30px"><button class="btn sec" data-back id="pr-menu">🏠 Menu</button><button class="btn" id="pr-again">🔁 Ride again</button></div>`);
  const $ = <T extends HTMLElement>(id: string) => el.querySelector<T>('#' + id)!;
  let card: HTMLCanvasElement | null = null;
  ensureFonts().then(() => { try { card = makeShareCard(r); $<HTMLImageElement>('pr-card').src = card.toDataURL('image/png'); } catch (e) { console.warn('share card', e); } });
  const tx = shareText(r);
  $('pr-tcx').onclick = () => exportRideNow(tx.title);
  $('pr-card-save').onclick = () => { if (card) saveShareCard(card); else toast('Card still rendering…'); };
  $('pr-ct').onclick = (e) => copyText(tx.title, e.currentTarget as HTMLElement);
  $('pr-cd').onclick = (e) => copyText(`${tx.title}\n\n${tx.desc}`, e.currentTarget as HTMLElement);
  $('pr-menu').onclick = () => { abandonToMenu(); openTitle(); };
  $('pr-again').onclick = () => { const o = game.opts!; abandonToMenu(); startRun({ char: o.char, arena: o.arena, tpl: o.tpl, min: o.min }); };
}

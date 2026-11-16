/** Post-run summary (expanded in milestone 9). */
import { openScreen } from './ui';
import { game, abandonToMenu } from '../game/game';
import { openTitle } from './screens';
import { commitRun } from '../meta/progress';
import { ACH_BY_ID } from '../meta/achievements';
import { exportRideNow, stashLastRide } from '../export/tcx';
import { fmtTime } from '../core/math';
export function openPostRun(quit: boolean) {
  const W = game.world; const wk = game.wk!;
  const rep = commitRun(quit); const gold = rep.gold;
  stashLastRide(rep.title);
  const el = openScreen(`
    <h2 style="margin-top:6vh">${quit ? 'RUN ENDED' : game.boss.phase === 'dead' ? 'VICTORY!' : 'RUN COMPLETE'}</h2>
    <div class="panel mid">
      <div class="statgrid">
        <div class="stat"><small>Time</small><b>${fmtTime(wk.elapsed)}</b></div>
        <div class="stat"><small>Kills</small><b>${W.stats.kills}</b></div>
        <div class="stat"><small>Level</small><b>${W.player.level}</b></div>
        <div class="stat"><small>Gold banked</small><b>${gold}</b></div>
        <div class="stat"><small>Work</small><b>${Math.round(wk.kj)} kJ</b></div>
        <div class="stat"><small>Compliance</small><b>${Math.round(wk.compliance() * 100)}%</b></div>
      </div>
      ${rep.achievements.length ? `<h3>Achievements</h3>${rep.achievements.map((id) => `<div class="achrow"><div class="ai">${ACH_BY_ID[id].icon}</div><b>${ACH_BY_ID[id].name}</b></div>`).join('')}` : ''}
      <div class="row" style="margin-top:14px"><button class="btn gold" id="pr-tcx">⬇ Save ride (.tcx)</button><button class="btn" data-default data-back id="pr-ok">Continue</button></div>
    </div>`);
  el.querySelector<HTMLButtonElement>('#pr-tcx')!.onclick = () => exportRideNow();
  el.querySelector<HTMLButtonElement>('#pr-ok')!.onclick = () => { abandonToMenu(); openTitle(); };
}

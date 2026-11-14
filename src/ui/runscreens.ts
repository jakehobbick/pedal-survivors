/** In-run menus: level-up, chest, pit-stop shop, pause, post-run. All controller-navigable. */
import { openScreen, closeTop, closeAll, esc, select, toast } from './ui';
import { game, endRun } from '../game/game';
import { rollChoices, applyChoice, evolutionsReady, evoChoice, evolve, Choice } from '../game/upgrades';
import { iconURL } from '../art/icons';
import { WEAPON_BY_ID } from '../data/weapons';
import { sfx } from '../audio/sfx';
import { settings } from '../core/settings';
import { burst, ring, flash } from '../game/fx';
import { openSettings } from './screens';
import { openPostRun } from './postrun';
import { achEvent } from '../meta/achievements';
import { exportRideNow } from '../export/tcx';

export interface RunUI { openLevelUp(): void; openChest(rank: number): void; openShop(): void; openPause(): void; openPostRun(quit: boolean): void }

function done() { game.menuOpen = false; }
function card(c: Choice, i: number) {
  const evo = c.kind === 'evolve';
  const lv = c.kind === 'weapon' || c.kind === 'passive' ? (c.isNew ? '<span class="pill gold">NEW!</span>' : `<span class="lv">LV ${c.lv - 1} → ${c.lv}</span>`) : '';
  const typ = c.kind === 'weapon' ? 'Weapon' : c.kind === 'passive' ? 'Passive' : evo ? 'Evolution' : 'Bonus';
  return `<div class="upg${evo ? ' evo' : ''}" data-i="${i}" ${i === 0 ? 'data-default' : ''}>
    <div style="display:flex;gap:12px;align-items:center"><img class="ic" src="${iconURL(evo ? WEAPON_BY_ID[c.id].evo!.into : c.id)}" width="64" height="64"><div><div class="nm" style="color:${c.color}">${esc(c.name)}</div>${lv} <span class="pill">${typ}</span></div></div>
    <div class="ds">${esc(c.desc)}</div></div>`;
}

let autoT = 0;
export const runUI: RunUI = {
  openLevelUp() {
    const W = game.world; const P = W.player;
    sfx.levelUp(); ring(P.x, P.y - 30, 36, '#ffd166', 520, 14); flash('#ffd166', 0.25);
    let banishMode = false;
    let choices = rollChoices(W, game.banned, 3);
    const render = () => {
      const el = openScreen(`
        <h2 style="margin-top:6vh">LEVEL UP! <span style="color:#fff">LV ${P.level}</span></h2>
        <div class="tag">${banishMode ? 'Pick an upgrade to <b>banish</b> for the rest of this run' : 'Choose an upgrade · steer to select, confirm to take it'}</div>
        <div class="choices">${choices.map(card).join('')}</div>
        <div class="row" style="margin-top:18px">
          <button class="btn sec sm" id="lu-reroll" ${P.rerolls > 0 ? '' : 'disabled'}>🎲 Reroll (${P.rerolls})</button>
          <button class="btn sec sm" id="lu-banish" ${P.banishes > 0 ? '' : 'disabled'}>🚫 ${banishMode ? 'Cancel banish' : `Banish (${P.banishes})`}</button>
          <button class="btn sec sm" id="lu-skip" ${P.skips > 0 ? '' : 'disabled'}>⏭ Skip (${P.skips}) · +XP</button>
        </div>
        <div class="note" id="lu-auto" style="margin-top:10px"></div>`, 'glass');
      el.querySelectorAll<HTMLElement>('.upg').forEach((c) => c.onclick = () => {
        const ch = choices[+c.dataset.i!];
        if (banishMode) {
          game.banned.add(ch.id); P.banishes--; banishMode = false;
          choices = choices.filter((x) => x !== ch); const more = rollChoices(W, new Set([...game.banned, ...choices.map((x) => x.id)]), 1);
          choices.push(...more); sfx.back(); achEvent('banish'); render(); return;
        }
        applyChoice(W, ch); sfx.pick(); closeTop(); done();
        achEvent('levelPick', { kind: ch.kind, id: ch.id, lv: ch.lv });
      });
      el.querySelector<HTMLButtonElement>('#lu-reroll')!.onclick = () => { if (P.rerolls <= 0) return; P.rerolls--; choices = rollChoices(W, game.banned, 3); sfx.ui(); render(); };
      el.querySelector<HTMLButtonElement>('#lu-banish')!.onclick = () => { if (P.banishes <= 0 && !banishMode) return; banishMode = !banishMode; render(); };
      el.querySelector<HTMLButtonElement>('#lu-skip')!.onclick = () => { if (P.skips <= 0) return; P.skips--; W.addXp(P.xpNext * 0.3); closeTop(); done(); };
      select(el.querySelector('.upg'));
      startAuto(el);
      if ((window as any).__ps?.autoTest) setTimeout(() => (el.querySelector('.upg') as HTMLElement)?.click(), 30);
    };
    render();
  },
  openChest(rank: number) {
    const W = game.world; const P = W.player;
    const evos = evolutionsReady(W);
    let items: Choice[] = []; let gold = 0;
    if (evos.length) { const e = evos[0]; const c = evoChoice(W, e); evolve(W, e.from); items.push(c); sfx.evolve(); flash('#ff5d8f', 0.5); achEvent('evolve', { id: e.into }); }
    else {
      const n = (rank >= 3 ? 5 : rank >= 2 ? 3 : 1) + (P.char.style === 'domestique' ? 1 : 0);
      for (let i = 0; i < n; i++) { const r = rollChoices(W, game.banned, 1)[0]; if (!r) break; applyChoice(W, r); items.push(r); }
      sfx.chest();
    }
    gold = Math.round((10 + rank * 15) * P.stats.greed); W.stats.gold += gold;
    burst(P.x, P.y - 40, 30, '#ffd166', 300, 14);
    const el = openScreen(`
      <h2 style="margin-top:8vh">${items[0] && items[0].kind === 'evolve' ? '✨ EVOLUTION ✨' : rank >= 3 ? 'LEGENDARY CHEST' : rank >= 2 ? 'BIG CHEST' : 'TREASURE CHEST'}</h2>
      <div class="choices" style="grid-template-columns:repeat(${Math.min(3, Math.max(1, items.length))},minmax(0,1fr));max-width:${Math.min(3, items.length) * 320}px">${items.map((c, i) => card(c, i).replace('class="upg', 'class="upg nonav')).join('')}</div>
      <div class="tag" style="margin-top:14px">+${gold} gold</div>
      <button class="btn gold" data-default id="ch-ok">Collect</button>`, 'glass');
    el.querySelector<HTMLButtonElement>('#ch-ok')!.onclick = () => { closeTop(); done(); };
    select(el.querySelector('#ch-ok'));
    achEvent('chest', { rank });
    if ((window as any).__ps?.autoTest) setTimeout(() => (el.querySelector('#ch-ok') as HTMLElement)?.click(), 30);
  },
  openShop() {
    if (game.menuOpen) { setTimeout(() => runUI.openShop(), 1500); return; }
    game.menuOpen = true;
    const W = game.world; const P = W.player;
    const items = [
      { id: 'heal', name: 'Rice Ball Bento', desc: 'Heal 40% HP', cost: 15, icon: 'heal' },
      { id: 'up', name: 'Mystery Upgrade', desc: 'A random level-up', cost: 35, icon: 'log' },
      { id: 'reroll', name: 'Spare Tube', desc: '+1 reroll', cost: 20, icon: 'cadence' },
      { id: 'chest', name: 'Team Car Chest', desc: 'Open a chest (can evolve)', cost: 70, icon: 'gold' },
    ];
    let t = 45; let timer = 0;
    const render = () => {
      const el = openScreen(`
        <h2 style="margin-top:6vh">🏁 PIT STOP SHOP</h2>
        <div class="tag">Spend run gold (it would otherwise bank for permanent upgrades) · <b style="color:#ffd166">${W.stats.gold} gold</b></div>
        <div class="grid" style="max-width:900px">${items.map((it, i) => `<div class="card" data-i="${i}" ${i === 0 ? 'data-default' : ''}><img src="${iconURL(it.icon)}" width="48" height="48" style="float:right;border-radius:10px"><div class="ttl">${it.name}</div><div class="sub">${it.desc}</div><div style="margin-top:8px"><span class="pill gold">${it.cost} gold</span></div></div>`).join('')}</div>
        <button class="btn sec" id="sh-x" data-back style="margin-top:16px">Back to the race (<span id="sh-t">${t}</span>s)</button>`, 'glass');
      el.querySelectorAll<HTMLElement>('.card').forEach((c) => c.onclick = () => {
        const it = items[+c.dataset.i!]; if (W.stats.gold < it.cost) { toast('Not enough gold'); sfx.back(); return; }
        W.stats.gold -= it.cost; sfx.coin(); achEvent('shopBuy');
        if (it.id === 'heal') W.healPlayer(P.maxHp * 0.4);
        if (it.id === 'reroll') P.rerolls++;
        if (it.id === 'up') { const r = rollChoices(W, game.banned, 1)[0]; if (r) { applyChoice(W, r); toast(`${r.name} ${r.isNew ? '(new)' : 'LV ' + r.lv}`); } }
        if (it.id === 'chest') { clearInterval(timer); closeTop(); runUI.openChest(1); return; }
        render();
      });
      el.querySelector<HTMLButtonElement>('#sh-x')!.onclick = () => { clearInterval(timer); closeTop(); done(); };
    };
    render();
    if ((window as any).__ps?.autoTest) setTimeout(() => (document.getElementById('sh-x') as HTMLElement)?.click(), 30);
    timer = window.setInterval(() => { t--; const e = document.getElementById('sh-t'); if (e) e.textContent = String(t); if (t <= 0 || game.state !== 'run') { clearInterval(timer); if (game.menuOpen && document.getElementById('sh-x')) { closeTop(); done(); } } }, 1000);
  },
  openPause() {
    const el = openScreen(`
      <h2 style="margin-top:10vh">PAUSED</h2>
      <div class="tag">The workout clock is stopped. Keep spinning or take a breather.</div>
      <div class="col" style="width:min(380px,90vw)">
        <button class="btn" data-default id="pa-res">▶ Resume</button>
        <button class="btn sec" id="pa-set">⚙ Settings</button>
        <button class="btn sec" id="pa-tcx">⬇ Save ride so far (.tcx)</button>
        <button class="btn sec" id="pa-end">🏁 End run now</button>
      </div>`, 'glass');
    el.querySelector<HTMLButtonElement>('#pa-res')!.onclick = () => { closeAll(); };
    el.querySelector<HTMLButtonElement>('#pa-set')!.onclick = () => openSettings(true);
    el.querySelector<HTMLButtonElement>('#pa-tcx')!.onclick = () => exportRideNow();
    el.querySelector<HTMLButtonElement>('#pa-end')!.onclick = () => {
      const c = openScreen(`<h2 style="margin-top:20vh">End the run?</h2><div class="tag">You keep the gold and stats from this ride and can export it.</div><div class="row"><button class="btn sec" data-back data-default id="c-no">Keep riding</button><button class="btn" id="c-yes">End run</button></div>`, 'glass', false);
      c.querySelector<HTMLButtonElement>('#c-no')!.onclick = () => closeTop();
      c.querySelector<HTMLButtonElement>('#c-yes')!.onclick = () => { closeAll(); endRun(true); };
    };
    el.querySelector<HTMLButtonElement>('[data-default]')!.setAttribute('data-back', '');
  },
  openPostRun(quit: boolean) { closeAll(); openPostRun(quit); },
};
game.ui = runUI;

function startAuto(el: HTMLElement) {
  clearInterval(autoT);
  const sec = (settings as any).autoPick || 0; if (!sec) return;
  let t = sec; const note = el.querySelector<HTMLElement>('#lu-auto');
  autoT = window.setInterval(() => {
    if (!document.body.contains(el)) { clearInterval(autoT); return; }
    t--; if (note) note.textContent = `Auto-picking in ${t}s (Settings → Auto-pick)`;
    if (t <= 0) { clearInterval(autoT); (el.querySelector('.upg.navsel') as HTMLElement || el.querySelector('.upg') as HTMLElement)?.click(); }
  }, 1000);
}

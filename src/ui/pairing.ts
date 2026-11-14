/** Title-screen pairing panel + the in-run "trainer disconnected" flow. */
import { ble, onBle, connectTrainer, connectHR, reconnectTrainer, forgetTrainer, bleSupported } from '../trainer/ble';
import { sensors } from '../trainer/sensors';
import { openScreen, closeTop, toast, esc, topScreen } from './ui';
import { game, togglePause, endRun } from '../game/game';
import { settings } from '../core/settings';

export function pairingPanelHTML() {
  const sup = bleSupported();
  return `
  <div class="field" style="border:0"><div class="dots"><span class="dot ${ble.ok ? 'ok' : ble.lost ? 'warn' : ''}" id="pp-tdot"></span><b>Smart trainer</b></div>
    <span class="row" style="gap:8px"><span class="note" id="pp-tst">${esc(ble.status)}</span><button class="btn cyan sm" id="pp-t">${ble.ok ? 'Re-pair' : 'Pair'}</button></span></div>
  <div class="field" style="border:0"><div class="dots"><span class="dot ${ble.hrOk ? 'ok' : ''}" id="pp-hdot"></span><b>Heart rate</b> <span class="note">(optional)</span></div>
    <span class="row" style="gap:8px"><span class="note" id="pp-hst">${esc(ble.hrStatus)}</span><button class="btn sec sm" id="pp-h">Pair</button></span></div>
  <div class="field" style="border:0"><div class="dots"><span class="dot" id="pp-kdot"></span><b>Zwift Ride</b> <span class="note">(via BikeControl on your phone)</span></div>
    <span class="note" id="pp-kst">Press any controller button…</span></div>
  ${sup ? '' : `<p class="note" style="margin:6px 0 0">⚠ This browser has no Web Bluetooth. On iPad open this page in <b>Bluefy</b>; on a laptop use Chrome or Edge. You can still play with the simulated trainer.</p>`}
  <details style="margin-top:6px"><summary class="note">Connection log</summary><pre class="note" id="pp-log" style="white-space:pre-wrap;max-height:120px;overflow:auto;margin:6px 0 0">${esc(ble.log.join('\n'))}</pre>
    <button class="btn sec sm" id="pp-forget">Forget trainer (use simulator)</button></details>
  <p class="note" style="margin:4px 0 0">FTP <b>${settings.ftp} W</b> · change it in Settings. Source: <b id="pp-src">${sensors.src === 'ble' ? 'Bluetooth trainer' : 'simulated trainer'}</b></p>`;
}
let wired: HTMLElement | null = null;
export function wirePairingPanel(el: HTMLElement) {
  wired = el;
  el.querySelector<HTMLButtonElement>('#pp-t')!.onclick = () => connectTrainer();
  el.querySelector<HTMLButtonElement>('#pp-h')!.onclick = () => connectHR();
  el.querySelector<HTMLButtonElement>('#pp-forget')!.onclick = () => { forgetTrainer(); toast('Using the simulated trainer'); };
  refresh();
}
function refresh() {
  const el = wired; if (!el || !document.body.contains(el)) return;
  const q = (id: string) => el.querySelector<HTMLElement>('#' + id);
  q('pp-tst') && (q('pp-tst')!.textContent = ble.status);
  q('pp-tdot')?.classList.toggle('ok', ble.ok); q('pp-tdot')?.classList.toggle('warn', !ble.ok && ble.lost);
  q('pp-hst') && (q('pp-hst')!.textContent = ble.hrStatus);
  q('pp-hdot')?.classList.toggle('ok', ble.hrOk);
  if (q('pp-log')) q('pp-log')!.textContent = ble.log.join('\n');
  if (q('pp-src')) q('pp-src')!.textContent = sensors.src === 'ble' ? 'Bluetooth trainer' : 'simulated trainer';
  const t = q('pp-t'); if (t) t.textContent = ble.ok ? 'Re-pair' : 'Pair';
  const fresh = performance.now() - ble.lastKeyAt < 2500 && ble.lastKey;
  q('pp-kdot')?.classList.toggle('ok', !!fresh);
  if (q('pp-kst')) q('pp-kst')!.textContent = ble.lastKey ? `Last button: ${ble.lastKey}` : 'Press any controller button…';
}
setInterval(refresh, 700);

/* ---------- in-run disconnect handling ---------- */
let lostScreen: HTMLElement | null = null;
onBle((ev) => {
  refresh();
  if (ev === 'trainerLost' && game.state === 'run') {
    if (!game.paused) togglePause(true);
    if (topScreen()) closeTop(); // replace the pause menu
    game.btPaused = true;
    lostScreen = openScreen(`
      <h2 style="margin-top:12vh">📡 TRAINER DISCONNECTED</h2>
      <div class="tag" id="dc-st">${esc(ble.status)}</div>
      <p class="note" style="max-width:520px;text-align:center">The run and the workout clock are paused. I'll keep trying to reconnect on my own; keep the KICKR powered and Bluefy in the foreground.</p>
      <div class="col" style="width:min(380px,90vw)">
        <button class="btn cyan" data-default id="dc-re">🔄 Reconnect now</button>
        <button class="btn sec" id="dc-sim">Continue with the simulated trainer</button>
        <button class="btn sec" id="dc-end">End run (keep stats & export)</button>
      </div>`, 'glass', false);
    lostScreen.querySelector<HTMLButtonElement>('#dc-re')!.onclick = async () => { const ok = await reconnectTrainer(); if (!ok) toast('Still can\'t reach the trainer'); };
    lostScreen.querySelector<HTMLButtonElement>('#dc-sim')!.onclick = () => { forgetTrainer(); resumeAfterLost('Simulated trainer active'); };
    lostScreen.querySelector<HTMLButtonElement>('#dc-end')!.onclick = () => { closeLost(); game.btPaused = false; endRun(true); };
  }
  if (ev === 'trainer' && lostScreen && document.body.contains(lostScreen)) { const s = lostScreen.querySelector('#dc-st'); if (s) s.textContent = ble.status; }
  if (ev === 'trainerBack' && game.btPaused) resumeAfterLost('Trainer reconnected ✓');
});
function closeLost() { if (lostScreen && document.body.contains(lostScreen)) { lostScreen.remove(); } lostScreen = null; while (topScreen()) closeTop(); }
function resumeAfterLost(msg: string) { closeLost(); game.btPaused = false; game.paused = false; toast(msg); }

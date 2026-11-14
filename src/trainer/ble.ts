/**
 * Web Bluetooth: FTMS smart trainer (Wahoo KICKR), Cycling Power fallback, and HR straps.
 * Ported from Crank Crypt (same services, parsing, control-point handshake and write queue),
 * improved with: automatic reconnects, control-point response logging, throttled virtual-gear
 * writes, an optional FTMS simulation-grade gear mode, and disconnect events for the game.
 */
import { sensors } from './sensors';
import { trainer, onTrainerChange, gearWatts, GEARS } from './control';
import { settings, FTP } from '../core/settings';

const U = (n: number) => '0000' + n.toString(16).padStart(4, '0') + '-0000-1000-8000-00805f9b34fb';
const FTMS = U(0x1826), CPS = U(0x1818), HRS = U(0x180d), DIS = U(0x180a);
const IBD = U(0x2ad2), FTMS_CP = U(0x2ad9), CP_MEAS = U(0x2a63), HR_MEAS = U(0x2a37);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errMsg = (e: any) => (e && (e.message || e.name)) || (typeof e === 'string' ? e : JSON.stringify(e)) || 'unknown error';

type BDevice = any; type BChar = any;
export const ble = {
  dev: null as BDevice | null, cp: null as BChar | null, ctrl: false, q: Promise.resolve() as Promise<unknown>,
  mode: '' as '' | 'erg' | 'fg' | 'sim', ergW: -1, grade: -99, lastSend: 0,
  status: 'Not connected', ok: false, connecting: false, lost: false, reconnecting: false,
  hrDev: null as BDevice | null, hrStatus: 'Not connected', hrOk: false,
  log: [] as string[],
  lastKey: '', lastKeyAt: 0,
};
type Listener = (ev: 'trainer' | 'trainerLost' | 'trainerBack' | 'hr' | 'log') => void;
const listeners: Listener[] = [];
export function onBle(fn: Listener) { listeners.push(fn); }
const emit = (e: Parameters<Listener>[0]) => listeners.forEach((l) => l(e));
function blog(m: string) { ble.log.push(new Date().toLocaleTimeString() + ' ' + m); if (ble.log.length > 60) ble.log.shift(); emit('log'); }

export const bleSupported = () => typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;

function cpWrite(bytes: number[]) {
  ble.q = ble.q.then(() => {
    const c = ble.cp; if (!c) return;
    const d = new Uint8Array(bytes);
    return c.writeValueWithResponse ? c.writeValueWithResponse(d) : c.writeValue(d);
  }).catch((e) => blog('control write failed: ' + errMsg(e)));
  return ble.q;
}

/* ---------- parsing (FTMS Indoor Bike Data / CPS) ---------- */
function parseIBD(dv: DataView) {
  try {
    const f = dv.getUint16(0, true); let o = 2; const L = dv.byteLength;
    if (!(f & 1)) o += 2;          // instantaneous speed present when "more data" bit is 0
    if (f & 2) o += 2;             // average speed
    if (f & 4) { if (o + 2 <= L) { sensors.cadence = dv.getUint16(o, true) / 2; sensors.lastC = performance.now(); } o += 2; }
    if (f & 8) o += 2;             // average cadence
    if (f & 16) o += 3;            // total distance
    if (f & 32) o += 2;            // resistance level
    if (f & 64) { if (o + 2 <= L) { sensors.power = Math.max(0, dv.getInt16(o, true)); sensors.lastP = performance.now(); } o += 2; }
    if (f & 128) o += 2;           // average power
    if (f & 256) o += 5;           // expended energy
    if (f & 512) { if (o + 1 <= L && !sensors.hrOK) { const h = dv.getUint8(o); if (h > 0) { sensors.hr = h; sensors.lastHR = performance.now(); } } o += 1; }
  } catch { /* malformed packet */ }
}
const crankPrev = { revs: -1, time: 0, lastChange: 0 };
function parseCPS(dv: DataView) {
  try {
    const f = dv.getUint16(0, true); sensors.power = Math.max(0, dv.getInt16(2, true)); sensors.lastP = performance.now();
    let o = 4; if (f & 1) o += 1; if (f & 4) o += 2; if (f & 16) o += 6;
    if (f & 32 && o + 4 <= dv.byteLength) {
      const revs = dv.getUint16(o, true), t = dv.getUint16(o + 2, true);
      if (crankPrev.revs >= 0) {
        const dr = (revs - crankPrev.revs + 65536) % 65536, dt = ((t - crankPrev.time + 65536) % 65536) / 1024;
        if (dr > 0 && dt > 0) { sensors.cadence = Math.min(200, dr / dt * 60); sensors.lastC = performance.now(); crankPrev.lastChange = performance.now(); }
        else if (performance.now() - crankPrev.lastChange > 2500) sensors.cadence = 0;
      }
      crankPrev.revs = revs; crankPrev.time = t;
    }
  } catch { /* ignore */ }
}
function onCpResponse(dv: DataView) {
  try {
    if (dv.getUint8(0) !== 0x80) return;
    const op = dv.getUint8(1), res = dv.getUint8(2);
    if (res !== 1) blog(`trainer rejected op 0x${op.toString(16)} (result ${res})`);
  } catch { /* ignore */ }
}

/* ---------- connect ---------- */
async function setupTrainer(dev: BDevice) {
  let srv: any = null;
  for (let i = 1; i <= 3 && !srv; i++) { try { srv = await dev.gatt.connect(); } catch (e) { blog('connect attempt ' + i + ' failed: ' + errMsg(e)); if (i === 3) throw e; await sleep(800); } }
  await sleep(300);
  let ftms: any = null; try { ftms = await srv.getPrimaryService(FTMS); } catch (e) { blog('no FTMS: ' + errMsg(e)); }
  let gotData = false; ble.cp = null; ble.ctrl = false;
  if (ftms) {
    try { ble.status = 'Subscribing to trainer data…'; const ibd = await ftms.getCharacteristic(IBD); ibd.addEventListener('characteristicvaluechanged', (e: any) => parseIBD(e.target.value)); await ibd.startNotifications(); gotData = true; }
    catch (e) { blog('trainer data failed: ' + errMsg(e)); }
    try {
      ble.status = 'Requesting trainer control…';
      const cp = await ftms.getCharacteristic(FTMS_CP);
      cp.addEventListener('characteristicvaluechanged', (e: any) => onCpResponse(e.target.value));
      await cp.startNotifications();
      ble.cp = cp;
      const d = new Uint8Array([0x00]); await (cp.writeValueWithResponse ? cp.writeValueWithResponse(d) : cp.writeValue(d));
      await sleep(200); await cpWrite([0x07]); ble.ctrl = true;
    } catch (e) { ble.cp = null; ble.ctrl = false; blog('control failed: ' + errMsg(e)); }
  }
  if (!gotData) {
    ble.status = 'Subscribing to power meter…';
    const cps = await srv.getPrimaryService(CPS); const m = await cps.getCharacteristic(CP_MEAS);
    m.addEventListener('characteristicvaluechanged', (e: any) => parseCPS(e.target.value)); await m.startNotifications(); gotData = true;
  }
  ble.dev = dev; ble.ok = true; ble.lost = false; sensors.src = 'ble'; sensors.lastP = sensors.lastC = performance.now();
  ble.status = (dev.name || 'Trainer') + (ble.ctrl ? ' · ERG/gears ✓' : ' · power only (no resistance control)');
  blog('connected, control=' + ble.ctrl);
  ble.mode = ''; applyTrainer(true);
}
export async function connectTrainer() {
  if (!bleSupported()) { ble.status = 'Bluetooth unavailable — on iPad use the Bluefy browser'; emit('trainer'); return; }
  if (ble.connecting) return;
  ble.connecting = true; ble.status = 'Choosing device…'; emit('trainer');
  try {
    const opt = [FTMS, CPS, HRS, DIS]; let dev: BDevice;
    try { dev = await (navigator as any).bluetooth.requestDevice({ filters: [{ services: [FTMS] }, { services: [CPS] }, { namePrefix: 'KICKR' }], optionalServices: opt }); }
    catch (e: any) { if (e && e.name === 'NotFoundError') throw e; blog('filtered picker failed: ' + errMsg(e) + ', trying all devices'); dev = await (navigator as any).bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: opt }); }
    blog('picked ' + (dev.name || dev.id));
    dev.addEventListener('gattserverdisconnected', () => onTrainerDisconnected(dev));
    ble.status = 'Connecting…'; emit('trainer');
    await setupTrainer(dev);
  } catch (e: any) {
    if (e && e.name === 'NotFoundError') { ble.status = 'Not connected (picker cancelled)'; blog('picker cancelled'); }
    else { ble.status = 'Failed: ' + errMsg(e); blog('FAILED: ' + errMsg(e)); }
  } finally { ble.connecting = false; emit('trainer'); }
}
function onTrainerDisconnected(dev: BDevice) {
  if (ble.dev !== dev) return;
  ble.ok = false; ble.cp = null; ble.ctrl = false; ble.lost = true; ble.status = 'Disconnected';
  sensors.power = 0; sensors.cadence = 0;
  blog('trainer disconnected'); emit('trainerLost');
  autoReconnect(dev);
}
async function autoReconnect(dev: BDevice) {
  if (ble.reconnecting) return; ble.reconnecting = true;
  for (let i = 1; i <= 4 && ble.lost && ble.dev === dev; i++) {
    ble.status = `Reconnecting (try ${i}/4)…`; emit('trainer');
    await sleep(1200 * i);
    try { await setupTrainer(dev); ble.reconnecting = false; emit('trainerBack'); emit('trainer'); return; }
    catch (e) { blog('reconnect failed: ' + errMsg(e)); }
  }
  ble.reconnecting = false; if (ble.lost) { ble.status = 'Disconnected — tap Reconnect'; emit('trainer'); }
}
/** manual reconnect from the pause/disconnect screen (no picker needed) */
export async function reconnectTrainer() {
  const dev = ble.dev; if (!dev) { await connectTrainer(); return ble.ok; }
  try { ble.status = 'Reconnecting…'; emit('trainer'); await setupTrainer(dev); emit('trainerBack'); emit('trainer'); return true; }
  catch (e) { ble.status = 'Reconnect failed: ' + errMsg(e); blog('manual reconnect failed: ' + errMsg(e)); emit('trainer'); return false; }
}
export function forgetTrainer() {
  try { ble.dev?.gatt?.disconnect(); } catch { /* ignore */ }
  ble.dev = null; ble.cp = null; ble.ok = false; ble.lost = false; sensors.src = 'sim'; ble.status = 'Not connected'; emit('trainer');
}

export async function connectHR() {
  if (!bleSupported()) { ble.hrStatus = 'Bluetooth unavailable'; emit('hr'); return; }
  try {
    ble.hrStatus = 'Choosing strap…'; emit('hr');
    const dev = await (navigator as any).bluetooth.requestDevice({ filters: [{ services: [HRS] }] });
    const hook = async () => {
      const srv = await dev.gatt.connect(); const s = await srv.getPrimaryService(HRS); const c = await s.getCharacteristic(HR_MEAS);
      c.addEventListener('characteristicvaluechanged', (e: any) => { const v: DataView = e.target.value; const f = v.getUint8(0); sensors.hr = (f & 1) ? v.getUint16(1, true) : v.getUint8(1); sensors.lastHR = performance.now(); sensors.hrOK = true; });
      await c.startNotifications();
      ble.hrDev = dev; ble.hrOk = true; ble.hrStatus = dev.name || 'Connected'; emit('hr');
    };
    dev.addEventListener('gattserverdisconnected', async () => {
      ble.hrOk = false; sensors.hrOK = false; ble.hrStatus = 'Reconnecting…'; emit('hr');
      for (let i = 1; i <= 3; i++) { await sleep(1500 * i); try { await hook(); return; } catch { /* retry */ } }
      ble.hrStatus = 'Disconnected'; emit('hr');
    });
    await hook();
  } catch (e: any) { ble.hrStatus = e && e.name === 'NotFoundError' ? 'Not connected' : 'Failed: ' + errMsg(e); emit('hr'); }
}

/* ---------- resistance control ---------- */
/** FTMS simulation grade used by the optional 'grade' gear mode: −2% (gear 1) → +9.5% (gear 24) */
export function gradeForGear(g: number) { return -2 + (g - 1) * (11.5 / (GEARS - 1)); }
function applyTrainer(force: boolean) {
  if (!ble.ctrl || !ble.cp) return;
  const now = performance.now();
  if (trainer.mode === 'erg') {
    const w = Math.round(trainer.ergFrac * FTP());
    if (force || ble.mode !== 'erg' || ble.ergW !== w) { cpWrite([0x05, w & 255, (w >> 8) & 255]); ble.mode = 'erg'; ble.ergW = w; ble.grade = -99; ble.lastSend = now; }
    return;
  }
  if (settings.gearMode === 'grade') {
    const g = gradeForGear(trainer.gear);
    if (force || ble.mode !== 'sim' || Math.abs(g - ble.grade) > 0.01) {
      const gv = Math.round(g * 100); cpWrite([0x11, 0, 0, gv & 255, (gv >> 8) & 255, 40, 51]);
      ble.mode = 'sim'; ble.grade = g; ble.ergW = -1; ble.lastSend = now;
    }
    return;
  }
  // ERG-curve virtual gears: target watts follow gear and (smoothed) cadence
  const w = Math.round(gearWatts(sensors.cadSm || 0));
  if (force || ble.mode !== 'fg' || (Math.abs(ble.ergW - w) >= 4 && now - ble.lastSend > 900)) {
    cpWrite([0x05, w & 255, (w >> 8) & 255]); ble.mode = 'fg'; ble.ergW = w; ble.lastSend = now; ble.grade = -99;
  }
}

/* ---------- controller bridge (keys from BikeControl) + gamepads ---------- */
export function initBle() {
  onTrainerChange((force) => applyTrainer(force));
  addEventListener('keydown', (e) => { ble.lastKey = e.key === ' ' ? 'Space' : e.key; ble.lastKeyAt = performance.now(); emit('log'); }, true);
}

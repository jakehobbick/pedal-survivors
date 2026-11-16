/**
 * TCX export for Garmin Connect (→ Strava). Ported from Crank Crypt and kept format-compatible:
 * TrainingCenterDatabase v2 + ActivityExtension v2 (ns3:TPX Speed/Watts), 1 s trackpoints with
 * power, cadence and HR, virtual speed/distance from a simple flat-road power model.
 * Improvement over Crank Crypt: one <Lap> per workout step, so intervals show up as laps
 * in Garmin Connect and Strava. Element order follows the TCX v2 XSD exactly.
 */
import { recorder, Recorder } from '../trainer/sensors';
import { toast } from '../ui/ui';
import { LS } from '../core/storage';

export interface RideData {
  start: number; p: ArrayLike<number>; c: ArrayLike<number>; hr: ArrayLike<number>; n: number;
  step?: ArrayLike<number>; labels?: string[]; kinds?: string[];
}
/** steady-state speed (m/s) on flat ground for power P (75 kg system, CdA 0.32, Crr 0.004) */
export function rideSpeed(P: number) {
  let v = 8;
  for (let i = 0; i < 20; i++) { const f = 0.5 * 1.2 * 0.32 * v * v * v + 75 * 9.81 * 0.004 * v - Math.max(0, P); const d = 1.5 * 1.2 * 0.32 * v * v + 75 * 9.81 * 0.004; v = Math.max(0, v - f / d); }
  return v;
}
const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const xmlEsc = (s: string) => s.replace(/[<&>"]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;', '"': '&quot;' }[c]!));

/** contiguous [from, to) sample ranges, one per workout step; tiny fragments merge into the previous lap */
export function lapRanges(R: RideData): [number, number, number][] {
  if (!R.step || R.n === 0) return [[0, R.n, -1]];
  const out: [number, number, number][] = [];
  let s0 = 0;
  for (let i = 1; i <= R.n; i++) {
    if (i === R.n || R.step[i] !== R.step[s0]) {
      if (out.length && i - s0 < 5) out[out.length - 1][1] = i; else out.push([s0, i, R.step[s0]]);
      s0 = i;
    }
  }
  return out.length ? out : [[0, R.n, -1]];
}

export function buildTCX(R: RideData, notes = 'Pedal Survivors run'): string {
  let dist = 0;
  const laps: string[] = [];
  for (const [a, b, si] of lapRanges(R)) {
    let maxV = 0, hrS = 0, hrN = 0, hrMax = 0, cadS = 0, cadN = 0, kj = 0; const d0 = dist;
    const tp: string[] = [];
    for (let i = a; i < b; i++) {
      const p = R.p[i] | 0, c = R.c[i] | 0, hr = R.hr[i] | 0; const t = R.start + i * 1000;
      const v = p > 0 ? rideSpeed(p) : 0; dist += v; maxV = Math.max(maxV, v); kj += p / 1000;
      if (hr > 0) { hrS += hr; hrN++; hrMax = Math.max(hrMax, hr); }
      if (c > 0) { cadS += c; cadN++; }
      tp.push(`<Trackpoint><Time>${iso(t)}</Time><DistanceMeters>${dist.toFixed(1)}</DistanceMeters>${hr > 0 ? `<HeartRateBpm><Value>${hr}</Value></HeartRateBpm>` : ''}<Cadence>${Math.min(254, c)}</Cadence><Extensions><ns3:TPX><ns3:Speed>${v.toFixed(2)}</ns3:Speed><ns3:Watts>${p}</ns3:Watts></ns3:TPX></Extensions></Trackpoint>`);
    }
    const kind = si >= 0 && R.kinds ? R.kinds[si] : '';
    const resting = kind === 'recovery' || kind === 'cooldown' || kind === 'warmup';
    laps.push(`<Lap StartTime="${iso(R.start + a * 1000)}"><TotalTimeSeconds>${b - a}</TotalTimeSeconds><DistanceMeters>${(dist - d0).toFixed(1)}</DistanceMeters><MaximumSpeed>${maxV.toFixed(2)}</MaximumSpeed><Calories>${Math.round(kj)}</Calories>${hrN ? `<AverageHeartRateBpm><Value>${Math.round(hrS / hrN)}</Value></AverageHeartRateBpm><MaximumHeartRateBpm><Value>${hrMax}</Value></MaximumHeartRateBpm>` : ''}<Intensity>${resting ? 'Resting' : 'Active'}</Intensity>${cadN ? `<Cadence>${Math.min(254, Math.round(cadS / cadN))}</Cadence>` : ''}<TriggerMethod>Manual</TriggerMethod><Track>${tp.join('')}</Track>${si >= 0 && R.labels ? `<Notes>${xmlEsc(R.labels[si] || '')}</Notes>` : ''}</Lap>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2"><Activities><Activity Sport="Biking"><Id>${iso(R.start)}</Id>${laps.join('')}<Notes>${xmlEsc(notes)}</Notes><Creator xsi:type="Device_t" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><Name>Pedal Survivors</Name><UnitId>0</UnitId><ProductID>0</ProductID><Version><VersionMajor>1</VersionMajor><VersionMinor>0</VersionMinor></Version></Creator></Activity></Activities></TrainingCenterDatabase>`;
}

let stepMeta: { labels: string[]; kinds: string[] } = { labels: [], kinds: [] };
/** the run controller registers the step labels so laps can be named */
export function setRideSteps(labels: string[], kinds: string[]) { stepMeta = { labels, kinds }; }
export function rideFromRecorder(r: Recorder = recorder): RideData {
  return { start: r.start, p: r.p, c: r.c, hr: r.hr, n: r.n, step: r.step, labels: stepMeta.labels, kinds: stepMeta.kinds };
}
function fname(start: number, ext: string) {
  const d = new Date(start); const z = (n: number) => String(n).padStart(2, '0');
  return `pedal-survivors-${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}.${ext}`;
}
/** Share sheet (iPad: Save to Files / Garmin Connect app) → download link fallback. */
export async function deliverFile(blob: Blob, name: string, type: string) {
  try {
    const f = new File([blob], name, { type });
    if ((navigator as any).canShare && (navigator as any).canShare({ files: [f] })) { await (navigator as any).share({ files: [f], title: name }); return true; }
  } catch (e: any) { if (e && e.name === 'AbortError') return false; }
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); toast(`Saved ${name}`); return true;
  } catch { toast('Could not save the file here'); return false; }
}
export async function exportRide(R: RideData, notes?: string) {
  if (R.n < 10) { toast('Ride too short to save'); return; }
  const xml = buildTCX(R, notes);
  await deliverFile(new Blob([xml], { type: 'application/vnd.garmin.tcx+xml' }), fname(R.start, 'tcx'), 'application/vnd.garmin.tcx+xml');
}
export function exportRideNow(notes?: string) { return exportRide(rideFromRecorder(), notes); }
export function fileStamp(start: number, ext: string) { return fname(start, ext); }
/** keep the last ride so it can be re-exported from the title screen */
export function stashLastRide(notes: string) {
  const r = recorder; if (r.n < 10) return;
  LS.set('lastRide', { start: r.start, notes, p: Array.from(r.p.subarray(0, r.n)), c: Array.from(r.c.subarray(0, r.n)), hr: Array.from(r.hr.subarray(0, r.n)), step: Array.from(r.step.subarray(0, r.n)), labels: stepMeta.labels, kinds: stepMeta.kinds });
}
export function lastRide(): (RideData & { notes: string }) | null {
  const o = LS.get<any>('lastRide', null); if (!o || !o.p) return null;
  return { start: o.start, p: o.p, c: o.c, hr: o.hr, n: o.p.length, notes: o.notes || '', step: o.step, labels: o.labels, kinds: o.kinds };
}

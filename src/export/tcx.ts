/**
 * TCX export for Garmin Connect (→ Strava). Ported from Crank Crypt and kept format-compatible:
 * TrainingCenterDatabase v2 + ActivityExtension v2 (ns3:TPX Speed/Watts), 1 s trackpoints with
 * power, cadence and HR, virtual speed/distance from a simple flat-road power model.
 */
import { recorder, Recorder } from '../trainer/sensors';
import { toast } from '../ui/ui';
import { LS } from '../core/storage';

export interface RideData { start: number; p: ArrayLike<number>; c: ArrayLike<number>; hr: ArrayLike<number>; n: number }
/** steady-state speed (m/s) on flat ground for power P (75 kg system, CdA 0.32, Crr 0.004) */
export function rideSpeed(P: number) {
  let v = 8;
  for (let i = 0; i < 20; i++) { const f = 0.5 * 1.2 * 0.32 * v * v * v + 75 * 9.81 * 0.004 * v - Math.max(0, P); const d = 1.5 * 1.2 * 0.32 * v * v + 75 * 9.81 * 0.004; v = Math.max(0, v - f / d); }
  return v;
}
export function buildTCX(R: RideData, notes = 'Pedal Survivors run'): string {
  const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
  let dist = 0, maxV = 0, hrS = 0, hrN = 0, hrMax = 0, cadS = 0, cadN = 0, kj = 0;
  const parts: string[] = [];
  for (let i = 0; i < R.n; i++) {
    const p = R.p[i] | 0, c = R.c[i] | 0, hr = R.hr[i] | 0; const t = R.start + i * 1000;
    const v = p > 0 ? rideSpeed(p) : 0; dist += v; maxV = Math.max(maxV, v); kj += p / 1000;
    if (hr > 0) { hrS += hr; hrN++; hrMax = Math.max(hrMax, hr); }
    if (c > 0) { cadS += c; cadN++; }
    parts.push(`<Trackpoint><Time>${iso(t)}</Time><DistanceMeters>${dist.toFixed(1)}</DistanceMeters>${hr > 0 ? `<HeartRateBpm><Value>${hr}</Value></HeartRateBpm>` : ''}<Cadence>${Math.min(254, c)}</Cadence><Extensions><ns3:TPX><ns3:Speed>${v.toFixed(2)}</ns3:Speed><ns3:Watts>${p}</ns3:Watts></ns3:TPX></Extensions></Trackpoint>`);
  }
  const t0 = R.start, dur = R.n;
  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2"><Activities><Activity Sport="Biking"><Id>${iso(t0)}</Id><Lap StartTime="${iso(t0)}"><TotalTimeSeconds>${Math.round(dur)}</TotalTimeSeconds><DistanceMeters>${dist.toFixed(1)}</DistanceMeters><MaximumSpeed>${maxV.toFixed(2)}</MaximumSpeed><Calories>${Math.round(kj)}</Calories>${hrN ? `<AverageHeartRateBpm><Value>${Math.round(hrS / hrN)}</Value></AverageHeartRateBpm><MaximumHeartRateBpm><Value>${hrMax}</Value></MaximumHeartRateBpm>` : ''}<Intensity>Active</Intensity>${cadN ? `<Cadence>${Math.round(cadS / cadN)}</Cadence>` : ''}<TriggerMethod>Manual</TriggerMethod><Track>${parts.join('')}</Track></Lap><Notes>${notes.replace(/[<&>]/g, '')}</Notes><Creator xsi:type="Device_t" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><Name>Pedal Survivors</Name><UnitId>0</UnitId><ProductID>0</ProductID></Creator></Activity></Activities></TrainingCenterDatabase>`;
}
export function rideFromRecorder(r: Recorder = recorder): RideData { return { start: r.start, p: r.p, c: r.c, hr: r.hr, n: r.n }; }
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
export function exportRideNow() { return exportRide(rideFromRecorder()); }
/** keep the last ride so it can be re-exported from the title screen */
export function stashLastRide(notes: string) {
  const r = recorder; if (r.n < 10) return;
  LS.set('lastRide', { start: r.start, notes, p: Array.from(r.p.subarray(0, r.n)), c: Array.from(r.c.subarray(0, r.n)), hr: Array.from(r.hr.subarray(0, r.n)) });
}
export function lastRide(): (RideData & { notes: string }) | null {
  const o = LS.get<any>('lastRide', null); if (!o || !o.p) return null;
  return { start: o.start, p: o.p, c: o.c, hr: o.hr, n: o.p.length, notes: o.notes || '' };
}

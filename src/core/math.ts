export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const TAU = Math.PI * 2;
export const dist2 = (ax: number, ay: number, bx: number, by: number) => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};
/** Fast deterministic RNG (mulberry32). Allocation free. */
export class RNG {
  s: number;
  constructor(seed = 12345) { this.s = seed >>> 0; }
  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number) { return a + (b - a) * this.next(); }
  int(a: number, b: number) { return Math.floor(this.range(a, b + 1)); }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p: number) { return this.next() < p; }
}
export const rng = new RNG((Date.now() ^ 0x9e3779b9) >>> 0);
/** Integer hash -> [0,1). */
export function hash01(n: number) {
  let x = Math.imul(n ^ 0x27d4eb2d, 0x165667b1);
  x ^= x >>> 15; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}
export function hash2(x: number, y: number) { return hash01(Math.imul(x, 73856093) ^ Math.imul(y, 19349663)); }
export const fmtTime = (s: number) => {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`;
};
export const shuffle = <T>(a: T[]): T[] => {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
};
export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

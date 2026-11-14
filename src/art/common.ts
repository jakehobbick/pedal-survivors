/** Shared procedural-art helpers. All art is generated once into offscreen canvases. */
export type Ctx = CanvasRenderingContext2D;
export const INK = '#1a0f24';

export function mkCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  const g = c.getContext('2d')!;
  return [c, g];
}
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
export function mix(a: string, b: string, t: number): string {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
export function lin(g: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
export function rad(g: Ctx, x: number, y: number, r0: number, r1: number, stops: [number, string][], fx = x, fy = y) {
  const gr = g.createRadialGradient(fx, fy, r0, x, y, r1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
/** fill + ink outline of the current path */
export function inked(g: Ctx, fill: string | CanvasGradient | CanvasPattern, lw = 2.2, ink = INK) {
  g.fillStyle = fill; g.fill();
  g.lineWidth = lw; g.strokeStyle = ink; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
}
export function ellipse(g: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) {
  g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}
export function circle(g: Ctx, x: number, y: number, r: number) { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); }
export function line(g: Ctx, x0: number, y0: number, x1: number, y1: number) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
export function limb(g: Ctx, pts: number[], w: number, col: string, ink = INK) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.strokeStyle = ink; g.lineWidth = w + 3; g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.stroke();
}
/** 2-bone IK: returns knee/elbow position. bend = +1/-1 selects which side the joint bends to. */
export function ik(hx: number, hy: number, px: number, py: number, L1: number, L2: number, bend: number): [number, number] {
  let dx = px - hx, dy = py - hy; let d = Math.hypot(dx, dy);
  d = Math.min(d, L1 + L2 - 0.01); d = Math.max(d, Math.abs(L1 - L2) + 0.01);
  const a = Math.atan2(dy, dx);
  const b = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const ang = a - bend * b;
  return [hx + Math.cos(ang) * L1, hy + Math.sin(ang) * L1];
}

/** Seeded value noise texture (tileable) used for layered surface textures. */
const noiseCache = new Map<string, HTMLCanvasElement>();
export function noiseTex(size: number, seed: number, scale: number, alpha: number, dark = true): HTMLCanvasElement {
  const key = `${size}|${seed}|${scale}|${alpha}|${dark}`;
  const hit = noiseCache.get(key); if (hit) return hit;
  const [c, g] = mkCanvas(size, size);
  const img = g.createImageData(size, size);
  const N = Math.max(2, Math.round(size / scale));
  const grid = new Float32Array(N * N);
  let s = seed >>> 0 || 1;
  for (let i = 0; i < grid.length; i++) { s = (s * 16807) % 2147483647; grid[i] = s / 2147483647; }
  const v = (x: number, y: number) => grid[((y % N + N) % N) * N + ((x % N + N) % N)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let tot = 0, amp = 1, norm = 0;
    for (let o = 0; o < 3; o++) {
      const f = (1 << o) * N / size;
      const fx = x * f, fy = y * f; const ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = fx - ix, ty = fy - iy; const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const M = N * (1 << o);
      const vv = (a: number, b: number) => v(a % M, b % M);
      const n = (vv(ix, iy) * (1 - sx) + vv(ix + 1, iy) * sx) * (1 - sy) + (vv(ix, iy + 1) * (1 - sx) + vv(ix + 1, iy + 1) * sx) * sy;
      tot += n * amp; norm += amp; amp *= 0.5;
    }
    const n = tot / norm; const i = (y * size + x) * 4;
    const c8 = dark ? 0 : 255;
    img.data[i] = c8; img.data[i + 1] = c8; img.data[i + 2] = c8; img.data[i + 3] = Math.round(Math.max(0, n - 0.35) * 1.6 * alpha * 255);
  }
  g.putImageData(img, 0, 0);
  noiseCache.set(key, c);
  return c;
}
/** Overlay a texture onto already-drawn pixels of g (source-atop). */
export function textureAtop(g: Ctx, tex: HTMLCanvasElement, ox = 0, oy = 0) {
  g.save(); g.globalCompositeOperation = 'source-atop';
  const p = g.createPattern(tex, 'repeat')!;
  g.translate(ox, oy); g.fillStyle = p; g.fillRect(-ox, -oy, g.canvas.width, g.canvas.height);
  g.restore();
}
/** Soft rim light on already-drawn pixels from a direction. */
export function rimLight(g: Ctx, x0: number, y0: number, x1: number, y1: number, col = 'rgba(255,255,255,.35)') {
  g.save(); g.globalCompositeOperation = 'source-atop';
  g.fillStyle = lin(g, x0, y0, x1, y1, [[0, col], [0.35, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,0)']]);
  g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  g.restore();
}
export function shadowBelow(g: Ctx, x0: number, y0: number, x1: number, y1: number, a = 0.35) {
  g.save(); g.globalCompositeOperation = 'source-atop';
  g.fillStyle = lin(g, x0, y0, x1, y1, [[0, 'rgba(0,0,0,0)'], [0.55, 'rgba(0,0,0,0)'], [1, `rgba(20,0,40,${a})`]]);
  g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  g.restore();
}

/** A sprite: an offscreen canvas region with anchor (feet) point. */
export interface Frame { c: HTMLCanvasElement; w: number; h: number; ax: number; ay: number; white?: HTMLCanvasElement }
export function whiteOf(c: HTMLCanvasElement): HTMLCanvasElement {
  const [w, g] = mkCanvas(c.width, c.height);
  g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  return w;
}
/** Render a frame: draw callback in a w*h logical box at scale S (sprites are supersampled). */
export const SS = 2;
export function renderFrame(w: number, h: number, ax: number, ay: number, draw: (g: Ctx) => void, white = true): Frame {
  const [c, g] = mkCanvas(w * SS, h * SS);
  g.scale(SS, SS); draw(g);
  return { c, w, h, ax, ay, white: white ? whiteOf(c) : undefined };
}

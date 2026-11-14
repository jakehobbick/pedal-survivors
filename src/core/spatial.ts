/**
 * Allocation-free spatial hash. Entities are referenced by integer index.
 * Rebuilt every frame: clear() then insert() each live entity.
 */
export class SpatialHash {
  readonly cell: number;
  readonly mask: number;
  head: Int32Array;
  next: Int32Array;
  stamp: Int32Array; // lazy clear: bucket valid only if stamp === frame
  frame = 1;
  constructor(cellSize: number, buckets: number, maxItems: number) {
    this.cell = cellSize;
    let n = 1; while (n < buckets) n <<= 1;
    this.mask = n - 1;
    this.head = new Int32Array(n).fill(-1);
    this.stamp = new Int32Array(n);
    this.next = new Int32Array(maxItems).fill(-1);
  }
  private key(cx: number, cy: number) { return (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) & this.mask; }
  clear() { this.frame++; }
  insert(id: number, x: number, y: number) {
    const k = this.key(Math.floor(x / this.cell), Math.floor(y / this.cell));
    if (this.stamp[k] !== this.frame) { this.stamp[k] = this.frame; this.head[k] = -1; }
    this.next[id] = this.head[k];
    this.head[k] = id;
  }
  /** Writes candidate ids into out, returns count. Candidates may include false positives. */
  query(x: number, y: number, r: number, out: Int32Array): number {
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    let n = 0; const max = out.length;
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const k = this.key(cx, cy);
      if (this.stamp[k] !== this.frame) continue;
      let id = this.head[k];
      while (id !== -1 && n < max) { out[n++] = id; id = this.next[id]; }
    }
    return n;
  }
}

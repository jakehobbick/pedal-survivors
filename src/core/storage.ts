/** localStorage wrapped in try/catch everywhere (Bluefy private mode, quota, etc). */
const PREFIX = 'ps_';
export const LS = {
  get<T>(k: string, d: T): T {
    try { const v = localStorage.getItem(PREFIX + k); return v == null ? d : (JSON.parse(v) as T); } catch { return d; }
  },
  set(k: string, v: unknown): boolean {
    try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); return true; } catch { return false; }
  },
  del(k: string) { try { localStorage.removeItem(PREFIX + k); } catch { /* ignore */ } },
};

/** Level-up / chest choice generation (weighted by luck), rerolls, banishes and evolutions. */
import type { World } from './world';
import { WEAPONS, WEAPON_BY_ID, PASSIVES, PASSIVE_BY_ID, MAX_SLOTS, MAX_PASSIVE_SLOTS, MAX_WEAPON_LV } from '../data/weapons';
import { rng } from '../core/math';

export interface Choice { kind: 'weapon' | 'passive' | 'evolve' | 'gold' | 'heal'; id: string; lv: number; name: string; desc: string; color: string; isNew: boolean }

export function evolutionsReady(w: World): { from: string; into: string }[] {
  const P = w.player; const out: { from: string; into: string }[] = [];
  for (const wi of P.weapons) {
    if (wi.def.evolved || wi.lv < MAX_WEAPON_LV || !wi.def.evo) continue;
    if (P.passives.some((p) => p.id === wi.def.evo!.with)) out.push({ from: wi.def.id, into: wi.def.evo.into });
  }
  return out;
}
export function rollChoices(w: World, banned: Set<string>, n = 3): Choice[] {
  const P = w.player; const pool: [Choice, number][] = [];
  const ownedW = new Map(P.weapons.map((x) => [x.def.id, x]));
  const ownedP = new Map(P.passives.map((x) => [x.id, x]));
  for (const d of WEAPONS) {
    if (d.evolved || banned.has(d.id)) continue;
    const o = ownedW.get(d.id);
    // an evolved weapon replaces its base: don't offer the base again
    if (!o && P.weapons.some((x) => x.def.evolved && WEAPONS.find((b) => b.evo && b.evo.into === x.def.id)?.id === d.id)) continue;
    if (o) { if (o.lv >= MAX_WEAPON_LV) continue; pool.push([{ kind: 'weapon', id: d.id, lv: o.lv + 1, name: d.name, desc: d.levels[o.lv - 1][0], color: d.color, isNew: false }, 10]); }
    else if (P.weapons.length < MAX_SLOTS) pool.push([{ kind: 'weapon', id: d.id, lv: 1, name: d.name, desc: d.desc, color: d.color, isNew: true }, 6]);
  }
  for (const d of PASSIVES) {
    if (banned.has(d.id)) continue;
    const o = ownedP.get(d.id);
    if (o) { if (o.lv >= d.max) continue; pool.push([{ kind: 'passive', id: d.id, lv: o.lv + 1, name: d.name, desc: d.per, color: d.color, isNew: false }, 8]); }
    else if (P.passives.length < MAX_PASSIVE_SLOTS) {
      // nudge toward passives that would complete an evolution
      const helps = P.weapons.some((x) => x.def.evo && x.def.evo.with === d.id);
      pool.push([{ kind: 'passive', id: d.id, lv: 1, name: d.name, desc: `${d.desc} ${d.per}.`, color: d.color, isNew: true }, helps ? 9 : 5]);
    }
  }
  const out: Choice[] = [];
  const luck = P.stats.luck;
  for (let k = 0; k < n && pool.length; k++) {
    let tot = 0; for (const [c, wt] of pool) tot += wt * (c.isNew ? luck : 1);
    let r = rng.next() * tot; let idx = 0;
    for (let i = 0; i < pool.length; i++) { const [c, wt] = pool[i]; r -= wt * (c.isNew ? luck : 1); if (r <= 0) { idx = i; break; } }
    out.push(pool[idx][0]); pool.splice(idx, 1);
  }
  if (!out.length) {
    out.push({ kind: 'gold', id: 'gold', lv: 0, name: 'Bag of Gold', desc: '+25 gold', color: '#ffd166', isNew: false });
    out.push({ kind: 'heal', id: 'heal', lv: 0, name: 'Rice Ball', desc: 'Heal 40 HP', color: '#5ef38c', isNew: false });
  }
  return out;
}
export function applyChoice(w: World, c: Choice) {
  const P = w.player;
  switch (c.kind) {
    case 'weapon': { const o = P.weapons.find((x) => x.def.id === c.id); if (o) { o.lv++; o.recompute(); } else P.addWeapon(c.id); break; }
    case 'passive': { const o = P.passives.find((x) => x.id === c.id); if (o) o.lv = Math.min(PASSIVE_BY_ID[c.id].max, o.lv + 1); else P.passives.push({ id: c.id, lv: 1 }); P.recompute(); break; }
    case 'evolve': evolve(w, c.id); break;
    case 'gold': w.stats.gold += 25; break;
    case 'heal': w.healPlayer(40); break;
  }
}
export function evolve(w: World, fromId: string) {
  const P = w.player; const wi = P.weapons.find((x) => x.def.id === fromId); if (!wi || !wi.def.evo) return;
  const into = WEAPON_BY_ID[wi.def.evo.into];
  wi.def = into; wi.lv = 1; wi.recompute(); wi.st = 0; wi.cdT = 0.2;
  w.stats.evolutions++;
}
export function evoChoice(w: World, e: { from: string; into: string }): Choice {
  const d = WEAPON_BY_ID[e.into]; void w;
  return { kind: 'evolve', id: e.from, lv: 0, name: d.name, desc: `EVOLUTION! ${WEAPON_BY_ID[e.from].name} + ${PASSIVE_BY_ID[WEAPON_BY_ID[e.from].evo!.with].name}: ${d.desc}`, color: d.color, isNew: true };
}

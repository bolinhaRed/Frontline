// Fog of war por hex: 0 desconhecido, 1 explorado, 2 visível.
import { range, line } from './hex.js';
import { inBounds, idx, blocksVision } from './map.js';
import { UNITS } from '../data/units.js';
import { MODULES } from '../data/modules.js';

export function createFog(m) { return { seen: new Array(m.w * m.h).fill(0) }; }

export function updateFog(state) {
  const { map: m, fog } = state;
  for (let i = 0; i < fog.seen.length; i++) if (fog.seen[i] === 2) fog.seen[i] = 1;
  const viewers = state.units.map(u => ({ c: u.c, r: u.r, R: UNITS[u.type].visao }))
    .concat((state.modules || []).filter(md => md.fase !== 'pod').map(md => ({ c: md.c, r: md.r, R: MODULES[md.type].visao })));
  for (const v of viewers) {
    const from = { c: v.c, r: v.r }, R = v.R;
    for (const p of range(from, R)) {
      if (!inBounds(m, p.c, p.r)) continue;
      const ln = line(from, p);
      let ok = true;
      for (let k = 1; k < ln.length - 1; k++) if (blocksVision(m, ln[k].c, ln[k].r)) { ok = false; break; }
      if (ok) fog.seen[idx(m, p.c, p.r)] = 2;
    }
  }
}

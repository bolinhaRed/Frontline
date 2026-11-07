// Gerador procedimental do mapa de teste. Usa apenas o RNG do estado (determinístico por semente).
import { rngNext, rngInt, rngPick } from '../core/rng.js';
import { createMap, inBounds, setT, getT, T, idx, moveCost } from './map.js';
import { ORE_PER_HEX, GAS_PER_GEYSER } from '../data/modules.js';
import { range, distance, line, neighbors } from './hex.js';

function blob(m, h, center, radius, fn) {
  for (const p of range(center, radius + 1)) {
    if (!inBounds(m, p.c, p.r)) continue;
    const d = distance(center, p);
    if (d <= radius - 1 || (d <= radius + 1 && rngNext(h) < (d <= radius ? 0.65 : 0.2))) fn(p);
  }
}
function walk(m, h, start, len, fn) {
  let p = start;
  for (let i = 0; i < len; i++) {
    if (inBounds(m, p.c, p.r)) fn(p);
    const ns = neighbors(p.c, p.r).filter(n => inBounds(m, n.c, n.r));
    if (!ns.length) break;
    p = rngPick(h, ns);
  }
}
const randHex = (m, h, pad = 2) => ({ c: rngInt(h, pad, m.w - 1 - pad), r: rngInt(h, pad, m.h - 1 - pad) });
const v = h => rngInt(h, 0, 99);

export function generateMap(h, w, hgt, nPortais = 2) {
  const m = createMap(w, hgt);
  for (let r = 0; r < hgt; r++) for (let c = 0; c < w; c++) {
    const x = rngNext(h);
    if (x < 0.06) setT(m, c, r, T.pedregoso, v(h));
    else if (x < 0.10) setT(m, c, r, T.cratera, v(h));
    else setT(m, c, r, T.solo, rngNext(h) < 0.7 ? rngInt(h, 0, 1) : rngInt(h, 2, 4));
  }
  m.start = { c: 5, r: hgt - 6 };
  // Portal principal no canto oposto e um secundário mais perto do centro
  m.portals = [{ c: w - 6, r: 5 }, { c: (w >> 1) + rngInt(h, 0, 4), r: rngInt(h, 3, 6) }];
  if (rngNext(h) < 0.5) m.portals[1] = { c: w - rngInt(h, 6, 9), r: hgt - rngInt(h, 9, 12) };
  if (nPortais >= 3) m.portals.push({ c: w - 7, r: hgt - 6 });
  m.portals = m.portals.slice(0, Math.max(0, nPortais));
  const far = (p, d) => distance(p, m.start) > d && m.portals.every(q => distance(p, q) > d);

  // Regiões de rocha escura com montanhas e lava
  for (let i = 0; i < 5; i++) {
    const c = randHex(m, h, 4); if (!far(c, 7)) continue;
    blob(m, h, c, rngInt(h, 3, 5), p => setT(m, p.c, p.r, T.rocha, v(h)));
    walk(m, h, c, rngInt(h, 4, 8), p => setT(m, p.c, p.r, rngNext(h) < 0.8 ? T.montanha : T.vulcao, v(h)));
    if (rngNext(h) < 0.6) blob(m, h, { c: c.c + rngInt(h, -3, 3), r: c.r + rngInt(h, -3, 3) }, 1, p => far(p, 5) && setT(m, p.c, p.r, T.lava, v(h)));
  }
  // Cordilheiras em solo marciano
  for (let i = 0; i < 4; i++) {
    const s = randHex(m, h, 3); if (!far(s, 6)) continue;
    walk(m, h, s, rngInt(h, 5, 10), p => far(p, 4) && setT(m, p.c, p.r, T.montanha, v(h)));
  }
  // Lago, poça de ácido e tempestades
  const lake = randHex(m, h, 5); if (far(lake, 7)) blob(m, h, lake, 2, p => setT(m, p.c, p.r, T.agua, 0));
  const acid = randHex(m, h, 4); if (far(acid, 6)) blob(m, h, acid, 1, p => setT(m, p.c, p.r, T.acido, v(h)));
  for (let i = 0; i < 3; i++) { const s = randHex(m, h, 3); if (far(s, 5)) blob(m, h, s, 1, p => setT(m, p.c, p.r, T.tempestade, 0)); }

  // Território do Enxame à volta dos portais
  m.portals.forEach((pt, k) => blob(m, h, pt, k === 0 ? 4 : 2, p => setT(m, p.c, p.r, T.creep, v(h))));
  // Zona de aterragem limpa
  for (const p of range(m.start, 3)) if (inBounds(m, p.c, p.r)) setT(m, p.c, p.r, T.solo, rngInt(h, 0, 1));
  setT(m, m.start.c, m.start.r, T.plataforma, 0);

  // Jazidas: uma perto do início, uma no meio, uma perto do Enxame; dois géiseres
  const field = (center, n) => walk(m, h, center, n, p => {
    if (distance(p, m.start) > 2 && m.portals.every(q => distance(p, q) > 1)) setT(m, p.c, p.r, T.cristal, v(h));
  });
  // Jazida garantida a 3 hexes do Núcleo (para nordeste), com 4 hexes de cristal
  let jp = m.start;
  for (let i = 0; i < 3; i++) jp = neighbors(jp.c, jp.r)[1];
  [jp, ...neighbors(jp.c, jp.r).filter(n => distance(n, m.start) >= 3 && distance(n, m.start) <= 4)].slice(0, 4)
    .forEach(p => inBounds(m, p.c, p.r) && setT(m, p.c, p.r, T.cristal, v(h)));
  field({ c: (w >> 1) + rngInt(h, -3, 3), r: (hgt >> 1) + rngInt(h, -3, 3) }, 6);
  const p0 = m.portals[0] || { c: w - 6, r: 5 };   // missões sem portal: jazida no mesmo sítio
  field({ c: p0.c - 5, r: p0.r + 3 }, 5);
  for (let i = 0; i < 2; i++) { const g = randHex(m, h, 3); if (far(g, 4)) setT(m, g.c, g.r, T.geiser, v(h)); }
  // Géiser garantido a 3 hexes do Núcleo (para sudoeste)
  let gp = m.start;
  for (let i = 0; i < 3; i++) gp = neighbors(gp.c, gp.r)[4];
  if (inBounds(m, gp.c, gp.r)) setT(m, gp.c, gp.r, T.geiser, v(h));

  for (const pt of m.portals) setT(m, pt.c, pt.r, T.creep, 0);
  for (let i = 0; i < m.t.length; i++) m.ore[i] = m.t[i] === T.cristal ? ORE_PER_HEX : m.t[i] === T.geiser ? GAS_PER_GEYSER : 0;
  for (const pt of m.portals) ensureReachable(m, pt);
  return m;
}

// Garante que existe caminho entre a zona de aterragem e o portal, abrindo passagem se preciso.
function ensureReachable(m, portal) {
  const goalNs = neighbors(portal.c, portal.r).filter(n => moveCost(m, n.c, n.r) > 0);
  for (let attempt = 0; attempt < 3; attempt++) {
    const seen = new Set([idx(m, m.start.c, m.start.r)]), q = [m.start];
    while (q.length) {
      const p = q.shift();
      for (const n of neighbors(p.c, p.r)) {
        const i = inBounds(m, n.c, n.r) ? idx(m, n.c, n.r) : -1;
        if (i < 0 || seen.has(i) || moveCost(m, n.c, n.r) === 0) continue;
        seen.add(i); q.push(n);
      }
    }
    if (goalNs.some(n => seen.has(idx(m, n.c, n.r)))) return;
    for (const p of line(m.start, portal)) {
      if (p.c === portal.c && p.r === portal.r) continue;
      if (moveCost(m, p.c, p.r) === 0) setT(m, p.c, p.r, T.rocha, 0);
    }
  }
}

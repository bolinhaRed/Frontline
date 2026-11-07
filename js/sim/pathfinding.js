// A* sobre o grafo de hexes, com custo de terreno.
import { neighbors, distance, range } from './hex.js';
import { inBounds, idx, moveCost } from './map.js';

class Heap {
  constructor() { this.a = []; }
  push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < a.length && a[l].f < a[s].f) s = l; if (r < a.length && a[r].f < a[s].f) s = r; if (s === i) break; [a[s], a[i]] = [a[i], a[s]]; i = s; } } return top; }
  get size() { return this.a.length; }
}

// Se o destino é intransitável, escolhe o hex transitável mais próximo do destino e da origem.
export function nearestWalkable(m, goal, from) {
  if (moveCost(m, goal.c, goal.r) > 0) return goal;
  for (let rad = 1; rad <= 6; rad++) {
    let best = null, bd = Infinity;
    for (const p of range(goal, rad)) {
      if (distance(p, goal) !== rad || moveCost(m, p.c, p.r) === 0) continue;
      const d = distance(p, from);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) return best;
  }
  return null;
}

// blocked: Set de índices de hexes a evitar (unidades paradas), exceto o destino.
export function findPath(m, start, goalIn, blocked = null, maxNodes = 6000) {
  const goal = nearestWalkable(m, goalIn, start);
  if (!goal) return [];
  const gi = idx(m, goal.c, goal.r), si = idx(m, start.c, start.r);
  if (gi === si) return [];
  const g = new Map([[si, 0]]), came = new Map(), open = new Heap(), closed = new Set();
  open.push({ c: start.c, r: start.r, i: si, f: distance(start, goal) });
  let n = 0;
  while (open.size && n++ < maxNodes) {
    const cur = open.pop();
    if (cur.i === gi) {
      const path = []; let k = gi;
      while (k !== si) { path.push({ c: k % m.w, r: Math.floor(k / m.w) }); k = came.get(k); }
      return path.reverse();
    }
    if (closed.has(cur.i)) continue;
    closed.add(cur.i);
    for (const nb of neighbors(cur.c, cur.r)) {
      if (!inBounds(m, nb.c, nb.r)) continue;
      const cost = moveCost(m, nb.c, nb.r);
      if (!cost) continue;
      const ni = idx(m, nb.c, nb.r);
      if (blocked && ni !== gi && blocked.has(ni)) continue;
      const ng = g.get(cur.i) + cost;
      if (ng < (g.get(ni) ?? Infinity)) {
        g.set(ni, ng); came.set(ni, cur.i);
        open.push({ c: nb.c, r: nb.r, i: ni, f: ng + distance(nb, goal) });
      }
    }
  }
  return [];
}

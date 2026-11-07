// Unidades: criação, ocupação de hexes e movimento hex a hex.
// Regra de ocupação: cada mech ocupa o hex onde está e, enquanto se desloca, também o hex para onde vai.
import { centerX, centerY, HEX_W, range, distance } from './hex.js';
import { moveCost, idx, inBounds } from './map.js';
import { findPath } from './pathfinding.js';
import { UNITS, stat } from '../data/units.js';
import { TICK_HZ } from '../core/loop.js';
import { get, nearestHostile, fire } from './combat.js';

export function createUnit(state, type, c, r) {
  const u = { id: state.nextId++, type, c, r, x: centerX(c, r), y: centerY(c, r), px: 0, py: 0, dir: 0,
    path: [], leg: null, goal: null, wait: 0, patrol: null, moving: false,
    hp: stat(state, type, 'vida'), cd: 0, target: null, autoTarget: false, amGoal: null, hold: false, firing: -99 };
  u.px = u.x; u.py = u.y;
  state.units.push(u);
  return u;
}

export const isIdle = u => !u.leg && !u.path.length;

export function buildOccupancy(state) {
  const m = state.map, occ = new Map();
  for (const u of state.units) {
    occ.set(idx(m, u.c, u.r), u.id);
    if (u.leg) occ.set(idx(m, u.leg.c, u.leg.r), u.id);
  }
  return occ;
}

function blockedBy(state, self, onlyIdle) {
  const m = state.map, set = new Set();
  for (const o of state.units) {
    if (o.id === self.id || (onlyIdle && !isIdle(o))) continue;
    set.add(idx(m, o.c, o.r));
    if (o.leg) set.add(idx(m, o.leg.c, o.leg.r));
  }
  return set;
}

export function orderMove(state, u, goal) {
  u.goal = { c: goal.c, r: goal.r };
  u.wait = 0;
  const from = u.leg || u;
  u.path = findPath(state.map, { c: from.c, r: from.r }, goal, blockedBy(state, u, true));
  // rodeada de unidades paradas: segue o caminho livre do terreno e espera que as outras saiam
  if (!u.path.length) u.path = findPath(state.map, { c: from.c, r: from.r }, goal);
}

// Destinos distintos para um grupo: o hex pedido e os anéis à volta, atribuídos ao mech mais próximo.
export function groupDestinations(state, units, target) {
  const m = state.map, ids = new Set(units.map(u => u.id));
  const taken = new Set(state.units.filter(o => !ids.has(o.id) && isIdle(o)).map(o => idx(m, o.c, o.r)));
  const cands = [];
  for (let rad = 0; rad <= 8 && cands.length < units.length; rad++) {
    for (const p of range(target, rad)) {
      if (distance(p, target) !== rad || !inBounds(m, p.c, p.r) || !moveCost(m, p.c, p.r) || taken.has(idx(m, p.c, p.r))) continue;
      cands.push(p);
    }
  }
  const left = units.slice(), out = new Map();
  for (const p of cands) {
    if (!left.length) break;
    let bi = 0, bd = Infinity;
    left.forEach((u, i) => { const d = distance(u, p); if (d < bd) { bd = d; bi = i; } });
    out.set(left[bi].id, p);
    left.splice(bi, 1);
  }
  for (const u of left) out.set(u.id, target); // mapa sem espaço: vão o mais perto possível
  return out;
}

// Combate do mech. Devolve true se está a disparar (nesse caso não avança para o hex seguinte).
function combatTick(s, u) {
  const D = UNITS[u.type], alcance = stat(s, u.type, 'alcance');
  if (!D.dano) return false;            // colonos não combatem
  if (u.cd > 0) u.cd--;
  let t = get(s, u.target);
  if (!t) { u.target = null; t = null; }
  if (!t) {
    const r = u.hold ? alcance : (isIdle(u) || u.amGoal || u.patrol) ? Math.max(D.aggro, alcance) : 0;
    const n = r ? nearestHostile(s, u, r, 'colonia') : null;
    if (n) { u.target = n.ref; u.autoTarget = true; t = n.ent; }
  }
  if (!t) return false;
  const d = distance(u, t);
  if (u.autoTarget && d > D.aggro + 3) { u.target = null; return false; }
  if (d <= alcance) {
    const tx = (u.target.k === 'p') ? centerX(t.c, t.r) : t.x, ty = (u.target.k === 'p') ? centerY(t.c, t.r) : t.y;
    u.dir = Math.atan2(ty - u.y, tx - u.x);
    if (u.cd <= 0) { fire(s, { k: 'u', id: u.id }, u, u.target, D.dano, D.tiro, { area: D.area, perfura: D.perfura }); u.cd = D.recarga; }
    u.firing = s.tick;
    return true;
  }
  if (u.hold) { u.target = null; return false; }
  if (!u.leg && (!u.path.length || (s.tick + u.id) % 10 === 0)) {     // perseguir
    u.goal = { c: t.c, r: t.r };
    u.path = findPath(s.map, { c: u.c, r: u.r }, u.goal, blockedBy(s, u, true));
  }
  return false;
}

export const REGEN_DELAY = 6 * TICK_HZ, REGEN_PER_S = 2;   // as unidades da Colónia recuperam 2 de vida/s ao fim de 6 s sem dano
export function updateUnit(state, u, occ) {
  const m = state.map;
  u.px = u.x; u.py = u.y;
  const maxHp = UNITS[u.type].vida;
  if (u.hp < maxHp && state.tick - (u.hitT || 0) > REGEN_DELAY) u.hp = Math.min(maxHp, u.hp + REGEN_PER_S / TICK_HZ);
  const engaged = combatTick(state, u);
  // Atacar-mover: depois de limpar a zona, retoma o caminho
  if (!engaged && !u.target && u.amGoal && isIdle(u)) {
    if (u.c === u.amGoal.c && u.r === u.amGoal.r) u.amGoal = null;
    else { orderMove(state, u, u.amGoal); if (!u.path.length) u.amGoal = null; }
  }

  // Tentar ocupar o próximo hex do caminho
  if (!u.leg && u.path.length && !engaged) {
    const n = u.path[0], ni = idx(m, n.c, n.r), owner = occ.get(ni);
    if (!moveCost(m, n.c, n.r)) {                                                 // construíram algo no caminho
      u.path = u.goal ? findPath(m, { c: u.c, r: u.r }, u.goal, blockedBy(state, u, true)) : [];
    } else if (owner === undefined || owner === u.id) {
      u.leg = n; u.path.shift(); occ.set(ni, u.id); u.wait = 0;
    } else {
      u.wait++;
      const other = state.units.find(o => o.id === owner);
      if (u.path.length === 1 && other && isIdle(other)) u.path = [];          // destino ocupado: fica ao lado
      else if (u.wait === 6 || u.wait === 24) {                                   // contornar quem está no caminho
        const p = findPath(m, { c: u.c, r: u.r }, u.goal, blockedBy(state, u, false));
        if (p.length) u.path = p;
      } else if (u.wait > 60) u.path = [];                                        // desiste ao fim de 3 s
    }
  }

  // Deslocação até ao centro do hex reservado
  if (u.leg) {
    const tx = centerX(u.leg.c, u.leg.r), ty = centerY(u.leg.c, u.leg.r);
    const dx = tx - u.x, dy = ty - u.y, dist = Math.hypot(dx, dy);
    const cost = Math.max(1, moveCost(m, u.leg.c, u.leg.r));
    const step = UNITS[u.type].velocidade * HEX_W / TICK_HZ / cost;
    if (dist > 0.001) u.dir = Math.atan2(dy, dx);
    if (dist <= step) {
      u.x = tx; u.y = ty;
      const fi = idx(m, u.c, u.r);
      if (occ.get(fi) === u.id) occ.delete(fi);
      u.c = u.leg.c; u.r = u.leg.r; u.leg = null;
    } else { u.x += dx / dist * step; u.y += dy / dist * step; }
  }

  // Patrulha: ao chegar a uma ponta, segue para a outra
  if (isIdle(u) && u.patrol && !u.target) {
    const p = u.patrol;
    u.patrol = { from: p.to, to: p.from };
    orderMove(state, u, u.patrol.to);
  }
  u.moving = !!u.leg;
}

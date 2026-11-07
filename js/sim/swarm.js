// O Enxame: creep que alastra, guardas dos portais, vagas e comportamento de cada inseto.
import { ENEMIES, SWARM } from '../data/enemies.js';
import { TICK_HZ } from '../core/loop.js';
import { rngNext, rngPick } from '../core/rng.js';
import { centerX, centerY, HEX_W, neighbors, range, distance, pixelToHex } from './hex.js';
import { inBounds, idx, getT, setT, T, moveCost } from './map.js';
import { findPath } from './pathfinding.js';
import { get, nearestHostile, damage } from './combat.js';
import { log, ev } from './log.js';

export function spawnEnemy(s, type, portal, mode) {
  const ns = neighbors(portal.c, portal.r).filter(n => moveCost(s.map, n.c, n.r));
  const p = ns.length ? ns[Math.floor(rngNext(s) * ns.length)] : portal;
  const e = { id: s.nextId++, type, c: p.c, r: p.r, x: centerX(p.c, p.r), y: centerY(p.c, p.r), px: 0, py: 0, dir: Math.PI / 2,
    path: [], leg: null, hp: ENEMIES[type].vida, cd: 0, target: null, mode, homeId: portal.id, home: { c: portal.c, r: portal.r },
    delay: mode === 'vaga' ? 40 : 0, atk: -99, moving: false };
  e.px = e.x; e.py = e.y;
  s.enemies.push(e);
  return e;
}

// Próximo alvo de uma vaga: o módulo da Colónia mais próximo.
function pickTarget(s, e) {
  if (s.mission && s.mission.tipo === 'defender') { const p = s.modules.find(m => m.type === 'plataforma'); if (p) return p; }
  let best = null, bd = Infinity;
  for (const md of s.modules) { const d = distance(e, md); if (d < bd || (d === bd && md.id < best.id)) { bd = d; best = md; } }
  return best;
}

export function enemyStep(s, e) {
  const m = s.map, D = ENEMIES[e.type];
  e.px = e.x; e.py = e.y; e.moving = false;
  if (e.cd > 0) e.cd--;
  if (e.delay > 0) { e.delay--; return; }
  let t = get(s, e.target);
  if (!t) { e.target = null; t = null; }
  if (!t) {
    const n = nearestHostile(s, e, e.mode === 'guarda' ? SWARM.aggroGuarda : SWARM.aggroVaga, 'enxame');
    if (n) { e.target = n.ref; t = n.ent; e.path = []; }
  }
  if (t) {
    const d = distance(e, t);
    if (d <= D.alcance && !e.leg) {
      const tx = e.target.k === 'm' ? centerX(t.c, t.r) : t.x, ty = e.target.k === 'm' ? centerY(t.c, t.r) : t.y;
      e.dir = Math.atan2(ty - e.y, tx - e.x);
      if (e.cd <= 0) { damage(s, e.target, D.dano, { k: 'e', id: e.id }); e.cd = D.recarga; e.atk = s.tick; }
      return;
    }
    if (e.mode === 'guarda' && distance(e, e.home) > SWARM.aggroGuarda + 3) { e.target = null; e.path = findPath(m, e, e.home); }
    else if (!e.leg && (!e.path.length || (s.tick + e.id) % 15 === 0)) e.path = findPath(m, { c: e.c, r: e.r }, { c: t.c, r: t.r });
  } else if (e.mode === 'vaga' && !e.leg && !e.path.length) {
    const tgt = pickTarget(s, e);
    if (tgt) e.path = findPath(m, { c: e.c, r: e.r }, { c: tgt.c, r: tgt.r });
  }
  // Deslocação hex a hex (os insetos não reservam hexes entre si)
  if (!e.leg && e.path.length) {
    const n = e.path[0];
    if (moveCost(m, n.c, n.r)) { e.leg = n; e.path.shift(); } else e.path = [];
  }
  if (e.leg) {
    const tx = centerX(e.leg.c, e.leg.r), ty = centerY(e.leg.c, e.leg.r);
    const dx = tx - e.x, dy = ty - e.y, dist = Math.hypot(dx, dy);
    const cost = getT(m, e.leg.c, e.leg.r) === T.creep ? 0.8 : Math.max(1, moveCost(m, e.leg.c, e.leg.r));
    const step = D.velocidade * HEX_W / TICK_HZ / cost;
    if (dist > 0.001) e.dir = Math.atan2(dy, dx);
    if (dist <= step) { e.x = tx; e.y = ty; e.c = e.leg.c; e.r = e.leg.r; e.leg = null; }
    else { e.x += dx / dist * step; e.y += dy / dist * step; }
    e.moving = true;
  }
}

function spreadCreep(s, portal) {
  const m = s.map, raio = Math.min(SWARM.creepRaioMax, 3 + Math.floor(s.tick / (60 * TICK_HZ)));
  const cands = [];
  for (const p of range(portal, raio)) {
    if (!inBounds(m, p.c, p.r) || getT(m, p.c, p.r) === T.creep || !moveCost(m, p.c, p.r) || getT(m, p.c, p.r) === T.cristal) continue;
    if (neighbors(p.c, p.r).some(n => inBounds(m, n.c, n.r) && getT(m, n.c, n.r) === T.creep)) cands.push(p);
  }
  if (cands.length) { const p = rngPick(s, cands); setT(m, p.c, p.r, T.creep, p.c + p.r); s.modRev++; }
}

export function swarmStep(s) {
  const sw = s.swarm;
  if (s.tick % (SWARM.creepCada * TICK_HZ) === 0) for (const p of s.portals) spreadCreep(s, p);
  for (const p of s.portals) {
    const guards = s.enemies.filter(e => e.homeId === p.id && e.mode === 'guarda').length;
    if (guards < SWARM.guardas && (s.tick + p.id * 37) % (12 * TICK_HZ) === 0) spawnEnemy(s, 'massa', p, 'guarda');
  }
  if (sw.cfg && s.tick >= sw.next && s.portals.length) {
    sw.wave++;
    const creep = s.map.t.reduce((a, t) => a + (t === T.creep ? 1 : 0), 0);
    let pts = Math.round((sw.wave * 3 - 1 + Math.floor(creep / 25) + (s.portals.length - 1)) * (sw.cfg.mult || 1));
    let k = 0;
    while (pts > 0) {
      const x = rngNext(s);
      const type = sw.wave >= 3 && pts >= 6 && x < 0.3 ? 'bruto' : pts >= 2 && x < 0.55 ? 'larva' : 'massa';
      spawnEnemy(s, type, s.portals[k++ % s.portals.length], 'vaga');
      pts -= ENEMIES[type].pontos;
    }
    sw.next = s.tick + Math.max(sw.cfg.min, sw.cfg.intervalo - 5 * (sw.wave - 1)) * TICK_HZ;
    log(s, `Vaga ${sw.wave} do Enxame a caminho`);
    ev(s, 'vaga');
  }
}

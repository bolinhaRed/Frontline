// Missões: preparação do mapa conforme a configuração e verificação dos objetivos.
import { range, distance, line, neighbors } from './hex.js';
import { inBounds, idx, moveCost } from './map.js';
import { placeActive, territory } from './economy.js';
import { createUnit } from './units.js';
import { spawnEnemy } from './swarm.js';
import { PORTAL, SWARM } from '../data/enemies.js';
import { TICK_HZ } from '../core/loop.js';
import { log, ev } from './log.js';

const free = (s, p) => inBounds(s.map, p.c, p.r) && moveCost(s.map, p.c, p.r) > 0 && !s.units.some(u => u.c === p.c && u.r === p.r);

// Hexes transitáveis alcançáveis a partir do início (para escolher alvos que se possam atingir)
function reachable(s) {
  const m = s.map, seen = new Set([idx(m, m.start.c, m.start.r)]), q = [m.start], out = [];
  while (q.length) {
    const p = q.shift(); out.push(p);
    for (const n of neighbors(p.c, p.r)) {
      if (!inBounds(m, n.c, n.r)) continue;
      const i = idx(m, n.c, n.r);
      if (seen.has(i) || !moveCost(m, n.c, n.r)) continue;
      seen.add(i); q.push(n);
    }
  }
  return out;
}
// Hex mais afastado do início dentro de um intervalo de distâncias, longe dos portais
function farSpot(s, cands, dmin, dmax) {
  let best = null, bd = -1;
  for (const p of cands) {
    const d = distance(p, s.map.start);
    if (d < dmin || d > dmax || s.map.portals.some(q => distance(p, q) < 6)) continue;
    if (d > bd || (d === bd && idx(s.map, p.c, p.r) < idx(s.map, best.c, best.r))) { bd = d; best = p; }
  }
  return best;
}
function guards(s, at, kinds) {
  const home = { id: 0, c: at.c, r: at.r };
  for (const k of kinds) spawnEnemy(s, k, home, 'guarda');
}

export function setupMission(s, cfg) {
  const m = s.map, st = m.start;
  s.mission = { tipo: cfg.objetivo.tipo, minimo: cfg.objetivo.minimo || 0, segundos: cfg.objetivo.segundos || 0, salvos: 0, alvo: null, alvoId: 0 };
  if (cfg.base) placeActive(s, 'nucleo', st.c, st.r);
  // Unidades à volta do ponto de partida
  const spots = [];
  for (let d = 1; d <= 3; d++) for (const p of range(st, d)) if (distance(p, st) === d) spots.push(p);
  for (const [type, n] of cfg.unidades) for (let i = 0; i < n; i++) {
    const p = spots.find(q => free(s, q) && !(cfg.base && q.c === st.c && q.r === st.r));
    if (p) createUnit(s, type, p.c, p.r);
  }
  // Portais e guardas
  for (const pt of m.portals) {
    const p = { id: s.nextId++, c: pt.c, r: pt.r, hp: PORTAL.vida };
    s.portals.push(p);
    m.s[idx(m, p.c, p.r)] = -p.id;
  }
  for (const p of s.portals) for (let i = 0; i < SWARM.guardas; i++) spawnEnemy(s, 'massa', p, 'guarda');
  // Plataforma a defender
  if (cfg.plataforma) {
    const toward = s.portals[0] || st;
    const p = range(st, 3).filter(q => distance(q, st) === 3 && free(s, q)).sort((a, b) => distance(a, toward) - distance(b, toward))[0];
    if (p) placeActive(s, 'plataforma', p.c, p.r);
  }
  const reach = (cfg.objetivo.tipo === 'chegar' || cfg.colonos || cfg.emboscadas) ? reachable(s) : [];
  if (cfg.objetivo.tipo === 'destruir' && s.portals.length) { s.mission.alvoId = s.portals[0].id; s.mission.alvo = { c: s.portals[0].c, r: s.portals[0].r }; }
  if (cfg.objetivo.tipo === 'chegar') s.mission.alvo = farSpot(s, reach, 14, 99);
  // Colonos isolados, guardados por insetos
  if (cfg.colonos) {
    const at = farSpot(s, reach, 12, 18) || farSpot(s, reach, 8, 99);
    s.mission.colonosEm = at;
    let n = 0;
    for (let d = 0; d <= 2 && n < cfg.colonos; d++) for (const p of range(at, d)) if (distance(p, at) === d && free(s, p) && n < cfg.colonos) { createUnit(s, 'colono', p.c, p.r); n++; }
    // guardas a 8 hexes, do lado de onde vem a escolta: não atacam os colonos se ninguém se aproximar
    const g = range(at, 8).filter(p => distance(p, at) === 8 && free(s, p)).sort((a, b) => distance(a, st) - distance(b, st));
    if (g.length) guards(s, g[0], ['massa', 'massa', 'larva']);
    if (g.length > 6) guards(s, g[Math.floor(g.length / 3)], ['massa', 'larva']);
  }
  // O objetivo fica marcado como explorado no mapa
  for (const at of [s.mission.alvo, s.mission.colonosEm]) if (at) for (const p of range(at, 1)) if (inBounds(m, p.c, p.r)) s.fog.seen[idx(m, p.c, p.r)] = 1;
  // Emboscadas pelo caminho
  if (cfg.emboscadas && s.mission.alvo) {
    const ln = line(st, s.mission.alvo);
    for (let k = 0; k < cfg.emboscadas; k++) {
      const p0 = ln[Math.floor(ln.length * (0.35 + 0.25 * k))] || s.mission.alvo;
      const p = range(p0, 2).find(q => free(s, q));
      if (p) guards(s, p, [['massa', 'massa'], ['massa', 'larva'], ['massa', 'massa', 'larva']][Math.min(k, 2)]);
    }
  }
}

export const EVAC_RAIO = 4;   // os colonos ficam a salvo dentro do território da base (ou a até 4 hexes do Núcleo)

function win(s) { if (!s.result) { s.result = 'vitoria'; ev(s, 'vitoria'); } }
function lose(s) { if (!s.result) { s.result = 'derrota'; ev(s, 'derrota'); } }

export function objectiveStep(s) {
  const M = s.mission;
  if (!M || s.result) return;
  const fighters = s.units.filter(u => u.type !== 'colono');
  if (!s.cfg.base && !fighters.length) { lose(s); return; }
  switch (M.tipo) {
    case 'chegar':
      if (M.alvo && fighters.some(u => distance(u, M.alvo) <= 1)) win(s);
      break;
    case 'sobreviver': case 'defender':
      if (s.tick >= M.segundos * TICK_HZ) win(s);
      break;
    case 'destruir':
      if (!s.portals.some(p => p.id === M.alvoId)) win(s);
      break;
    case 'escoltar': {
      for (const u of s.units.slice()) {
        if (u.type !== 'colono' || (distance(u, s.map.start) > EVAC_RAIO && !territory(s)[idx(s.map, u.c, u.r)])) continue;
        s.units.splice(s.units.indexOf(u), 1);
        M.salvos++;
        log(s, `Colono a salvo (${M.salvos}/${M.minimo})`);
        ev(s, 'modulo_pronto', u.x, u.y);
      }
      const vivos = s.units.filter(u => u.type === 'colono').length;
      if (M.salvos >= M.minimo) win(s);
      else if (M.salvos + vivos < M.minimo) lose(s);
      break;
    }
  }
}

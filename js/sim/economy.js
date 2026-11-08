// Economia, construção e tecnologia: território, energia, população, cristal e gás,
// drop pods, produção no Quartel e no Hangar e investigação no Laboratório.
import { MODULES, POD_TICKS, QUEUE_MAX, ORBITAL } from '../data/modules.js';
import { UNITS } from '../data/units.js';
import { RESEARCH } from '../data/research.js';
import { TICK_HZ } from '../core/loop.js';
import { range, neighbors, centerX, centerY, distance } from './hex.js';
import { inBounds, idx, getT, T, terrainDef, moveCost } from './map.js';
import { createUnit, orderMove } from './units.js';
import { log, ev } from './log.js';
export { log };

const cache = new WeakMap();
// Hexes de território (array 0/1), recalculado só quando os módulos mudam.
export function territory(s) {
  const c = cache.get(s);
  if (c && c.rev === s.modRev) return c.t;
  const m = s.map, t = new Array(m.w * m.h).fill(0);
  for (const md of s.modules) {
    if (md.fase === 'pod') continue;
    for (const p of range(md, MODULES[md.type].territorio)) if (inBounds(m, p.c, p.r)) t[idx(m, p.c, p.r)] = 1;
  }
  cache.set(s, { rev: s.modRev, t });
  return t;
}

export const moduleAt = (s, c, r) => { const id = inBounds(s.map, c, r) ? s.map.s[idx(s.map, c, r)] : 0; return id > 0 ? s.modules.find(m => m.id === id) : null; };

// --- Tecnologia ---
// s.tech.allowed: lista do que a campanha permite (null = tudo, como na escaramuça)
export const allowed = (s, id) => !s.tech.allowed || s.tech.allowed.includes(id);
export const hasBuilding = (s, type) => s.modules.some(m => m.type === type && m.fase === 'ativo');
export const researched = (s, id) => s.tech.done.includes(id);
// Devolve null se os requisitos estão cumpridos, ou o texto do que falta
export function missing(s, req) {
  if (!req) return null;
  if (typeof req === 'string') return researched(s, req) ? null : `Requer investigação: ${RESEARCH[req].nome}`;
  if (req.edificio && !hasBuilding(s, req.edificio)) return `Requer ${MODULES[req.edificio].nome}`;
  if (req.pesquisa && !researched(s, req.pesquisa)) return `Requer investigação: ${RESEARCH[req.pesquisa].nome}`;
  return null;
}
const pay = (s, d) => { s.res.cristal -= d.custo || 0; s.res.gas -= d.gas || 0; };
const refund = (s, d) => { s.res.cristal += d.custo || 0; s.res.gas += d.gas || 0; };
const short = (s, d) => s.res.cristal < (d.custo || 0) ? 'Cristal insuficiente' : s.res.gas < (d.gas || 0) ? 'Gás insuficiente' : null;

// --- Apoio orbital ---
export function canOrbital(s, c, r) {
  if (!allowed(s, 'orbital') || !s.modules.some(m => m.type === 'nucleo')) return 'Sem ligação à nave-mãe';
  if (s.tick < s.orbital.pronto) return `A nave-mãe está a recarregar (${Math.ceil((s.orbital.pronto - s.tick) / TICK_HZ)} s)`;
  if (s.res.cristal < ORBITAL.custo) return 'Cristal insuficiente';
  if (c !== undefined && !inBounds(s.map, c, r)) return 'Fora do mapa';
  return null;
}
export function orderOrbital(s, c, r) {
  const why = canOrbital(s, c, r);
  if (why) { log(s, why); return; }
  s.res.cristal -= ORBITAL.custo;
  s.orbital.pronto = s.tick + ORBITAL.recarga * TICK_HZ;
  s.orbital.alvos.push({ c, r, t: s.tick + ORBITAL.atraso });
  ev(s, 'pod_queda', centerX(c, r), centerY(c, r));
}

// --- Construção ---
export function canBuild(s, type, c, r) {
  const def = MODULES[type], m = s.map;
  if (!def || def.construivel === false || !allowed(s, type)) return 'Não se pode construir';
  const req = missing(s, def.requer); if (req) return req;
  if (!inBounds(m, c, r)) return 'Fora do mapa';
  const i = idx(m, c, r);
  if (!territory(s)[i]) return 'Fora do território';
  if (m.s[i] !== 0) return 'Hex já ocupado';
  const t = getT(m, c, r);
  if (def.sobre === 'cristal') { if (t !== T.cristal || m.ore[i] <= 0) return 'O extrator tem de ficar sobre cristais'; }
  else if (def.sobre === 'geiser') { if (t !== T.geiser || m.ore[i] <= 0) return 'A refinaria tem de ficar sobre um géiser'; }
  else if (t === T.creep) return 'O creep do Enxame impede a construção';
  else if (!terrainDef(t).custo) return 'Terreno impróprio';
  if (s.units.some(u => (u.c === c && u.r === r) || (u.leg && u.leg.c === c && u.leg.r === r))) return 'Há uma unidade nesse hex';
  return short(s, def);
}

export function build(s, type, c, r) {
  const why = canBuild(s, type, c, r);
  if (why) { log(s, why); return null; }
  const md = { id: s.nextId++, type, c, r, fase: 'pod', t: 0, fila: [], prog: 0, hp: MODULES[type].vida, cd: 0 };
  pay(s, MODULES[type]);
  s.modules.push(md);
  s.map.s[idx(s.map, c, r)] = md.id;
  s.modRev++;
  ev(s, 'pod_queda', centerX(c, r), centerY(c, r));
  return md;
}

export function placeActive(s, type, c, r) {
  const md = { id: s.nextId++, type, c, r, fase: 'ativo', t: 0, fila: [], prog: 0, hp: MODULES[type].vida, cd: 0 };
  s.modules.push(md); s.map.s[idx(s.map, c, r)] = md.id; s.modRev++;
  return md;
}

// --- Produção de unidades ---
// O que está na fila depende do edifício: o Laboratório tem investigação, o Quartel e o Hangar unidades
// (há investigação e unidades com o mesmo nome interno, como 'metralhador')
export const itemDef = (md, it) => MODULES[md.type].pesquisa ? RESEARCH[it] : UNITS[it];
const queuedPop = s => s.modules.reduce((a, md) => a + (MODULES[md.type].pesquisa ? 0 : md.fila.reduce((b, it) => b + UNITS[it].pop, 0)), 0);

export function canTrain(s, md, type) {
  const d = md && MODULES[md.type];
  if (!d || md.fase !== 'ativo' || !d.produz || !d.produz.includes(type)) return 'Este módulo não produz essa unidade';
  const u = UNITS[type];
  if (!allowed(s, type)) return 'Ainda não disponível nesta missão';
  const req = missing(s, u.requer); if (req) return req;
  if (md.fila.length >= QUEUE_MAX) return 'Fila cheia';
  const sh = short(s, u); if (sh) return sh;
  if (s.pop.used + queuedPop(s) + u.pop > s.pop.cap) return 'População no máximo: constrói uma Cúpula';
  return null;
}
export function train(s, md, type) {
  const why = canTrain(s, md, type);
  if (why) { log(s, why); return; }
  pay(s, UNITS[type]);
  md.fila.push(type);
}

// --- Investigação ---
export function canResearch(s, md, id) {
  const r = RESEARCH[id];
  if (!md || md.fase !== 'ativo' || !MODULES[md.type].pesquisa || !r) return 'Só o Laboratório investiga';
  if (!allowed(s, id)) return 'Ainda não disponível nesta missão';
  if (researched(s, id)) return 'Já investigado';
  if (s.modules.some(m => m.fila.includes(id))) return 'Já em investigação';
  const req = missing(s, r.requer); if (req) return req;
  if (md.fila.length >= 3) return 'Fila cheia';
  return short(s, r);
}
export function research(s, md, id) {
  const why = canResearch(s, md, id);
  if (why) { log(s, why); return; }
  pay(s, RESEARCH[id]);
  md.fila.push(id);
}

export function cancelQueue(s, md) {
  if (!md || !md.fila.length) return;
  const it = md.fila.pop();
  refund(s, itemDef(md, it));
  if (!md.fila.length) md.prog = 0;
}

const itemTime = (md, it) => itemDef(md, it).tempo * TICK_HZ;
export const queueProgress = md => md.fila.length ? md.prog / itemTime(md, md.fila[0]) : 0;

export function economyStep(s) {
  const m = s.map;
  let prod = 0, cons = 0, cap = 0;
  for (const md of s.modules) {
    if (md.fase !== 'ativo') continue;
    const d = MODULES[md.type];
    if (d.energia > 0) prod += d.energia; else cons -= d.energia;
    cap += d.pop || 0;
  }
  const ratio = cons ? Math.min(1, prod / cons) : 1;
  s.power = { prod, cons, ratio };
  s.pop = { used: s.units.reduce((a, u) => a + UNITS[u.type].pop, 0), cap };

  for (const md of s.modules) {
    const d = MODULES[md.type];
    if (md.fase === 'pod') {
      if (++md.t >= POD_TICKS) { md.fase = 'obra'; md.t = 0; s.modRev++; ev(s, 'pod_aterra', centerX(md.c, md.r), centerY(md.c, md.r)); }
      continue;
    }
    if (md.fase === 'obra') {
      if (++md.t >= d.tempo * TICK_HZ) { md.fase = 'ativo'; md.t = 0; s.modRev++; log(s, `${d.nome} concluído`); ev(s, 'modulo_pronto', centerX(md.c, md.r), centerY(md.c, md.r)); }
      continue;
    }
    if (d.taxa || d.taxaGas) {
      const i = idx(m, md.c, md.r), take = Math.min(m.ore[i], (d.taxa || d.taxaGas) / TICK_HZ * ratio);
      m.ore[i] -= take;
      if (d.taxa) s.res.cristal += take; else s.res.gas += take;
      if (m.ore[i] <= 0 && take > 0) { m.ore[i] = 0; log(s, d.taxa ? 'Uma jazida de cristal esgotou-se' : 'Um géiser esgotou-se'); }
      continue;
    }
    if (!md.fila.length) continue;
    const it = md.fila[0];
    if (md.prog < itemTime(md, it)) { md.prog += ratio; continue; }
    if (d.pesquisa) {                                   // investigação concluída
      s.tech.done.push(it); md.fila.shift(); md.prog = 0; s.modRev++;
      log(s, `Investigação concluída: ${RESEARCH[it].nome}`);
      ev(s, 'modulo_pronto', centerX(md.c, md.r), centerY(md.c, md.r));
      continue;
    }
    // hex livre mais próximo (até 3 hexes), para a produção não encravar com a base cheia à volta
    const busy = n => s.units.some(o => (o.c === n.c && o.r === n.r) || (o.leg && o.leg.c === n.c && o.leg.r === n.r));
    let spot = null;
    for (let d = 1; d <= 3 && !spot; d++) spot = range(md, d).find(n => distance(n, md) === d && inBounds(m, n.c, n.r) && moveCost(m, n.c, n.r) && !busy(n));
    if (!spot) { md.bloqueado = true; continue; }
    md.bloqueado = false;
    const nu = createUnit(s, md.fila.shift(), spot.c, spot.r);
    if (md.rally) orderMove(s, nu, md.rally);                 // ponto de encontro
    md.prog = 0;
    s.pop.used += UNITS[it].pop;
    log(s, `${UNITS[it].nome} pronto`);
    ev(s, 'mech_pronto', centerX(md.c, md.r), centerY(md.c, md.r));
  }
}

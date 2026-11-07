// Combate: referências a entidades, dano, morte, projéteis, efeitos e torres.
// Referência = { k, id } com k: 'u' mech, 'e' inimigo, 'm' módulo, 'p' portal.
import { centerX, centerY, distance, range } from './hex.js';
import { idx, setT, T } from './map.js';
import { UNITS, stat } from '../data/units.js';
import { ENEMIES, PORTAL } from '../data/enemies.js';
import { MODULES } from '../data/modules.js';
import { log, ev } from './log.js';

const LIST = { u: 'units', e: 'enemies', m: 'modules', p: 'portals' };
export const get = (s, ref) => ref ? s[LIST[ref.k]].find(x => x.id === ref.id) || null : null;
export const posOf = (k, ent) => (k === 'm' || k === 'p') ? { x: centerX(ent.c, ent.r), y: centerY(ent.c, ent.r) - 4 } : { x: ent.x, y: ent.y - 2 };
export function maxHp(k, ent) {
  if (k === 'u') return UNITS[ent.type].vida;
  if (k === 'e') return ENEMIES[ent.type].vida;
  if (k === 'm') return MODULES[ent.type].vida;
  return PORTAL.vida;
}
const armorOf = (s, k, ent) => k === 'u' ? stat(s, ent.type, 'armadura') : k === 'e' ? ENEMIES[ent.type].armadura : k === 'm' ? (MODULES[ent.type].armadura || 0) : 0;

// Alvo hostil mais próximo dentro de um raio (em hexes). side 'colonia' procura Enxame e vice-versa.
export function nearestHostile(s, from, radius, side) {
  const lists = side === 'colonia' ? [['e', s.enemies], ['p', s.portals]] : [['u', s.units], ['m', s.modules]];
  let best = null, bd = radius + 1;
  for (const [k, arr] of lists) for (const ent of arr) {
    const d = distance(from, ent);
    if (d < bd || (d === bd && best && ent.id < best.ent.id)) { bd = d; best = { ref: { k, id: ent.id }, ent }; }
  }
  return best;
}

export function fx(s, k, x, y, extra) { s.fx.push(Object.assign({ k, x: Math.round(x), y: Math.round(y), t: s.tick }, extra)); }

export function damage(s, ref, amount, src, opts) {
  const ent = get(s, ref);
  if (!ent) return;
  ent.hp -= Math.max(1, amount - (opts && opts.perfura ? 0 : armorOf(s, ref.k, ent)));
  ent.hitT = s.tick;
  if (ref.k === 'u' || ref.k === 'm') { s.alert = { t: s.tick, c: ent.c, r: ent.r }; ev(s, 'ataque', ent.x || 0, ent.y || 0); }
  if (ref.k === 'e' && src && !ent.target) ent.target = src;                 // retaliar
  if (ref.k === 'p' && src) for (const e of s.enemies) if (e.homeId === ent.id && e.mode === 'guarda' && !e.target) e.target = src;
  if (ent.hp <= 0) kill(s, ref, ent);
}

function kill(s, ref, ent) {
  const p = posOf(ref.k, ent);
  ev(s, ref.k === 'e' ? (ENEMIES[ent.type].frames ? 'morte_inseto' : 'explosao_peq') : ref.k === 'u' ? (UNITS[ent.type].classe === 'inf' ? 'morte_inseto' : 'explosao_peq') : 'explosao_grande', p.x, p.y);
  if (ref.k === 'u') {
    s.units.splice(s.units.indexOf(ent), 1); s.stats.perdidos++;
    if (UNITS[ent.type].classe === 'inf') fx(s, 'morteSold', ent.x, ent.y, { type: ent.type, dir: ent.dir });
    else fx(s, 'boomS', p.x, p.y);
    log(s, `Perdemos: ${UNITS[ent.type].nome}`);
  }
  else if (ref.k === 'e') {
    s.enemies.splice(s.enemies.indexOf(ent), 1); s.stats.abatidos++;
    if (ENEMIES[ent.type].frames) fx(s, 'morte', ent.x, ent.y, { type: ent.type, dir: ent.dir, id: ent.id });   // animação de morte do inseto
    else fx(s, 'boomS', p.x, p.y);
  }
  else if (ref.k === 'm') {
    s.modules.splice(s.modules.indexOf(ent), 1);
    s.map.s[idx(s.map, ent.c, ent.r)] = 0;
    setT(s.map, ent.c, ent.r, T.destrocos, ent.id);
    s.modRev++;
    fx(s, 'boomL', p.x, p.y);
    log(s, `${MODULES[ent.type].nome} destruído`);
    if ((ent.type === 'nucleo' || ent.type === 'plataforma') && !s.result) { s.result = 'derrota'; ev(s, 'derrota'); }
  } else {
    s.portals.splice(s.portals.indexOf(ent), 1);
    s.map.s[idx(s.map, ent.c, ent.r)] = 0;
    fx(s, 'boomL', p.x, p.y);
    log(s, s.portals.length ? 'Portal destruído' : 'Último portal destruído');
    if (!s.portals.length && !s.result) { s.result = 'vitoria'; ev(s, 'vitoria'); }
  }
}

// Disparo com projétil visível: o dano chega quando o projétil chega.
export function fire(s, src, srcEnt, targetRef, dmg, sprite, opts) {
  const a = posOf(src.k, srcEnt), t = get(s, targetRef);
  if (!t) return;
  const b = posOf(targetRef.k, t);
  const T_ = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 7));
  s.shots.push({ src, ref: targetRef, x0: a.x, y0: a.y, t: 0, T: T_, dmg, sp: sprite, area: !!(opts && opts.area), perfura: !!(opts && opts.perfura) });
  ev(s, sprite === 'torre' ? 'tiro_torre' : 'tiro_mech', a.x, a.y);
}

export function shotsStep(s) {
  for (let i = s.shots.length - 1; i >= 0; i--) {
    const sh = s.shots[i];
    if (++sh.t >= sh.T) {
      s.shots.splice(i, 1);
      const t = get(s, sh.ref);
      if (t) {
        const p = posOf(sh.ref.k, t); fx(s, sh.area ? 'boomS' : 'hit', p.x, p.y); ev(s, sh.area ? 'explosao_peq' : 'impacto', p.x, p.y);
        if (sh.area) for (const o of s.enemies.slice()) if (o !== t && o.c === t.c && o.r === t.r) damage(s, { k: 'e', id: o.id }, sh.dmg / 2, sh.src);
      }
      damage(s, sh.ref, sh.dmg, sh.src, { perfura: sh.perfura });
    }
  }
  while (s.fx.length && s.tick - s.fx[0].t > 40) s.fx.shift();
}

export function towersStep(s) {
  for (const md of s.modules) {
    const d = MODULES[md.type];
    if (!d.dano || md.fase !== 'ativo') continue;
    if (md.cd > 0) { md.cd -= s.power.ratio; continue; }
    const n = nearestHostile(s, md, d.alcance, 'colonia');
    if (!n) continue;
    fire(s, { k: 'm', id: md.id }, md, n.ref, d.dano, 'torre');
    md.cd = d.recarga;
  }
}

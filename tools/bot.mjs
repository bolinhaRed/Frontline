// Jogador automático simples, para medir a dificuldade das missões (não faz parte do jogo).
// Estratégia: economia → defesa → investigação → exército; defende ou ataca conforme o objetivo.
import { canBuild, canTrain, canResearch, territory } from '../js/sim/economy.js';
import { MODULES } from '../js/data/modules.js';
import { RESEARCH_ORDER } from '../js/data/research.js';
import { range, distance } from '../js/sim/hex.js';
import { T, idx } from '../js/sim/map.js';

const count = (s, t) => s.modules.filter(m => m.type === t).length;
function place(s, type, cmds) {
  const m = s.map, st = m.start, t = territory(s);
  if (MODULES[type].sobre) {
    const want = MODULES[type].sobre === 'cristal' ? T.cristal : T.geiser;
    for (let i = 0; i < m.t.length; i++) if (m.t[i] === want && t[i] && !canBuild(s, type, i % m.w, Math.floor(i / m.w))) { cmds.push({ type: 'build', module: type, c: i % m.w, r: Math.floor(i / m.w) }); return true; }
    return false;
  }
  // torres viradas para os portais; o resto o mais perto possível do Núcleo
  const toward = type === 'torre' && s.portals[0] ? s.portals[0] : st;
  for (let d = 2; d <= 5; d++) {
    const ps = range(st, d).filter(p => distance(p, st) === d).sort((a, b) => distance(a, toward) - distance(b, toward));
    for (const p of ps) if (!canBuild(s, type, p.c, p.r)) { cmds.push({ type: 'build', module: type, c: p.c, r: p.r }); return true; }
  }
  return false;
}

export function botStep(s) {
  const cmds = [], M = s.mission, st = s.map.start;
  if (s.tick % 20) return cmds;
  if (s.cfg.base) {
    const pending = s.modules.some(m => m.fase !== 'ativo');
    if (count(s, 'extrator') < 4 && place(s, 'extrator', cmds));
    else if (s.power.prod - s.power.cons < 3 && place(s, 'reator', cmds));
    else if (s.pop.used + 3 >= s.pop.cap && !pending && place(s, 'cupula', cmds));
    else if (!count(s, 'quartel') && place(s, 'quartel', cmds));
    else if (!count(s, 'laboratorio') && place(s, 'laboratorio', cmds));
    else if (count(s, 'torre') < 3 && place(s, 'torre', cmds));
    else if (!count(s, 'refinaria') && place(s, 'refinaria', cmds));
    else if (!count(s, 'hangar') && place(s, 'hangar', cmds));
    else if (count(s, 'quartel') < 3 && s.res.cristal > 300 && place(s, 'quartel', cmds));
    else if (count(s, 'torre') < 6 && s.res.cristal > 500 && place(s, 'torre', cmds));
    const lab = s.modules.find(m => m.type === 'laboratorio' && m.fase === 'ativo');
    if (lab && !lab.fila.length) for (const id of RESEARCH_ORDER) if (!canResearch(s, lab, id)) { cmds.push({ type: 'research', moduleId: lab.id, id }); break; }
    for (const md of s.modules.filter(m => (m.type === 'quartel' || m.type === 'hangar') && m.fase === 'ativo' && m.fila.length < 4)) {
      const opts = MODULES[md.type].produz.filter(u => !canTrain(s, md, u));
      if (opts.length) cmds.push({ type: 'train', moduleId: md.id, unit: opts[(s.tick / 20 | 0) % opts.length] });
    }
  }
  // Exército
  const army = s.units.filter(u => u.type !== 'colono'), ids = army.map(u => u.id);
  if (!ids.length || s.tick % 100) return cmds;
  const home = s.modules.find(m => m.type === 'plataforma') || st;
  if (M.tipo === 'chegar') cmds.push({ type: 'amove', ids, c: M.alvo.c, r: M.alvo.r });
  else if (M.tipo === 'escoltar') {
    const col = s.units.filter(u => u.type === 'colono');
    if (col.length && distance(col[0], M.colonosEm) <= 3 && army.some(u => distance(u, M.colonosEm) <= 4)) {
      cmds.push({ type: 'move', ids: col.map(u => u.id), c: st.c, r: st.r });
      cmds.push({ type: 'amove', ids, c: col[0].c, r: col[0].r });
    } else if (col.length && distance(col[0], M.colonosEm) > 3) {
      cmds.push({ type: 'move', ids: col.map(u => u.id), c: st.c, r: st.r });
      cmds.push({ type: 'amove', ids, c: col[0].c, r: col[0].r });
    } else if (army.length >= 6) cmds.push({ type: 'amove', ids, c: M.colonosEm.c, r: M.colonosEm.r });
  } else if ((M.tipo === 'destruir' || M.tipo === 'portais') && s.portals.length && (army.length >= 12 || army.filter(u => u.type.startsWith('mech')).length >= 5)) {
    const tgt = M.tipo === 'destruir' ? s.portals.find(p => p.id === M.alvoId) : s.portals[0];
    if (tgt) cmds.push({ type: 'amove', ids, c: tgt.c, r: tgt.r });
  } else {
    const far = army.filter(u => distance(u, home) > 3).map(u => u.id);
    if (far.length && !s.enemies.some(e => e.mode === 'vaga' && distance(e, home) < 8)) cmds.push({ type: 'amove', ids: far, c: home.c, r: home.r + 1 });
  }
  return cmds;
}

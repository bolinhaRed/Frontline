// Testes da árvore de tecnologia (Etapa 5b): Quartel → Laboratório → investigação → Refinaria e gás → Chassis → Hangar → Mech.
import { createGame, step } from '../js/sim/state.js';
import { canBuild, canTrain, canResearch, moduleAt, placeActive } from '../js/sim/economy.js';
import { stat } from '../js/data/units.js';
import { range, distance } from '../js/sim/hex.js';
import { T, idx } from '../js/sim/map.js';
import { spawnEnemy } from '../js/sim/swarm.js';
let fails = 0; const ok = (c, msg) => { console.log((c ? 'OK    ' : 'FALHA ') + msg); if (!c) fails++; };
const run = (g, n) => { for (let i = 0; i < n && !g.result; i++) step(g, []); };
const g = createGame(20261107), m = g.map, st = m.start;
g.enemies.length = 0; g.portals.length = 0; g.swarm.next = 1e12; g.res.cristal = 5000;
const spot = type => { for (let d = 1; d <= 6; d++) for (const p of range(st, d)) if (distance(p, st) === d && !canBuild(g, type, p.c, p.r)) return p; return null; };
const buildNow = type => { const p = spot(type); step(g, [{ type: 'build', module: type, c: p.c, r: p.r }]); run(g, 30 + 31 * 20); return moduleAt(g, p.c, p.r); };

ok(canBuild(g, 'laboratorio', st.c + 1, st.r) === 'Requer Quartel', 'Laboratório bloqueado sem Quartel');
ok(canBuild(g, 'torre', st.c + 1, st.r) === 'Requer Laboratório', 'Torre bloqueada sem Laboratório');
ok(canBuild(g, 'hangar', st.c + 1, st.r) === 'Requer investigação: Chassis de mech', 'Hangar bloqueado sem Chassis');
buildNow('reator');
const q = buildNow('quartel');
ok(q.fase === 'ativo', 'Quartel construído');
ok(canTrain(g, q, 'metralhador') === 'Requer investigação: Metralhadoras', 'Metralhador bloqueado sem investigação');
const lab = buildNow('laboratorio');
ok(lab.fase === 'ativo' && !canBuild(g, 'torre', spot('torre').c, spot('torre').r), 'Laboratório construído; Torre desbloqueada');
step(g, [{ type: 'research', moduleId: lab.id, id: 'metralhador' }]); run(g, 30 * 20 + 2);
ok(g.tech.done.includes('metralhador') && !canTrain(g, q, 'metralhador'), 'investigar Metralhadoras desbloqueia o Metralhador');
{ const n0 = g.units.filter(u => u.type === 'metralhador').length, d0 = g.tech.done.length;
  step(g, [{ type: 'train', moduleId: q.id, unit: 'metralhador' }]); run(g, 16 * 20);
  ok(g.units.filter(u => u.type === 'metralhador').length === n0 + 1 && g.tech.done.length === d0, 'treinar um Metralhador produz a unidade (não é confundido com a investigação do mesmo nome)'); }
ok(canResearch(g, lab, 'chassis') === 'Gás insuficiente', 'Chassis precisa de gás');
const gi = m.t.findIndex((t, i) => t === T.geiser && !canBuild(g, 'refinaria', i % m.w, Math.floor(i / m.w)));
ok(gi >= 0, 'há um géiser onde construir a Refinaria');
step(g, [{ type: 'build', module: 'refinaria', c: gi % m.w, r: Math.floor(gi / m.w) }]); run(g, 30 + 20 * 20 + 2);
const gas0 = g.res.gas; run(g, 200);
ok(Math.abs(g.res.gas - gas0 - 30) < 0.01, `Refinaria extrai ${(g.res.gas - gas0).toFixed(1)} de gás em 10 s`);
run(g, 1200);
step(g, [{ type: 'research', moduleId: lab.id, id: 'chassis' }]); run(g, 60 * 20 + 2);
ok(g.tech.done.includes('chassis'), 'Chassis de mech investigado');
run(g, 400);   // gás para o Hangar
const h = buildNow('hangar');
ok(h && h.fase === 'ativo', 'Hangar construído depois do Chassis');
run(g, 400);   // gás para a investigação
step(g, [{ type: 'research', moduleId: lab.id, id: 'armadura_inf' }]); run(g, 45 * 20 + 2);
ok(stat(g, 'assalto', 'armadura') === 1, 'Coletes reforçados: +1 armadura na infantaria');
const pop = g.pop.used;
run(g, 2000);   // acumular gás
step(g, [{ type: 'train', moduleId: h.id, unit: 'mech' }]); run(g, 20 * 20 + 5);
ok(g.units.some(u => u.type === 'mech') && g.pop.used === pop + 2, `Hangar produz um Mech (população ${g.pop.used})`);

// Antitanque ignora a armadura do Bruto; granada fere vários no mesmo hex
const g2 = createGame(5); g2.enemies.length = 0; g2.swarm.next = 1e12;
const { createUnit } = await import('../js/sim/units.js');
g2.units.length = 0;
const at = createUnit(g2, 'antitanque', g2.map.start.c + 2, g2.map.start.r);
const br = spawnEnemy(g2, 'bruto', { id: 999, c: at.c + 3, r: at.r }, 'vaga'); br.delay = 1e9;
run(g2, 45);
ok(br.hp <= 320 - 32, `foguete antitanque tira ${320 - br.hp} ao Bruto (armadura 4 ignorada)`);
const g3 = createGame(5); g3.enemies.length = 0; g3.swarm.next = 1e12; g3.units.length = 0;
const gr = createUnit(g3, 'granadeiro', g3.map.start.c + 2, g3.map.start.r);
const bugs = [0, 1, 2].map(i => { const e = spawnEnemy(g3, 'larva', { id: 990 + i, c: gr.c + 3, r: gr.r }, 'vaga'); e.delay = 1e9; e.c = gr.c + 3; e.r = gr.r; return e; });
run(g3, 50);
ok(bugs.filter(b => b.hp < 80).length >= 2, `granada fere ${bugs.filter(b => b.hp < 80).length} larvas no mesmo hex`);
// Armas alternativas dos mechs: investigação no Laboratório desbloqueia cada variante no Hangar
for (const t of ['cupula', 'cupula', 'reator']) { const p = spot('reator'); if (p) placeActive(g, t, p.c, p.r); }
for (const [rid, type] of [['arma_cacadeira', 'mech_cacadeira'], ['arma_rockets', 'mech_rockets'], ['arma_laser', 'mech_laser']]) {
  ok(canTrain(g, h, type) === `Requer investigação: ${(await import('../js/data/research.js')).RESEARCH[rid].nome}`, `${type} bloqueado antes da investigação`);
  g.res.gas += 400; g.res.cristal += 600;
  step(g, [{ type: 'research', moduleId: lab.id, id: rid }]); run(g, 90 * 20);
  const n0 = g.units.filter(u => u.type === type).length;
  step(g, [{ type: 'train', moduleId: h.id, unit: type }]); run(g, 45 * 20);   // com falta de energia demora mais
  const made = g.units.filter(u => u.type === type).length === n0 + 1;
  if (!made) console.log('      registo:', g.log.map(l => l.txt).join(' | '), '| fila', h.fila, 'prog', Math.round(h.prog), 'bloqueado', h.bloqueado, 'pop', JSON.stringify(g.pop), 'energia', JSON.stringify(g.power));
  ok(made, `${type} produzido depois de investigar`);
}

// Papéis: dano por segundo contra um enxame de rastejadores e contra um Bruto
async function duel(type, enemy, n) {
  const g4 = createGame(9); g4.enemies.length = 0; g4.portals.length = 0; g4.swarm.next = 1e12; g4.units.length = 0;
  const u = createUnit(g4, type, g4.map.start.c + 2, g4.map.start.r); u.hold = true;
  const es = []; for (let i = 0; i < n; i++) { const e = spawnEnemy(g4, enemy, { id: 50 + i, c: u.c + 2, r: u.r }, 'vaga'); e.delay = 1e9; e.c = u.c + 2; e.r = u.r; es.push(e); }
  run(g4, 200);
  return es.reduce((a, e) => a + (ENEMIES[enemy].vida - Math.max(0, e.hp)), 0) / 10;
}
const { ENEMIES } = await import('../js/data/enemies.js');
const tab = {};
for (const t of ['mech', 'mech_cacadeira', 'mech_rockets', 'mech_laser']) tab[t] = [await duel(t, 'massa', 12), await duel(t, 'bruto', 1)];
console.log('      dano/s (12 rastejadores | 1 bruto):', Object.entries(tab).map(([k, v]) => `${k} ${v[0].toFixed(0)}|${v[1].toFixed(0)}`).join(' · '));
ok(tab.mech_cacadeira[0] > tab.mech[0], 'Caçadeira é melhor contra grupos do que o Atirador');
ok(tab.mech_rockets[1] > tab.mech[1], 'Rockets são melhores contra o Bruto do que o Atirador');
ok(tab.mech_laser[0] > tab.mech[0], 'Laser é o melhor contra alvos sem armadura');
process.exit(fails ? 1 : 0);

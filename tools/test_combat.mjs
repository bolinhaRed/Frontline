// Testes do combate e do Enxame (Etapa 5).
import { createGame, step, serialize, deserialize } from '../js/sim/state.js';
import { spawnEnemy } from '../js/sim/swarm.js';
import { canBuild, placeActive } from '../js/sim/economy.js';
import { range, distance, neighbors } from '../js/sim/hex.js';
import { moveCost } from '../js/sim/map.js';
let fails = 0; const ok = (c, msg) => { console.log((c ? 'OK    ' : 'FALHA ') + msg); if (!c) fails++; };
const run = (g, n) => { for (let i = 0; i < n && !g.result; i++) step(g, []); };
const calm = g => { g.enemies.length = 0; g.swarm.next = 1e12; return g; };
const near = (g, p, d) => range(p, d).find(q => distance(q, p) === d && moveCost(g.map, q.c, q.r));

// 1. Mechs abatem um inseto que se aproxima
let g = calm(createGame(5));
const st = g.map.start;
const fakePortal = { id: 999999, c: st.c + 6, r: st.r };
const e1 = spawnEnemy(g, 'larva', fakePortal, 'vaga'); e1.delay = 0;
run(g, 400);
ok(!g.enemies.includes(e1) && g.stats.abatidos === 1, `mechs abatem uma larva (abatidos ${g.stats.abatidos}, mechs ${g.units.length})`);
ok(g.units.every(u => u.hp > 0), 'mechs sobrevivem a uma larva');

// 2. Manter posição: não persegue
g = calm(createGame(5));
const u0 = g.units[0];
step(g, [{ type: 'hold', ids: g.units.map(u => u.id) }]);
const far = spawnEnemy(g, 'massa', { id: 999998, c: u0.c + 4, r: u0.r }, 'guarda');
far.mode = 'parado'; far.delay = 1e9;
far.c = u0.c + 6; far.r = u0.r; far.x = far.c * 24 + (far.r & 1) * 12 + 16; far.y = far.r * 19 + 18; far.px = far.x; far.py = far.y;  // fora do alcance de todos
const pos0 = `${u0.c},${u0.r}`; run(g, 100);
ok(`${u0.c},${u0.r}` === pos0 && g.enemies.includes(far), 'em "manter posição" não persegue alvos fora do alcance');

// 3. Torre defende sozinha
g = calm(createGame(5)); g.res.cristal = 1000; g.units.length = 0;
{ const lp = range(st, 3).find(p => distance(p, st) === 3 && !canBuild(g, 'reator', p.c, p.r)); placeActive(g, 'laboratorio', lp.c, lp.r); }
const pt = range(st, 2).find(p => distance(p, st) === 2 && !canBuild(g, 'torre', p.c, p.r));
step(g, [{ type: 'build', module: 'torre', c: pt.c, r: pt.r }]);
run(g, 30 + 20 * 20 + 5);
for (let i = 0; i < 4; i++) { const e = spawnEnemy(g, 'massa', { id: 900000 + i, c: pt.c + 5, r: pt.r }, 'vaga'); e.delay = 0; }
run(g, 600);
ok(g.stats.abatidos === 4, `torre abate 4 rastejadores (abatidos ${g.stats.abatidos})`);

// 4. Vitória ao destruir todos os portais (com mechs)
g = calm(createGame(5));
{ const { createUnit } = await import('../js/sim/units.js'); const ps = g.units.map(u => [u.c, u.r]); g.units.length = 0; for (const [c, r] of ps) createUnit(g, 'mech', c, r); }
for (const p of g.portals) p.hp = 30;
const ids = g.units.map(u => u.id);
step(g, [{ type: 'attack', ids, target: { k: 'p', id: g.portals[0].id } }]);
run(g, 3000);
if (!g.result && g.portals.length) step(g, [{ type: 'attack', ids: g.units.map(u => u.id), target: { k: 'p', id: g.portals[0].id } }]);
run(g, 3000);
ok(g.result === 'vitoria', `atacar portais leva à vitória (resultado: ${g.result}, portais ${g.portals.length})`);

// 5. Derrota se o Núcleo cai
g = calm(createGame(5)); g.units.length = 0;
const nuc = g.modules[0]; nuc.hp = 20;
for (let i = 0; i < 3; i++) { const e = spawnEnemy(g, 'bruto', { id: 800000 + i, c: st.c + 3, r: st.r }, 'vaga'); e.delay = 0; }
run(g, 800);
ok(g.result === 'derrota', `núcleo destruído dá derrota (resultado: ${g.result})`);

// 6. Partida completa sem ordens: o Enxame ataca e o jogo acaba ou continua sem erros; determinismo
const a = createGame(77), b = deserialize(serialize(a));
let waves = 0;
for (let i = 0; i < 12000 && !a.result; i++) { step(a, []); step(b, []); }
ok(serialize(a) === serialize(b), `partida de ${Math.round(a.tick / 20)} s determinística (vagas ${a.swarm.wave}, resultado ${a.result || 'em curso'}, abatidos ${a.stats.abatidos})`);
ok(a.swarm.wave >= 2, 'as vagas continuam a chegar mesmo sem ordens do jogador');

// 7. Desempenho: 60 insetos contra 12 mechs
g = calm(createGame(8)); g.res.cristal = 0;
const { createUnit } = await import('../js/sim/units.js');
for (const p of range(st, 3)) if (g.units.length < 12 && distance(p, st) >= 2 && moveCost(g.map, p.c, p.r) && !g.units.some(u => u.c === p.c && u.r === p.r)) createUnit(g, 'mech', p.c, p.r);
for (let i = 0; i < 60; i++) { const e = spawnEnemy(g, i % 3 ? 'massa' : 'larva', { id: 700000 + i, c: st.c + 9, r: st.r - 3 + (i % 5) }, 'vaga'); e.delay = 0; }
const t0 = performance.now(); run(g, 400); const ms = (performance.now() - t0) / 400;
ok(ms < 4, `batalha 12 mechs × 60 insetos: ${ms.toFixed(2)} ms por tick (abatidos ${g.stats.abatidos}, mechs vivos ${g.units.length})`);
process.exit(fails ? 1 : 0);

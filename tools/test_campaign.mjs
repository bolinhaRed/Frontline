// Testes da campanha (Etapa 6): preparação de cada missão, objetivos, derrotas, tecnologia por missão e ramificação.
import { createGame, step, serialize, deserialize } from '../js/sim/state.js';
import { MISSIONS, missionById, missionConfig, regionState } from '../js/data/campaign.js';
import { canBuild, canTrain } from '../js/sim/economy.js';
import { centerX, centerY, distance } from '../js/sim/hex.js';
let fails = 0; const ok = (c, msg) => { console.log((c ? 'OK    ' : 'FALHA ') + msg); if (!c) fails++; };
const run = (g, n) => { for (let i = 0; i < n && !g.result; i++) step(g, []); };
const prog = ids => ({ concluidas: ids, escolha: null });
const before = { aterragem: [], cabeca: ['aterragem'], sinal: ['aterragem', 'cabeca'], abastecimento: ['aterragem', 'cabeca'],
  portal: ['aterragem', 'cabeca', 'sinal'], cerco: ['aterragem', 'cabeca', 'sinal', 'portal'], ninho: ['aterragem', 'cabeca', 'sinal', 'portal', 'cerco'] };
const game = id => createGame(1000 + id.length, missionConfig(prog(before[id]), missionById(id)));
const tp = (u, p) => { u.c = p.c; u.r = p.r; u.x = centerX(p.c, p.r); u.y = centerY(p.c, p.r); u.path = []; u.leg = null; };

// Ramificação e estados das regiões
ok(regionState(prog([]), missionById('aterragem')) === 'disponivel' && regionState(prog([]), missionById('cabeca')) === 'bloqueada', 'só a primeira missão está disponível no início');
ok(regionState(prog(['aterragem', 'cabeca']), missionById('sinal')) === 'disponivel' && regionState(prog(['aterragem', 'cabeca']), missionById('abastecimento')) === 'disponivel', 'depois da 2.ª há escolha entre A e B');
ok(regionState(prog(['aterragem', 'cabeca', 'sinal']), missionById('abastecimento')) === 'perdida', 'escolher A perde a região B');
ok(missionConfig(prog(before.cerco), missionById('cerco')).ondas.mult > missionConfig(prog(['aterragem', 'cabeca', 'abastecimento', 'portal']), missionById('cerco')).ondas.mult, 'o Cerco é mais difícil se a linha de abastecimento caiu');

// 1. Aterragem
let g = game('aterragem');
ok(!g.modules.length && g.units.length === 4 && g.mission.alvo && g.enemies.length > 3, `Aterragem: sem base, 4 soldados, bandeira e ${g.enemies.length} insetos`);
ok(canBuild(g, 'reator', g.map.start.c + 1, g.map.start.r) !== null, 'Aterragem: não se constrói');
tp(g.units[0], g.mission.alvo); run(g, 2);
ok(g.result === 'vitoria', 'Aterragem: chegar à bandeira dá vitória');
g = game('aterragem'); g.units.length = 0; run(g, 2);
ok(g.result === 'derrota', 'Aterragem: perder todos os soldados dá derrota');

// 2. Cabeça de ponte
g = game('cabeca');
const st = g.map.start;
ok(g.modules[0].type === 'nucleo' && canBuild(g, 'laboratorio', st.c + 1, st.r) === 'Não se pode construir', 'Cabeça de ponte: Laboratório ainda bloqueado pela campanha');
ok(!canBuild(g, 'reator', st.c + 1, st.r) || canBuild(g, 'reator', st.c + 1, st.r) !== 'Não se pode construir', 'Cabeça de ponte: Reator disponível');
g.tick = g.mission.segundos * 20 - 1; run(g, 3);
ok(g.result === 'vitoria', 'Cabeça de ponte: aguentar o tempo dá vitória');

// 3. Sinal perdido (escolta)
g = game('sinal');
const col = g.units.filter(u => u.type === 'colono');
ok(col.length === 5 && distance(col[0], g.map.start) >= 8, `Sinal perdido: 5 colonos a ${distance(col[0], g.map.start)} hexes`);
const near = [[1, 0], [-1, 0], [0, -1]].map(([dc, dr]) => ({ c: g.map.start.c + dc, r: g.map.start.r + dr - 1 }));
col.slice(0, 3).forEach((u, i) => tp(u, near[i])); run(g, 2);
ok(g.result === 'vitoria' && g.mission.salvos === 3, 'Sinal perdido: 3 colonos a salvo dá vitória');
g = game('sinal'); for (const u of g.units.filter(u => u.type === 'colono').slice(0, 3)) g.units.splice(g.units.indexOf(u), 1); run(g, 2);
ok(g.result === 'derrota', 'Sinal perdido: perder colonos demais dá derrota');

// 4. Linha de abastecimento
g = game('abastecimento');
const plat = g.modules.find(m => m.type === 'plataforma');
ok(!!plat, 'Linha de abastecimento: plataforma presente');
plat.hp = 1; const { damage } = await import('../js/sim/combat.js'); damage(g, { k: 'm', id: plat.id }, 50);
ok(g.result === 'derrota', 'Linha de abastecimento: perder a plataforma dá derrota');

// 5. Primeiro portal
g = game('portal');
ok(g.portals.length === 2 && g.mission.alvoId === g.portals[0].id, 'Primeiro portal: 2 portais, o principal assinalado');
damage(g, { k: 'p', id: g.portals[1].id }, 99999); run(g, 2);
ok(!g.result, 'Primeiro portal: destruir o outro portal não chega');
damage(g, { k: 'p', id: g.mission.alvoId }, 99999); run(g, 2);
ok(g.result === 'vitoria', 'Primeiro portal: destruir o portal assinalado dá vitória');

// 6 e 7
g = game('cerco');
ok(g.units.filter(u => u.type === 'metralhador').length === 2 && g.tech.allowed.includes('laboratorio') && !g.tech.allowed.includes('hangar'), 'Cerco: metralhadores de início; Hangar ainda bloqueado');
g = game('ninho');
ok(g.portals.length === 3 && g.tech.allowed.includes('mech') && g.tech.allowed.includes('blindagem_mech'), 'O Ninho: 3 portais e a árvore completa');
const hg = g.modules[0];
ok(canTrain(g, hg, 'mech') !== null, 'O Ninho: os mechs continuam a exigir Hangar e investigação');

// Todas as missões correm sem erros e são determinísticas
for (const m of MISSIONS) {
  const a = game(m.id), b = deserialize(serialize(a));
  for (let i = 0; i < 1500; i++) { step(a, []); step(b, []); }
  ok(serialize(a) === serialize(b), `${m.nome}: 75 s sem ordens, determinística (resultado: ${a.result || 'em curso'})`);
}
process.exit(fails ? 1 : 0);

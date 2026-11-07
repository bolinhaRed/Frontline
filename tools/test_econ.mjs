// Testes da economia e construção (Etapa 4).
import { createGame, step, serialize, deserialize } from '../js/sim/state.js';
import { territory, canBuild, moduleAt } from '../js/sim/economy.js';
import { range, distance } from '../js/sim/hex.js';
import { idx, inBounds, getT, T, moveCost } from '../js/sim/map.js';
import { MODULES } from '../js/data/modules.js';
let fails = 0; const ok = (c, msg) => { console.log((c ? 'OK    ' : 'FALHA ') + msg); if (!c) fails++; };
const run = (g, n) => { for (let i = 0; i < n; i++) step(g, []); };
const spotFor = (g, type, near, maxD = 6) => {
  for (let d = 1; d <= maxD; d++) for (const p of range(near, d)) if (distance(p, near) === d && !canBuild(g, type, p.c, p.r)) return p;
  return null;
};

for (const seed of [20261107, 1, 42, 1234, 7]) {
  const g = createGame(seed), m = g.map, terr = territory(g);
  const crystals = m.t.map((t, i) => t === T.cristal && terr[i] ? i : -1).filter(i => i >= 0);
  ok(crystals.length >= 2, `semente ${seed}: ${crystals.length} hexes de cristal dentro do território inicial`);
}

const calm = g => { g.enemies.length = 0; g.portals.length = 0; g.swarm.next = 1e12; return g; };
const g = calm(createGame(20261107)), m = g.map, st = m.start;
ok(g.modules.length === 1 && g.modules[0].type === 'nucleo', 'começa com o Núcleo ativo');
ok(g.units.length === 4 && g.units.every(u => u.type === 'assalto') && g.pop.cap === 8, `4 soldados de assalto e população ${g.pop.used}/${g.pop.cap}`);
const far = { c: st.c + 12, r: st.r - 10 };
ok(canBuild(g, 'reator', far.c, far.r) === 'Fora do território', 'não constrói fora do território');

// Reator
const pR = spotFor(g, 'reator', st);
step(g, [{ type: 'build', module: 'reator', c: pR.c, r: pR.r }]);
ok(g.res.cristal === 200 && moveCost(m, pR.c, pR.r) === 0, 'reator encomendado: custo pago e hex bloqueado');
run(g, 30 + 20 * 20 + 2);
ok(moduleAt(g, pR.c, pR.r).fase === 'ativo' && g.power.prod === 18, `reator ativo após drop pod + obra; energia ${g.power.prod}/${g.power.cons}`);

// Extrator sobre cristal
const terr = territory(g);
const ci = m.t.findIndex((t, i) => t === T.cristal && terr[i] && !canBuild(g, 'extrator', i % m.w, Math.floor(i / m.w)));
const pE = { c: ci % m.w, r: Math.floor(ci / m.w) };
ok(canBuild(g, 'extrator', st.c + 1, st.r) !== null, 'extrator recusado fora de cristais');
step(g, [{ type: 'build', module: 'extrator', c: pE.c, r: pE.r }]);
run(g, 30 + 15 * 20 + 2);
const before = g.res.cristal; run(g, 200);
ok(Math.abs(g.res.cristal - before - 40) < 0.01, `extrator dá ${(g.res.cristal - before).toFixed(1)} cristais em 10 s`);
ok(m.ore[idx(m, pE.c, pE.r)] < 2500, 'a jazida diminui');

// Cristal insuficiente
const poor = deserialize(serialize(g)); poor.res.cristal = 10;
ok(canBuild(poor, 'hangar', pR.c, pR.r - 2) !== null, 'recusa sem cristal');

// Quartel e produção
run(g, 700);
const pH = spotFor(g, 'quartel', st);
step(g, [{ type: 'build', module: 'quartel', c: pH.c, r: pH.r }]);
run(g, 30 + 25 * 20 + 2);
const hg = moduleAt(g, pH.c, pH.r);
ok(hg.fase === 'ativo', 'quartel ativo');
const n0 = g.units.length;
step(g, [{ type: 'train', moduleId: hg.id, unit: 'assalto' }, { type: 'train', moduleId: hg.id, unit: 'assalto' }]);
run(g, 10 * 20 * 2 + 10);
ok(g.units.length === n0 + 2, `quartel treinou 2 soldados (${g.units.length} unidades, população ${g.pop.used}/${g.pop.cap})`);
step(g, [{ type: 'train', moduleId: hg.id, unit: 'assalto' }, { type: 'train', moduleId: hg.id, unit: 'assalto' }, { type: 'train', moduleId: hg.id, unit: 'assalto' }]);
ok(g.log.at(-1).txt.startsWith('População no máximo'), 'população máxima trava a produção: ' + g.log.at(-1).txt);
step(g, [{ type: 'cancel', moduleId: hg.id }]);
ok(hg.fila.length === 1, 'cancelar devolve o último da fila');

// Relé alarga o território
const t0 = territory(g).reduce((a, b) => a + b, 0);
run(g, 400);
const pRe = (() => { const tt = territory(g); let best = null, bd = -1;
  for (let i = 0; i < tt.length; i++) { if (!tt[i]) continue; const p = { c: i % m.w, r: Math.floor(i / m.w) }; const d = distance(p, st); if (d > bd && !canBuild(g, 'rele', p.c, p.r)) { bd = d; best = p; } } return best; })();
step(g, [{ type: 'build', module: 'rele', c: pRe.c, r: pRe.r }]);
run(g, 30 + 10 * 20 + 2);
const t1 = territory(g).reduce((a, b) => a + b, 0);
ok(t1 > t0, `relé alarga o território de ${t0} para ${t1} hexes`);

// Unidades nunca acabam em cima de módulos
ok(g.units.every(u => !g.map.s[idx(m, u.c, u.r)]), 'nenhuma unidade em cima de um módulo');
// Determinismo com economia
const a = createGame(99), b = deserialize(serialize(a));
const p = spotFor(a, 'cupula', a.map.start);
for (const x of [a, b]) step(x, [{ type: 'build', module: 'cupula', c: p.c, r: p.r }, { type: 'move', ids: x.units.map(u => u.id), c: p.c + 3, r: p.r }]);
run(a, 600); run(b, 600);
ok(serialize(a) === serialize(b), 'economia determinística e serializável');
process.exit(fails ? 1 : 0);

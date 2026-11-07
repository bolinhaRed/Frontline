// Teste sem interface: caminhos, movimento em grupo sem sobreposição, patrulha,
// determinismo e gravação/carregamento do estado.
import { createGame, step, serialize, deserialize } from '../js/sim/state.js';
import { findPath } from '../js/sim/pathfinding.js';
import { moveCost } from '../js/sim/map.js';
import { neighbors, distance } from '../js/sim/hex.js';
let fails = 0; const ok = (c, msg) => { console.log((c ? 'OK    ' : 'FALHA ') + msg); if (!c) fails++; };

function overlaps(g) {
  const seen = new Set();
  for (const u of g.units) for (const h of [u, u.leg].filter(Boolean)) {
    const k = h.c + ',' + h.r; if (seen.has(k)) return true; seen.add(k);
  }
  return false;
}

const calm = g => { g.enemies.length = 0; g.portals.length = 0; g.swarm.next = 1e12; return g; };
for (const seed of [1, 42, 1234, 99999, 7]) {
  const g = calm(createGame(seed));
  const portalNs = neighbors(g.map.portals[0].c, g.map.portals[0].r).filter(n => moveCost(g.map, n.c, n.r) > 0);
  ok(findPath(g.map, g.map.start, portalNs[0]).length > 0, `semente ${seed}: caminho até ao portal, ${g.units.length} mechs`);
  // grupo de 6 até perto do portal, depois de volta, sem nunca dois mechs no mesmo hex
  const ids = g.units.map(u => u.id);
  const target = { c: g.map.portals[0].c - 3, r: g.map.portals[0].r + 3 };
  step(g, [{ type: 'move', ids, c: target.c, r: target.r }]);
  let bad = false, t = 0;
  for (; t < 1200 && g.units.some(u => u.leg || u.path.length); t++) { step(g, []); if (overlaps(g)) bad = true; }
  ok(!bad, `semente ${seed}: nenhum hex partilhado durante ${t} ticks`);
  const far = Math.max(...g.units.map(u => distance(u, target)));
  ok(far <= 3, `semente ${seed}: grupo chegou (mech mais afastado a ${far} hexes do destino)`);
  // cruzamento: metade do grupo vai para trás enquanto a outra metade avança
  step(g, [{ type: 'move', ids: ids.slice(0, 3), c: g.map.start.c, r: g.map.start.r }, { type: 'move', ids: ids.slice(3), c: target.c + 2, r: target.r - 2 }]);
  bad = false;
  for (let i = 0; i < 1500; i++) { step(g, []); if (overlaps(g)) bad = true; }
  ok(!bad && g.units.every(u => !u.leg && !u.path.length), `semente ${seed}: cruzamento sem sobreposição e todos parados`);
}

const a = calm(createGame(42)), b = calm(createGame(42));
ok(serialize(a) === serialize(b), 'mesma semente gera o mesmo estado');
const ids = a.units.map(u => u.id);
const cmd = { type: 'patrol', ids: ids.slice(0, 2), c: a.map.start.c + 6, r: a.map.start.r - 4 };
step(a, [cmd]); step(b, [cmd]);
for (let i = 0; i < 400; i++) { step(a, []); step(b, []); }
ok(serialize(a) === serialize(b), 'mesmos comandos dão o mesmo resultado após 400 ticks');
ok(a.units.slice(0, 2).every(u => u.patrol), 'patrulha continua ativa');
const c = deserialize(serialize(a));
for (let i = 0; i < 400; i++) { step(a, []); step(c, []); }
ok(serialize(a) === serialize(c), 'estado gravado e recarregado continua igual ao original');
step(a, [{ type: 'stop', ids }]);
for (let i = 0; i < 40; i++) step(a, []);
ok(a.units.every(u => !u.leg && !u.path.length && !u.patrol), 'parar cancela movimento e patrulha');
const t0 = performance.now(); for (let i = 0; i < 300; i++) step(a, [{ type: 'move', ids, c: 30, r: 5 + (i % 10) }]);
console.log(`300 ticks com nova ordem de grupo em cada um: ${((performance.now() - t0) / 300).toFixed(2)} ms/tick`);
process.exit(fails ? 1 : 0);

// Mede a missão Aterragem: os soldados avançam juntos em modo de ataque até à bandeira (como um jogador simples).
import { createGame, step } from '../js/sim/state.js';
import { missionById, missionConfig } from '../js/data/campaign.js';
const res = [];
for (let seed = 1; seed <= 20; seed++) {
  const g = createGame(seed * 7919, missionConfig({ concluidas: [] }, missionById('aterragem')));
  const ids = g.units.map(u => u.id), a = g.mission.alvo;
  step(g, [{ type: 'amove', ids, c: a.c, r: a.r }]);
  for (let t = 0; t < 20 * 240 && !g.result; t++) { step(g, []); if (t % 100 === 0 && g.units.length) step(g, [{ type: 'amove', ids: g.units.map(u => u.id), c: a.c, r: a.r }]); }
  res.push([g.result || 'tempo', g.units.length, Math.round(g.tick / 20)]);
}
const wins = res.filter(r => r[0] === 'vitoria');
console.log('vitórias', wins.length, '/ 20 · sobreviventes médios nas vitórias', (wins.reduce((a, r) => a + r[1], 0) / Math.max(1, wins.length)).toFixed(1));
console.log(res.map(r => `${r[0][0]}${r[1]}`).join(' '));

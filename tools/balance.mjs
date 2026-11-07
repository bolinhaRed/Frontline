// Mede cada missão da campanha com o jogador automático. Uso: node tools/balance.mjs [missão] [n.º de mapas]
import { createGame, step } from '../js/sim/state.js';
import { MISSIONS, missionById, missionConfig } from '../js/data/campaign.js';
import { botStep } from './bot.mjs';
const only = process.argv[2], N = Number(process.argv[3] || 10);
const order = ['aterragem', 'cabeca', 'sinal', 'abastecimento', 'portal', 'cerco', 'ninho'];
const before = id => ({ concluidas: order.slice(0, order.indexOf(id)).filter(x => !(id !== 'abastecimento' && x === 'abastecimento') && !(id === 'abastecimento' && x === 'sinal')) });
for (const m of MISSIONS) {
  if (only && m.id !== only) continue;
  const out = [];
  for (let k = 1; k <= N; k++) {
    const g = createGame(k * 104729, missionConfig(before(m.id), m));
    for (let t = 0; t < 20 * 60 * 20 && !g.result; t++) step(g, botStep(g));
    out.push(`${g.result ? g.result[0] : 't'}${Math.round(g.tick / 20 / 60)}m`);
  }
  const wins = out.filter(o => o[0] === 'v').length;
  console.log(`${m.nome.padEnd(24)} vitórias ${String(wins).padStart(2)}/${N}  ${out.join(' ')}`);
}

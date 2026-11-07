// Unidades da Colónia (dados). Infantaria: soldados Robot Warfare (CC0). Mech: topo da tecnologia.
// Custos em cristal e gás, tempos em segundos, alcance/visão em hexes. Valores provisórios para afinar em teste.
export const UNITS = {
  assalto:     { nome: 'Soldado de assalto', classe: 'inf', sprite: 'assalto', velocidade: 1.4, visao: 5, vida: 55, dano: 6, alcance: 3, recarga: 10,
                 armadura: 0, aggro: 5, custo: 50, gas: 0, tempo: 10, pop: 1, tiro: 'bala', desc: 'Infantaria barata e versátil.' },
  metralhador: { nome: 'Metralhador', classe: 'inf', sprite: 'metralhador', velocidade: 1.3, visao: 5, vida: 65, dano: 3, alcance: 3, recarga: 4,
                 armadura: 0, aggro: 5, custo: 75, gas: 0, tempo: 14, pop: 1, tiro: 'bala', requer: 'metralhador', desc: 'Fogo rápido contra enxames.' },
  granadeiro:  { nome: 'Granadeiro', classe: 'inf', sprite: 'granadeiro', velocidade: 1.3, visao: 5, vida: 55, dano: 16, area: true, alcance: 3, recarga: 30,
                 armadura: 0, aggro: 5, custo: 75, gas: 25, tempo: 16, pop: 1, tiro: 'granada', requer: 'granadeiro', desc: 'Granadas que ferem tudo no mesmo hex.' },
  sniper:      { nome: 'Atirador furtivo', classe: 'inf', sprite: 'sniper', velocidade: 1.3, visao: 7, vida: 40, dano: 28, alcance: 5, recarga: 40,
                 armadura: 0, aggro: 6, custo: 100, gas: 25, tempo: 18, pop: 1, tiro: 'bala', requer: 'sniper', desc: 'Alcance longo, fogo lento.' },
  antitanque:  { nome: 'Antitanque', classe: 'inf', sprite: 'antitanque', velocidade: 1.2, visao: 5, vida: 60, dano: 32, perfura: true, alcance: 3, recarga: 36,
                 armadura: 0, aggro: 5, custo: 100, gas: 25, tempo: 18, pop: 1, tiro: 'rocket', requer: 'antitanque', desc: 'Foguetes que ignoram a armadura: a resposta aos Brutos.' },
  colono:      { nome: 'Colono', classe: 'civil', velocidade: 1.2, visao: 3, vida: 40, dano: 0, alcance: 0, recarga: 0, armadura: 0, aggro: 0,
                 custo: 0, gas: 0, tempo: 0, pop: 0, desc: 'Sobrevivente sem armas. Tem de ser escoltado.' },
  mech:        { nome: 'Mech', classe: 'mech', velocidade: 1.6, visao: 6, vida: 180, dano: 12, alcance: 3, recarga: 8, armadura: 2, aggro: 5,
                 custo: 150, gas: 75, tempo: 20, pop: 2, tiro: 'mech', requer: 'chassis', arma: 1, desc: 'O topo da tecnologia: resistente e com fogo rápido.' },
  mech_cacadeira: { nome: 'Mech Caçadeira', classe: 'mech', velocidade: 1.5, visao: 6, vida: 210, dano: 24, area: true, alcance: 2, recarga: 18, armadura: 3, aggro: 5,
                 custo: 175, gas: 100, tempo: 22, pop: 2, tiro: 'mech', requer: 'arma_cacadeira', arma: 3, desc: 'Curto alcance; cada disparo fere tudo no mesmo hex.' },
  mech_rockets: { nome: 'Mech Lança-rockets', classe: 'mech', velocidade: 1.4, visao: 7, vida: 170, dano: 55, perfura: true, alcance: 5, recarga: 34, armadura: 2, aggro: 6,
                 custo: 200, gas: 125, tempo: 24, pop: 2, tiro: 'rocket', requer: 'arma_rockets', arma: 6, desc: 'Longo alcance; os rockets ignoram a armadura.' },
  mech_laser:  { nome: 'Mech Laser', classe: 'mech', velocidade: 1.6, visao: 6, vida: 180, dano: 6, alcance: 4, recarga: 3, armadura: 2, aggro: 5,
                 custo: 200, gas: 150, tempo: 24, pop: 2, tiro: 'laser', requer: 'arma_laser', arma: 4, desc: 'Feixe quase contínuo: o maior dano por segundo.' },
};

// Valor de um atributo com as melhorias investigadas.
export function stat(s, type, k) {
  const d = UNITS[type], done = (s && s.tech && s.tech.done) || [];
  let v = d[k];
  if (d.classe === 'inf' && k === 'armadura' && done.includes('armadura_inf')) v += 1;
  if (d.classe === 'inf' && k === 'alcance' && done.includes('alcance_inf')) v += 1;
  if (d.classe === 'mech' && k === 'armadura' && done.includes('blindagem_mech')) v += 2;
  return v;
}

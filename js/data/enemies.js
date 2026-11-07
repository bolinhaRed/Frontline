// Unidades e estruturas do Enxame (dados). Valores provisórios para afinar em teste.
export const ENEMIES = {
  massa: { nome: 'Rastejador', vida: 40,  dano: 6,  alcance: 1, recarga: 16, velocidade: 2.2, armadura: 0, pontos: 1, sprite: 'alien' },
  larva: { nome: 'Larva',      vida: 80,  dano: 9,  alcance: 1, recarga: 18, velocidade: 1.5, armadura: 0, pontos: 2, sprite: 'larva', frames: [6, 8, 7], cw: 32 },   // parado, mover, morrer
  bruto: { nome: 'Bruto',      vida: 320, dano: 26, alcance: 1, recarga: 30, velocidade: 1.0, armadura: 4, pontos: 6, sprite: 'bruto', frames: [6, 8, 11], cw: 64 },
};
export const PORTAL = { nome: 'Portal do Enxame', vida: 1000 };
export const SWARM = {
  primeiraVaga: 150,       // segundos até à primeira vaga
  intervalo: 80,           // segundos entre vagas (desce 5 por vaga até ao mínimo)
  intervaloMin: 40,
  guardas: 3,              // rastejadores parados junto a cada portal
  creepCada: 6,            // segundos entre avanços do creep
  creepRaioMax: 7,
  aggroVaga: 3, aggroGuarda: 4,
};

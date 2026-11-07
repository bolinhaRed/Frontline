// Investigação no Laboratório (dados). 'requer' é outra investigação.
export const RESEARCH = {
  metralhador:    { nome: 'Metralhadoras', custo: 100, gas: 0, tempo: 30, desc: 'Desbloqueia o Metralhador no Quartel.' },
  granadeiro:     { nome: 'Granadas', custo: 100, gas: 25, tempo: 35, desc: 'Desbloqueia o Granadeiro no Quartel.' },
  sniper:         { nome: 'Miras de longo alcance', custo: 125, gas: 25, tempo: 40, desc: 'Desbloqueia o Atirador furtivo no Quartel.' },
  antitanque:     { nome: 'Lança-foguetes', custo: 125, gas: 50, tempo: 40, desc: 'Desbloqueia o Antitanque no Quartel.' },
  armadura_inf:   { nome: 'Coletes reforçados', custo: 150, gas: 50, tempo: 45, desc: '+1 de armadura para toda a infantaria.' },
  alcance_inf:    { nome: 'Óticas de combate', custo: 150, gas: 50, tempo: 45, desc: '+1 hex de alcance para toda a infantaria.' },
  chassis:        { nome: 'Chassis de mech', custo: 250, gas: 150, tempo: 60, desc: 'Desbloqueia o Hangar e o Mech.' },
  arma_cacadeira: { nome: 'Caçadeira de mech', custo: 200, gas: 100, tempo: 45, requer: 'chassis', desc: 'Desbloqueia o Mech Caçadeira no Hangar.' },
  arma_rockets:   { nome: 'Lança-rockets de mech', custo: 225, gas: 125, tempo: 50, requer: 'chassis', desc: 'Desbloqueia o Mech Lança-rockets no Hangar.' },
  arma_laser:     { nome: 'Laser de mech', custo: 250, gas: 175, tempo: 60, requer: 'chassis', desc: 'Desbloqueia o Mech Laser no Hangar.' },
  blindagem_mech: { nome: 'Blindagem de mech', custo: 200, gas: 150, tempo: 60, requer: 'chassis', desc: '+2 de armadura para os mechs.' },
};
export const RESEARCH_ORDER = ['metralhador', 'granadeiro', 'sniper', 'antitanque', 'armadura_inf', 'alcance_inf', 'chassis', 'arma_cacadeira', 'arma_rockets', 'arma_laser', 'blindagem_mech'];

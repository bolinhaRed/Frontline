// Módulos da Colónia (dados). Custos em cristal, tempos em segundos. Valores provisórios para afinar em teste.
export const MODULES = {
  nucleo:   { vida: 1500, nome: 'Núcleo de comando', custo: 0, tempo: 0, energia: 8, pop: 8, territorio: 4, visao: 5, construivel: false,
              desc: 'Centro da base. Dá território, energia e população.' },
  extrator: { vida: 300, nome: 'Extrator', custo: 75, tempo: 15, energia: -2, territorio: 1, visao: 2, sobre: 'cristal', taxa: 4,
              desc: 'Constrói-se sobre cristais. Extrai 4 cristais por segundo até a jazida acabar.' },
  reator:   { vida: 350, nome: 'Reator', custo: 100, tempo: 20, energia: 10, territorio: 1, visao: 2,
              desc: 'Produz 10 de energia.' },
  cupula:   { vida: 350, nome: 'Cúpula habitacional', custo: 100, tempo: 20, energia: -1, pop: 6, territorio: 1, visao: 2,
              desc: 'Aumenta a população máxima em 6.' },
  plataforma: { vida: 1200, nome: 'Plataforma de aterragem', custo: 0, tempo: 0, energia: 0, territorio: 1, visao: 3, construivel: false,
              desc: 'Recebe os mantimentos da órbita. Não a deixes cair.' },
  quartel:  { vida: 450, nome: 'Quartel', custo: 125, tempo: 25, energia: -2, territorio: 1, visao: 3,
              produz: ['assalto', 'metralhador', 'granadeiro', 'sniper', 'antitanque'],
              desc: 'Treina infantaria (até 5 em fila).' },
  laboratorio: { vida: 350, nome: 'Laboratório', custo: 150, tempo: 30, energia: -3, territorio: 1, visao: 2, pesquisa: true,
              requer: { edificio: 'quartel' }, desc: 'Investiga armas, melhorias e o chassis de mech.' },
  refinaria: { vida: 300, nome: 'Refinaria', custo: 100, tempo: 20, energia: -2, territorio: 1, visao: 2, sobre: 'geiser', taxaGas: 3,
              requer: { edificio: 'laboratorio' }, desc: 'Constrói-se sobre um géiser. Extrai 3 de gás por segundo.' },
  hangar:   { vida: 500, nome: 'Hangar', custo: 200, gas: 50, tempo: 30, energia: -3, territorio: 1, visao: 3, produz: ['mech', 'mech_cacadeira', 'mech_rockets', 'mech_laser'],
              requer: { pesquisa: 'chassis' }, desc: 'Produz mechs (até 5 em fila).' },
  torre:    { vida: 400, nome: 'Torre', custo: 100, tempo: 20, energia: -2, territorio: 1, visao: 5,
              dano: 12, alcance: 4, recarga: 8, armadura: 2, requer: { edificio: 'laboratorio' },
              desc: 'Dispara sobre o Enxame até 4 hexes. Sem energia dispara mais devagar.' },
  rele:     { vida: 200, nome: 'Relé', custo: 50, tempo: 10, energia: -1, territorio: 3, visao: 3,
              desc: 'Alarga o território em 3 hexes à volta.' },
};
export const BUILD_ORDER = ['extrator', 'reator', 'cupula', 'rele', 'quartel', 'laboratorio', 'torre', 'refinaria', 'hangar'];
export const GAS_PER_GEYSER = 2000;
export const POD_TICKS = 30;        // queda do drop pod: 1,5 s
export const ORE_PER_HEX = 2500;    // cristal por hex de jazida
export const QUEUE_MAX = 5;

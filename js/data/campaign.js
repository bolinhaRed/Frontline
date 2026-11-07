// Campanha "Tharsis" (dados): regiões do mapa estratégico, missões, diálogos e recompensas.
// Os textos e nomes são propostas, para rever com o Vasco.

// Configuração de uma partida (a escaramuça usa esta; cada missão altera o que precisa)
export const SKIRMISH = {
  id: 'escaramuca', w: 40, h: 30, portais: 2, base: true, unidades: [['assalto', 4]],
  recursos: { cristal: 300, gas: 0 }, ondas: { primeira: 150, intervalo: 80, min: 40, mult: 1 },
  tech: null, objetivo: { tipo: 'portais' },
};

export const CHARACTERS = {
  varela: { nome: 'Capitã Varela', retrato: 'capitao' },
  kesh: { nome: 'Kesh, engenheiro zorrin', retrato: 'kesh' },
  colono: { nome: 'Colono', retrato: 'colono' },
};

// Ordem das missões e ligações do mapa estratégico (x, y em % do mapa)
export const MISSIONS = [
  {
    id: 'aterragem', regiao: 'Zona de aterragem', tile: 'plataforma', x: 12, y: 72, depois: [], nome: 'Aterragem',
    resumo: 'Atravessa território hostil com 4 soldados e chega à colónia Nova Tharsis.',
    objetivoTxt: 'Leva pelo menos um soldado até à bandeira.',
    cfg: { w: 32, h: 24, portais: 0, base: false, unidades: [['assalto', 4]], recursos: { cristal: 0, gas: 0 }, ondas: null,
           emboscadas: 3, objetivo: { tipo: 'chegar' } },
    recompensa: ['extrator', 'reator', 'cupula', 'rele', 'quartel', 'assalto'],
    briefing: [
      ['varela', 'Tharsis deixou de responder há seis dias. A última mensagem falava em “portais” a abrir-se no deserto.'],
      ['varela', 'Descemos com uma equipa pequena. Sem base, sem reforços: só vocês os quatro.'],
      ['kesh', 'O sinal da colónia ainda está ativo, a nordeste. Se há sobreviventes, estão lá.'],
      ['varela', 'Evitem lutas desnecessárias. Cheguem à bandeira inteiros.'],
    ],
    vitoria: [['kesh', 'Nova Tharsis está de pé, mas mal. Os sobreviventes falam de insetos que saem do chão.'], ['varela', 'Vamos montar uma base aqui. A partir de agora, a guerra é nossa.']],
  },
  {
    id: 'cabeca', regiao: 'Nova Tharsis', tile: 'solo', x: 28, y: 52, depois: ['aterragem'], nome: 'Cabeça de ponte',
    resumo: 'Monta a primeira base e resiste às vagas do Enxame durante 7 minutos.',
    objetivoTxt: 'Mantém o Núcleo de pé durante 7 minutos.',
    cfg: { w: 36, h: 26, portais: 1, base: true, unidades: [['assalto', 4]], recursos: { cristal: 300, gas: 0 },
           ondas: { primeira: 110, intervalo: 75, min: 55, mult: 1 }, objetivo: { tipo: 'sobreviver', segundos: 420 } },
    recompensa: ['laboratorio', 'torre', 'metralhador'],
    briefing: [
      ['kesh', 'O Núcleo de comando já está a caminho. Extratores sobre os cristais, Reatores para a energia.'],
      ['varela', 'O Quartel treina soldados. Precisamos de números antes da primeira vaga.'],
      ['varela', 'Aguentem sete minutos. Depois disso, a órbita manda reforços.'],
    ],
    vitoria: [['varela', 'Aguentámos. Com o Laboratório podemos finalmente estudar estes bichos.'], ['kesh', 'E chegaram dois pedidos de ajuda ao mesmo tempo. Só podemos responder a um.']],
  },
  {
    id: 'sinal', regiao: 'Vale do Sinal', tile: 'tempestade', x: 46, y: 26, depois: ['cabeca'], exclui: 'abastecimento', nome: 'Sinal perdido',
    resumo: 'Escolha A. Encontra 5 colonos isolados e escolta pelo menos 3 até à base.',
    objetivoTxt: 'Leva pelo menos 3 colonos para dentro do território da base.',
    cfg: { w: 38, h: 28, portais: 1, base: true, unidades: [['assalto', 4]], recursos: { cristal: 350, gas: 0 },
           ondas: { primeira: 160, intervalo: 80, min: 55, mult: 1 }, colonos: 5, objetivo: { tipo: 'escoltar', minimo: 3 } },
    recompensa: ['refinaria', 'granadeiro', 'armadura_inf'],
    briefing: [
      ['colono', '…aqui equipa de prospeção… cinco sobreviventes… presos no vale… por favor…'],
      ['varela', 'O sinal vem do vale a norte. Se formos buscá-los, a linha de abastecimento fica entregue ao Enxame.'],
      ['kesh', 'Os colonos não estão armados. Os teus soldados têm de abrir caminho e ficar com eles.'],
    ],
    vitoria: [['colono', 'Obrigado… pensei que ninguém vinha.'], ['kesh', 'Trouxeram planos de uma refinaria. Os géiseres têm gás: precisamos dele para a tecnologia avançada.']],
  },
  {
    id: 'abastecimento', regiao: 'Planalto de abastecimento', tile: 'rocha', x: 46, y: 74, depois: ['cabeca'], exclui: 'sinal', nome: 'Linha de abastecimento',
    resumo: 'Escolha B. Defende a plataforma de aterragem durante 8 minutos.',
    objetivoTxt: 'Defende a plataforma de aterragem durante 8 minutos.',
    cfg: { w: 36, h: 26, portais: 2, base: true, unidades: [['assalto', 5]], recursos: { cristal: 400, gas: 0 },
           ondas: { primeira: 100, intervalo: 70, min: 50, mult: 1.1 }, plataforma: true, objetivo: { tipo: 'defender', segundos: 480 } },
    recompensa: ['refinaria', 'sniper', 'alcance_inf'],
    briefing: [
      ['varela', 'A órbita vai largar mantimentos nesta plataforma. Se ela cair, ficamos sem nada.'],
      ['kesh', 'Os colonos do vale vão ter de esperar. Escolhemos a linha de abastecimento.'],
      ['varela', 'Oito minutos. O Enxame vai direito à plataforma.'],
    ],
    vitoria: [['kesh', 'Os mantimentos chegaram, com planos de uma refinaria e miras de longo alcance.'], ['varela', 'Já sabemos de onde vêm as vagas. Está na hora de atacar um portal.']],
  },
  {
    id: 'portal', regiao: 'Cratera do Portal', tile: 'creep', x: 64, y: 50, depois: ['sinal', 'abastecimento'], nome: 'Primeiro portal',
    resumo: 'Destrói o portal principal, assinalado com a bandeira.',
    objetivoTxt: 'Destrói o portal assinalado.',
    cfg: { w: 40, h: 28, portais: 2, base: true, unidades: [['assalto', 6]], recursos: { cristal: 400, gas: 100 },
           ondas: { primeira: 140, intervalo: 80, min: 50, mult: 1 }, objetivo: { tipo: 'destruir' } },
    recompensa: ['antitanque', 'granadeiro', 'sniper'],
    briefing: [
      ['kesh', 'Os portais não são naturais. Alguma coisa os está a abrir por baixo da crosta.'],
      ['varela', 'O maior está na cratera. Destruam-no e vejamos o que acontece.'],
      ['kesh', 'Investiguei uns lança-foguetes: os Antitanque furam a carapaça dos Brutos.'],
    ],
    vitoria: [['kesh', 'Quando o portal caiu, todos os outros tremeram. Estão ligados a um centro.'], ['varela', 'Um ninho. Antes de lá chegar, temos de aguentar o contra-ataque.']],
  },
  {
    id: 'cerco', regiao: 'Muralha Norte', tile: 'montanha', x: 80, y: 30, depois: ['portal'], nome: 'Cerco',
    resumo: 'Sobrevive 9 minutos ao contra-ataque do Enxame. Mais difícil se a linha de abastecimento caiu.',
    objetivoTxt: 'Mantém o Núcleo de pé durante 9 minutos.',
    cfg: { w: 38, h: 28, portais: 2, base: true, unidades: [['assalto', 4], ['metralhador', 2]], recursos: { cristal: 500, gas: 150 },
           ondas: { primeira: 100, intervalo: 65, min: 42, mult: 1.25 }, objetivo: { tipo: 'sobreviver', segundos: 540 } },
    recompensa: ['chassis', 'hangar', 'mech'],
    briefing: [
      ['varela', 'O Enxame sabe que estamos a ir buscá-lo. Vem tudo contra nós.'],
      ['kesh', 'Se aguentarmos, termino o chassis de mech. É o que precisamos para o ninho.'],
    ],
    vitoria: [['kesh', 'O primeiro mech está pronto. É lento a fazer, mas nada lhe faz frente.'], ['varela', 'Então vamos ao ninho.']],
  },
  {
    id: 'ninho', regiao: 'O Ninho', tile: 'vulcao', x: 92, y: 62, depois: ['cerco'], nome: 'O Ninho',
    resumo: 'Destrói os três portais do Ninho.',
    objetivoTxt: 'Destrói todos os portais.',
    cfg: { w: 44, h: 32, portais: 3, base: true, unidades: [['assalto', 4], ['antitanque', 2]], recursos: { cristal: 600, gas: 200 },
           ondas: { primeira: 150, intervalo: 75, min: 45, mult: 1.2 }, objetivo: { tipo: 'portais' } },
    recompensa: [], extra: ['blindagem_mech', 'arma_cacadeira', 'arma_rockets', 'arma_laser', 'mech_cacadeira', 'mech_rockets', 'mech_laser'],
    briefing: [
      ['varela', 'É aqui. Três portais à volta de um poço que desce até não sei onde.'],
      ['kesh', 'Desbloqueei a blindagem e três armas novas para os mechs: caçadeira, rockets e laser. Usem tudo o que temos.'],
      ['varela', 'Por Tharsis.'],
    ],
    vitoria: [['kesh', 'Os portais fecharam-se. O chão parou de tremer.'], ['varela', 'Tharsis é nossa outra vez. Obrigada, comandante.']],
  },
];

export const missionById = id => MISSIONS.find(m => m.id === id);

// Tudo o que a campanha já desbloqueou antes desta missão (mais os extras da própria missão)
export function techFor(progress, mission) {
  const set = new Set(mission.extra || []);
  for (const id of progress.concluidas) for (const t of missionById(id).recompensa) set.add(t);
  return [...set];
}

// Configuração final da missão, com as consequências das escolhas
export function missionConfig(progress, mission) {
  const cfg = JSON.parse(JSON.stringify(Object.assign({}, SKIRMISH, mission.cfg)));
  cfg.id = mission.id;
  cfg.tech = techFor(progress, mission);
  if (mission.id === 'cerco' && progress.concluidas.includes('sinal')) cfg.ondas.mult = 1.45;   // a linha de abastecimento caiu
  return cfg;
}

// Estado de cada região: 'concluida', 'disponivel', 'perdida' (escolha não feita) ou 'bloqueada'
export function regionState(progress, m) {
  if (progress.concluidas.includes(m.id)) return 'concluida';
  if (m.exclui && progress.concluidas.includes(m.exclui)) return 'perdida';
  if (m.depois.length === 0 || m.depois.some(d => progress.concluidas.includes(d))) return 'disponivel';
  return 'bloqueada';
}

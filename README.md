# Frontline — versão 1.0

RTS em pixel art com mapa hexagonal. HTML, CSS e JavaScript puros, sem dependências.

https://bolinhared.github.io/Frontline/

## Como abrir

- **GitHub Pages:** publica a pasta tal como está; abre `index.html`. Na primeira visita o jogo fica guardado no telemóvel e passa a funcionar sem internet; no Android, "Adicionar ao ecrã principal" instala-o como aplicação (ecrã inteiro, horizontal).
- **Depois de mudar ficheiros:** corre `node tools/build_sw.mjs` para atualizar a lista do modo offline (senão o browser continua a usar a versão antiga guardada).
- **No computador:** os módulos JavaScript não abrem com duplo clique (`file://`). Corre um servidor local na pasta, por exemplo `python -m http.server`, e abre `http://localhost:8000`.
- **Sem servidor:** `dist/frontline.html` é a mesma versão num único ficheiro, com as imagens embutidas.

## Publicar no GitHub Pages

1. `node tools/build_sw.mjs`, `node tools/build_single.mjs <caminho do esbuild>` e `node tools/build_publish.mjs` geram a pasta `publicar/`.
2. Essa pasta tem só o jogo compilado (um `index.html` com tudo embutido, ícones, manifesto e modo offline). É o que vai para o repositório público; os PNG e sons originais ficam neste projeto, fora do repositório público.

## Afinação

`node tools/balance.mjs [missão] [n.º de mapas]` joga as missões com o jogador automático de `tools/bot.mjs` e mostra vitórias e tempos.

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| `js/core` | Ciclo em passo fixo (20 ticks/s), RNG com semente, fila de comandos |
| `js/sim` | Simulação sem DOM: hexes, mapa, gerador, A*, unidades, fog of war, estado |
| `js/render` | Carregamento de imagens, câmara com zoom inteiro, desenho |
| `js/ui` | Entrada (rato, teclado, toque) e painéis |
| `js/data` | Terrenos e unidades (dados) |
| `assets` | PNG originais, sem alterações (o atlas de hexes é só um recorte das folhas) |
| `tools` | Scripts: atlas de hexes, testes da simulação, versão de ficheiro único |

## Som

`python3 tools/build_sfx.py` converte os efeitos (tools/sfx_src → assets/sfx) e `python3 tools/build_music.py` os três ambientes em loop (tools/music_src → assets/music). Os WAV originais não vão no zip por serem grandes: para reconverter, copia-os dos pacotes originais para essas pastas.

## Testes

`node tools/test_campaign.mjs` verifica a campanha: estados das regiões e a escolha entre missões, a preparação e os objetivos de cada missão (vitória e derrota), a tecnologia permitida por missão e o determinismo das 7 missões.

`node tools/balance_m1.mjs` joga a missão Aterragem em 20 mapas com um jogador simples e mostra vitórias e sobreviventes.

`node tools/test_tech.mjs` verifica a árvore (incluindo as três armas alternativas dos mechs e o seu papel): Quartel, Laboratório, investigação, Refinaria e gás, Chassis, Hangar e Mech, armadura, granadas e foguetes antitanque.

`node tools/test_combat.mjs` verifica combate, manter posição, torres, vitória, derrota, uma partida longa determinística e o desempenho de uma batalha grande.

`node tools/test_econ.mjs` verifica território, construção, drop pods, extração, energia, população e produção no Hangar.

`node tools/test_sim.mjs` verifica caminhos até ao portal, movimento em grupo sem dois mechs no mesmo hex, cruzamentos, patrulha, parar, determinismo e gravação/carregamento do estado.

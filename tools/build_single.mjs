// Gera dist/frontline.html: um único ficheiro com código, estilos e imagens embutidos
// (para publicar como artifact ou abrir sem servidor). O projeto em si continua modular.
// Uso: node tools/build_single.mjs <caminho do esbuild>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const esbuild = process.argv[2] || 'esbuild';
const bundle = execFileSync(esbuild, ['js/main.js', '--bundle', '--format=iife', '--minify', '--target=es2020']).toString();
const uri = p => 'data:image/png;base64,' + readFileSync(p).toString('base64');
const assets = {
  atlas: 'assets/tiles/hex_atlas.png', walk1: 'assets/units/Walk1.png', walk2: 'assets/units/Walk2.png', walk3: 'assets/units/Walk3.png',
  arma1: 'assets/units/armas/1.png', mechSmall: 'assets/units/mech_small.png', mechSmall_3: 'assets/units/mech_small_3.png', mechSmall_4: 'assets/units/mech_small_4.png', mechSmall_6: 'assets/units/mech_small_6.png', portal: 'assets/fx/Portal1_Idle.png', target: 'assets/fx/Target.png', pod: 'assets/fx/DropPod1.png', dust: 'assets/fx/Dust.png',
  alienSD: 'assets/enemies/alien_sd_small.png', alienSU: 'assets/enemies/alien_su_small.png', larva: 'assets/enemies/larva.png', bruto: 'assets/enemies/bruto.png',
  boomS: 'assets/fx/explosao_peq.png', boomL: 'assets/fx/explosao_grande.png', hit: 'assets/fx/impacto.png', bala: 'assets/fx/tiro_mech.png', balaTorre: 'assets/fx/tiro_torre.png',
  rwBala: 'assets/fx/rw_balas.png', rwGranada: 'assets/fx/rw_granada.png', rwRocket: 'assets/fx/rw_rocket.png',
  inf_assalto: 'assets/infantry/assalto.png', inf_metralhador: 'assets/infantry/metralhador.png', inf_granadeiro: 'assets/infantry/granadeiro.png',
  inf_sniper: 'assets/infantry/sniper.png', inf_antitanque: 'assets/infantry/antitanque.png',
  colono: 'assets/infantry/colono.png', bandeira: 'assets/fx/bandeira.png',
  estrelas: 'assets/campaign/estrelas.png', planeta: 'assets/campaign/planeta.png',
  retrato_capitao: 'assets/campaign/retrato_capitao.png', retrato_kesh: 'assets/campaign/retrato_kesh.png', retrato_colono: 'assets/campaign/retrato_colono.png', cursor: 'assets/ui/1.png', cursorOrder: 'assets/ui/3.png',
};
const inline = Object.fromEntries(Object.entries(assets).map(([k, p]) => [k, uri(p)]));
const { readdirSync } = await import('node:fs');
const uiFiles = Object.fromEntries(readdirSync('assets/ui/gw').filter(f => f.endsWith('.png')).map(f => [f.slice(0, -4), uri('assets/ui/gw/' + f)]));
const musicFiles = Object.fromEntries(readdirSync('assets/music').filter(f => f.endsWith('.ogg')).map(f => [f.slice(0, -4), 'data:audio/ogg;base64,' + readFileSync('assets/music/' + f).toString('base64')]));
const sfx = Object.fromEntries(readdirSync('assets/sfx').filter(f => f.endsWith('.mp3')).map(f => [f.slice(0, -4), 'data:audio/mpeg;base64,' + readFileSync('assets/sfx/' + f).toString('base64')]));
let html = readFileSync('index.html', 'utf8')
  .replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n/g, '');
html = html.replace('<link rel="stylesheet" href="css/style.css">', () => `<style>\n${readFileSync('css/style.css', 'utf8')}</style>`);
html = html.replace('<script type="module" src="js/main.js"></script>', () =>
  `<script>window.FRONTLINE_ASSETS=${JSON.stringify(inline)};window.FRONTLINE_SFX=${JSON.stringify(sfx)};window.FRONTLINE_UI=${JSON.stringify(uiFiles)};window.FRONTLINE_MUSIC=${JSON.stringify(musicFiles)};</script>\n<script>${bundle.replace(/<\/script/gi, '<\\/script')}</script>`);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/frontline.html', html);
console.log('dist/frontline.html', (html.length / 1024).toFixed(0), 'KB');

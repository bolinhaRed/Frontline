// Carregamento de imagens. No GitHub vêm de assets/; na versão de ficheiro único
// o build define window.FRONTLINE_ASSETS com as mesmas imagens embutidas.
const BASE = {
  atlas: 'assets/tiles/hex_atlas.png',
  walk1: 'assets/units/Walk1.png', walk2: 'assets/units/Walk2.png', walk3: 'assets/units/Walk3.png',
  arma1: 'assets/units/armas/1.png',
  mechSmall: 'assets/units/mech_small.png', mechSmall_3: 'assets/units/mech_small_3.png', mechSmall_4: 'assets/units/mech_small_4.png', mechSmall_6: 'assets/units/mech_small_6.png',
  portal: 'assets/fx/Portal1_Idle.png',
  target: 'assets/fx/Target.png',
  pod: 'assets/fx/DropPod1.png', nave: 'assets/fx/nave.png',
  dust: 'assets/fx/Dust.png',
  alienSD: 'assets/enemies/alien_sd_small.png', alienSU: 'assets/enemies/alien_su_small.png',
  larva: 'assets/enemies/larva.png', bruto: 'assets/enemies/bruto.png', vespa: 'assets/enemies/vespa.png', besouro: 'assets/enemies/besouro.png',
  boomS: 'assets/fx/explosao_peq.png', boomL: 'assets/fx/explosao_grande.png', hit: 'assets/fx/impacto.png',
  bala: 'assets/fx/tiro_mech.png', balaTorre: 'assets/fx/tiro_torre.png',
  rwBala: 'assets/fx/rw_balas.png', rwGranada: 'assets/fx/rw_granada.png', rwRocket: 'assets/fx/rw_rocket.png',
  inf_assalto: 'assets/infantry/assalto.png', inf_metralhador: 'assets/infantry/metralhador.png', inf_granadeiro: 'assets/infantry/granadeiro.png',
  inf_sniper: 'assets/infantry/sniper.png', inf_antitanque: 'assets/infantry/antitanque.png',
  colono: 'assets/infantry/colono.png', bandeira: 'assets/fx/bandeira.png',
  estrelas: 'assets/campaign/estrelas.png', planeta: 'assets/campaign/planeta.png',
  retrato_capitao: 'assets/campaign/retrato_capitao.png', retrato_kesh: 'assets/campaign/retrato_kesh.png', retrato_colono: 'assets/campaign/retrato_colono.png',
  cursor: 'assets/ui/1.png',
  cursorOrder: 'assets/ui/3.png',
};
import { SFX_NAMES } from '../audio/sfx.js';
// Sons: assets/sfx/<nome>.mp3, ou embutidos em window.FRONTLINE_SFX na versão de ficheiro único
export const sfxUrls = Object.fromEntries(SFX_NAMES.map(n => [n, ((typeof window !== 'undefined' && window.FRONTLINE_SFX) || {})[n] || `assets/sfx/${n}.mp3`]));
export const UI_NAMES = ['panel_dark', 'panel_basic', 'minimap_frame', 'portrait_frame', 'button_wide_normal', 'button_wide_hover', 'button_wide_pressed', 'button_wide_disabled',
  'button_square_normal', 'button_square_hover', 'button_square_pressed', 'button_square_disabled', 'icon_plus', 'icon_minus', 'icon_speaker', 'icon_pause', 'icon_map', 'icon_close', 'icon_check',
  'blip_player', 'blip_enemy', 'blip_objective'];
export const uiUrls = Object.fromEntries(UI_NAMES.map(n => [n, ((typeof window !== 'undefined' && window.FRONTLINE_UI) || {})[n] || `assets/ui/gw/${n}.png`]));
// Põe as peças do kit Gridwright em variáveis CSS (molduras dos painéis e botões) e nos ícones marcados com data-gw
export function applyUiSkin() {
  const root = document.documentElement.style;
  // caminho absoluto: um url() numa variável CSS seria lido a partir da pasta do ficheiro CSS
  for (const n of UI_NAMES) root.setProperty('--gw-' + n.replace(/_/g, '-'), `url("${new URL(uiUrls[n], document.baseURI).href}")`);
  for (const el of document.querySelectorAll('img[data-gw]')) el.src = uiUrls[el.dataset.gw];
}
import { MUSIC_NAMES } from '../audio/music.js';
export const musicUrls = Object.fromEntries(MUSIC_NAMES.map(n => [n, ((typeof window !== 'undefined' && window.FRONTLINE_MUSIC) || {})[n] || `assets/music/${n}.ogg`]));
export const assetUrls = Object.assign({}, BASE, (typeof window !== 'undefined' && window.FRONTLINE_ASSETS) || {});

const load = src => new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => rej(new Error('Não foi possível carregar ' + src));
  img.src = src;
});

export async function loadAssets() {
  const entries = await Promise.all(Object.entries(assetUrls).map(async ([k, src]) => [k, await load(src)]));
  const a = Object.fromEntries(entries);
  a.atlasDark = tint(a.atlas, 'rgba(6,7,14,0.62)');
  a.outlines = buildOutlines(a.atlas);
  return a;
}

// Versão escurecida do atlas para hexes explorados mas fora de vista (gerada em memória, o PNG não muda).
function tint(img, color) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}

// Contornos de hex (seleção, cursor, destino) desenhados a partir da silhueta de um hex plano.
function buildOutlines(atlas) {
  const S = 32, src = document.createElement('canvas'); src.width = S; src.height = S;
  const g = src.getContext('2d'); g.drawImage(atlas, 0, 0, S, S, 0, 0, S, S);
  const a = g.getImageData(0, 0, S, S).data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < S && y < S && a[(y * S + x) * 4 + 3] > 0;
  const make = (color, inset) => {
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const o = c.getContext('2d'); o.fillStyle = color;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (!solid(x, y)) continue;
      let edge = false;
      for (let d = 1; d <= inset; d++) if (!solid(x - d, y) || !solid(x + d, y) || !solid(x, y - d) || !solid(x, y + d)) edge = true;
      if (edge) o.fillRect(x, y, 1, 1);
    }
    return c;
  };
  return { select: make('#8fe3ff', 2), hover: make('rgba(255,255,255,0.55)', 2), target: make('#ffd25a', 2),
    ok: make('#7dff9a', 2), bad: make('#ff6b5a', 2), terr: make('rgba(143,227,255,0.22)', 1) };
}

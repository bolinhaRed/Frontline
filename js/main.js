// Arranque e navegação: título → mapa estratégico → diálogo → missão → resultado → mapa.
// Também liga simulação, câmara, desenho, entrada, interface, som e gravação.
import { createGame, step, serialize, deserialize } from './sim/state.js';
import { centerX, centerY, HEX_W, ROW_H } from './sim/hex.js';
import { createCommandQueue } from './core/commands.js';
import { startLoop } from './core/loop.js';
import { loadAssets, assetUrls, sfxUrls, musicUrls, applyUiSkin } from './render/assets.js';
import { createMusic } from './audio/music.js';
import { createSfx } from './audio/sfx.js';
import { createCamera, resizeCamera, clampCamera, zoomAt, offsetX, offsetY } from './render/camera.js';
import { createRenderer, render } from './render/renderer.js';
import { createMinimap } from './render/minimap.js';
import { attachInput } from './ui/input.js';
import { createHud } from './ui/hud.js';
import { createScreens } from './ui/screens.js';
import { SKIRMISH, missionById, missionConfig } from './data/campaign.js';
import { loadProgress, saveProgress, resetProgress, loadGame, saveGame, clearGame } from './ui/save.js';

const canvas = document.getElementById('game');
const cam = createCamera();
const ui = { selected: new Set(), hover: null, marker: null, debug: false, mode: null, box: null, boxMode: false, groups: {}, module: null, buildMenu: false, buildType: null };
const queue = createCommandQueue();
const sfx = createSfx(sfxUrls);
const music = createMusic(musicUrls, () => sfx.muted);
const view = (x, y) => ({ x: (x * cam.s + offsetX(cam)) / cam.w, y: (y * cam.s + offsetY(cam)) / cam.h });
// app.mode: 'titulo' | 'mapa' | 'jogo'; meta: { modo: 'campanha'|'escaramuca', missao, seed }
const app = { mode: 'titulo', paused: false, meta: null };
let state, hud, screens;
// Acesso para testes automáticos e depuração na consola
window.frontline = { get state() { return state; }, cam, app };

function resetUi() {
  ui.selected.clear(); ui.marker = null; ui.mode = null; ui.groups = {}; ui.module = null; ui.buildMenu = false;
  queue.drain();
}
function enterGame(s, meta) {
  state = s; app.meta = meta; app.mode = 'jogo'; app.paused = false;
  document.body.classList.add('in-game');
  music.play('jogo');
  resetUi();
  cam.worldW = s.cfg.w * HEX_W + HEX_W / 2 + 8; cam.worldH = s.cfg.h * ROW_H + 14;
  const focus = s.units[0] || s.map.start;
  cam.x = centerX(s.map.start.c, s.map.start.r); cam.y = centerY(s.map.start.c, s.map.start.r);
  if (!s.modules.length && focus) { cam.x = focus.x || cam.x; cam.y = focus.y || cam.y; }
  clampCamera(cam);
  screens.hideAll();
  hud.update();
}
function startMission(id, seed) {
  const m = missionById(id), progress = loadProgress();
  const sd = seed || (Math.random() * 1e9) >>> 0;
  if (app.mode === 'jogo') { leaveGame(); app.mode = 'mapa'; screens.map(progress); }
  screens.dialog(m.briefing, () => enterGame(createGame(sd, missionConfig(progress, m)), { modo: 'campanha', missao: id, seed: sd }));
}
function startSkirmish(seed) {
  const sd = seed || (Math.random() * 1e9) >>> 0;
  enterGame(createGame(sd, SKIRMISH), { modo: 'escaramuca', seed: sd });
}
function leaveGame() { document.body.classList.remove('in-game'); }
function toTitle() { leaveGame(); music.play('titulo'); app.mode = 'titulo'; app.paused = false; screens.hideAll(); screens.title(!!loadGame()); }
function toMap() { leaveGame(); music.play('mapa'); app.mode = 'mapa'; app.paused = false; screens.hideAll(); screens.map(loadProgress()); }

const actions = {
  zoom: d => { zoomAt(cam, d); hud.update(); },
  soundChanged: () => music.refresh(),
  pause: () => { if (app.mode !== 'jogo' || state.result) return; app.paused = true; screens.pause(true, true); document.getElementById('p-music').textContent = `Música: ${music.enabled ? 'ligada' : 'desligada'}`; },
  toggleMusic: () => { music.toggle(); document.getElementById('p-music').textContent = `Música: ${music.enabled ? 'ligada' : 'desligada'}`; },
  resume: () => { app.paused = false; screens.pause(false); },
  saveAndExit: () => {
    const ok = saveGame(app.meta, serialize(state));
    hud.toast(ok ? 'Partida gravada' : 'Não foi possível gravar neste browser');
    app.meta.modo === 'campanha' ? toMap() : toTitle();
  },
  restart: () => { screens.pause(false); app.meta.modo === 'campanha' ? enterGame(createGame(app.meta.seed, missionConfig(loadProgress(), missionById(app.meta.missao))), app.meta) : startSkirmish(app.meta.seed); },
  title: () => toTitle(),
  openMap: () => toMap(),
  skirmish: () => startSkirmish(Number(new URLSearchParams(location.search).get('seed')) || 0),
  continueGame: () => { const g = loadGame(); if (!g) return; clearGame(); enterGame(deserialize(g.estado), g.meta); },
  startMission: id => startMission(id),
  resetCampaign: () => { resetProgress(); toMap(); },
  endLabels: r => app.meta.modo === 'campanha' ? (r === 'vitoria' ? ['Continuar', 'Mapa'] : ['Tentar outra vez', 'Mapa']) : ['Jogar outra vez', 'Título'],
  endText: r => {
    const s = state, min = Math.floor(s.tick / 20 / 60), sec = Math.floor(s.tick / 20) % 60;
    const base = app.meta.modo === 'campanha' ? (r === 'vitoria' ? 'Objetivo cumprido.' : 'A missão falhou.')
      : (r === 'vitoria' ? 'Todos os portais do Enxame foram destruídos.' : 'O Núcleo de comando caiu.');
    return `${base} Tempo ${min}:${String(sec).padStart(2, '0')} · vagas ${s.swarm.wave} · insetos abatidos ${s.stats.abatidos} · perdas ${s.stats.perdidos}.`;
  },
  endPrimary: () => {
    if (app.meta.modo !== 'campanha') return startSkirmish();
    const m = missionById(app.meta.missao);
    if (state.result !== 'vitoria') return startMission(m.id);
    const p = loadProgress();
    if (!p.concluidas.includes(m.id)) p.concluidas.push(m.id);
    saveProgress(p);
    leaveGame(); app.mode = 'mapa'; screens.hideAll(); screens.map(p);
    document.getElementById('end').hidden = true;
    screens.dialog(m.vitoria, () => toMap());
  },
  focusObjective: () => {
    const M = state.mission;
    const p = M.alvo || (M.tipo === 'escoltar' && state.units.find(u => u.type === 'colono')) || state.modules.find(m => m.type === 'plataforma') || state.portals[0];
    if (p) { cam.x = centerX(p.c, p.r); cam.y = centerY(p.c, p.r); clampCamera(cam); }
  },
  endAlt: () => { document.getElementById('end').hidden = true; app.meta.modo === 'campanha' ? toMap() : toTitle(); },
};
actions.missionName = () => app.meta && app.meta.modo === 'campanha' ? missionById(app.meta.missao).nome : 'Escaramuça';

async function boot() {
  try {
    applyUiSkin();
    const assets = await loadAssets();
    for (const el of document.querySelectorAll('.stars')) el.style.backgroundImage = `url(${assetUrls.estrelas})`;
    document.getElementById('t-planet').src = assetUrls.planeta;
    const renderer = createRenderer(canvas, assets);
    resizeCamera(cam, canvas);
    window.addEventListener('resize', () => resizeCamera(cam, canvas));
    const cursors = { normal: `url(${assetUrls.cursor}) 1 1, default`, order: `url(${assetUrls.cursorOrder}) 1 1, crosshair` };
    const input = attachInput(canvas, { cam, ui, queue, getState: () => state, onChange: () => hud?.update(), cursors,
      toast: t => { hud?.toast(t); sfx.play('recusado'); }, sfx, active: () => app.mode === 'jogo' && !app.paused, pause: actions.pause });
    const iconUrls = { mech: assetUrls.walk3, inf_assalto: assetUrls.inf_assalto, inf_metralhador: assetUrls.inf_metralhador, inf_granadeiro: assetUrls.inf_granadeiro, inf_sniper: assetUrls.inf_sniper, inf_antitanque: assetUrls.inf_antitanque, inf_colono: assetUrls.colono };
    // o jogo arranca numa escaramuça escondida atrás do título, para o HUD ter sempre um estado válido
    state = createGame(1, SKIRMISH); app.meta = { modo: 'escaramuca', seed: 1 };
    hud = createHud({ cam, ui, getState: () => state, input, iconUrls, atlas: assets.atlas, sfx, actions });
    screens = createScreens({ atlas: assets.atlas, portraits: { capitao: assetUrls.retrato_capitao, kesh: assetUrls.retrato_kesh, colono: assetUrls.retrato_colono }, actions });
    const minimap = createMinimap(document.getElementById('minimap'), assets.atlas, cam, () => state);
    const mmBox = document.getElementById('minimap-box'), mmBtn = document.getElementById('btn-map');
    let mmOn = window.innerHeight >= 500;   // nos telemóveis começa escondido
    const syncMm = () => { mmBox.hidden = !mmOn; mmBtn.classList.toggle('on', mmOn); };
    mmBtn.onclick = () => { mmOn = !mmOn; syncMm(); };
    syncMm();
    toTitle();
    let fps = 60, hudT = 0;
    startLoop({
      tick: () => {
        if (app.mode !== 'jogo' || app.paused || state.result) { queue.drain(); return; }
        step(state, queue.drain());
        for (const e of state.ev) sfx.play(e.k, e, view);
        // faixa tensa enquanto há uma vaga em marcha; volta à normal 10 s depois de acabar
        if (state.tick % 20 === 0) {
          if (state.enemies.some(e => e.mode === 'vaga' && !e.delay)) app.tense = state.tick;
          music.play(app.tense && state.tick - app.tense < 200 ? 'tensao' : 'jogo');
        }
      },
      frame: (alpha, now, dt) => {
        if (app.mode !== 'jogo') return;
        input.update(dt);
        render(renderer, state, cam, ui, app.paused ? 0 : alpha, now);
        if (mmOn) minimap.draw(now);
        fps = fps * 0.95 + (1000 / Math.max(1, dt)) * 0.05;
        if ((hudT += dt) > 200) { hudT = 0; hud.update(); hud.debug(fps, renderer); }
      },
    });
    document.getElementById('loading').remove();
  } catch (err) {
    document.getElementById('loading').textContent = err.message;
    throw err;
  }
}
boot();

// Modo offline (PWA): só quando servido por http(s) com os ficheiros separados (GitHub Pages ou servidor local)
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.FRONTLINE_ASSETS) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* sem modo offline */ });
}

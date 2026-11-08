// Desenho do mundo: lê o estado, nunca o altera.
import { CELL, tileOriginX, tileOriginY, centerX, centerY, HEX_W, ROW_H, range } from '../sim/hex.js';
import { idx } from '../sim/map.js';
import { offsetX, offsetY } from './camera.js';
import { TERRAIN } from '../data/terrain.js';
import { MODULES, POD_TICKS } from '../data/modules.js';
import { territory, canBuild, queueProgress } from '../sim/economy.js';
import { TICK_HZ } from '../core/loop.js';
import { UNITS } from '../data/units.js';
import { ENEMIES } from '../data/enemies.js';
import { get, posOf, maxHp } from '../sim/combat.js';

const COLS = TERRAIN.colunas;
const FRAME = 48;

export function createRenderer(canvas, assets) {
  const g = canvas.getContext('2d', { alpha: false });
  return { canvas, g, assets, stats: { tiles: 0 } };
}

function drawTile(R, img, v, x, y) {
  R.g.drawImage(img, (v % COLS) * CELL, Math.floor(v / COLS) * CELL, CELL, CELL, x, y, CELL, CELL);
}

export function render(R, state, cam, ui, alpha, now) {
  const { g, assets: A } = R, m = state.map, seen = state.fog.seen;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#05060a';
  g.fillRect(0, 0, cam.w, cam.h);
  g.setTransform(cam.s, 0, 0, cam.s, offsetX(cam), offsetY(cam));

  // Área visível em hexes (com margem para objetos altos)
  const x0 = (-offsetX(cam)) / cam.s, y0 = (-offsetY(cam)) / cam.s;
  const x1 = x0 + cam.w / cam.s, y1 = y0 + cam.h / cam.s;
  const r0 = Math.max(0, Math.floor(y0 / ROW_H) - 1), r1 = Math.min(m.h - 1, Math.ceil(y1 / ROW_H) + 1);
  const c0 = Math.max(0, Math.floor(x0 / HEX_W) - 1), c1 = Math.min(m.w - 1, Math.ceil(x1 / HEX_W) + 1);

  // Unidades agrupadas por linha, para serem tapadas pelos hexes altos das linhas da frente
  const byRow = new Map();
  const put = (u, kind) => {
    const ix = u.px + (u.x - u.px) * alpha, iy = u.py + (u.y - u.py) * alpha;
    const row = Math.max(0, Math.min(m.h - 1, Math.round((iy - 18) / ROW_H)));
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push({ u, x: ix, y: iy, kind });
  };
  for (const u of state.units) put(u, 'u');
  const air = [];
  for (const e of state.enemies) if (seen[idx(m, e.c, e.r)] === 2) (ENEMIES[e.type].aereo ? air.push(e) : put(e, 'e'));

  const building = ui.mode === 'build' && ui.buildType;
  const terr = building ? territory(state) : null;
  const modById = new Map(state.modules.map(md => [md.id, md]));
  const pods = [];
  let count = 0;
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const i = idx(m, c, r), f = seen[i];
      if (!f) continue;
      const ox = tileOriginX(c, r), oy = tileOriginY(c, r);
      const md = m.s[i] > 0 ? modById.get(m.s[i]) : null;
      if (md && md.fase !== 'pod') {
        const img = f === 2 && !(md.type === 'extrator' && m.ore[i] <= 0) ? A.atlas : A.atlasDark;
        if (md.fase === 'obra') { drawTile(R, A.atlas, m.v[i], ox, oy); g.globalAlpha = 0.5; }
        drawTile(R, img, TERRAIN.modulos[md.type], ox, oy);
        g.globalAlpha = 1;
        // módulo com menos de metade da vida: mais escuro e a soltar faíscas
        if (md.fase === 'ativo' && md.hp < MODULES[md.type].vida * 0.5) {
          g.globalAlpha = md.hp < MODULES[md.type].vida * 0.25 ? 0.55 : 0.35; drawTile(R, A.atlasDark, TERRAIN.modulos[md.type], ox, oy); g.globalAlpha = 1;
          const tk = (now / 90) | 0;
          if ((tk + md.id * 7) % 6 < 3) g.drawImage(A.hit, ((tk + md.id * 7) % 6) * 16, 0, 16, 16, ox + 4 + (md.id * 5) % 12, oy + 2 + (md.id * 3) % 8, 16, 16);
        }
        if (ui.module === md.id) g.drawImage(A.outlines.select, ox, oy);
      } else {
        drawTile(R, f === 2 ? A.atlas : A.atlasDark, m.v[i], ox, oy);
        if (md) pods.push(md);
      }
      if (terr && terr[i] && !m.s[i]) g.drawImage(A.outlines.terr, ox, oy);
      count++;
      if (ui.hover && ui.hover.c === c && ui.hover.r === r) g.drawImage(A.outlines.hover, ox, oy);
      if (ui.marker && ui.marker.c === c && ui.marker.r === r && now - ui.marker.t < 900) g.drawImage(A.outlines.target, ox, oy);
    }
    // Seleção por baixo das unidades desta linha
    const list = byRow.get(r);
    if (list) {
      list.sort((a, b) => a.y - b.y);
      for (const it of list) if (it.kind === 'u' && ui.selected.has(it.u.id)) {
        g.drawImage(A.outlines.select, tileOriginX(it.u.c, it.u.r), tileOriginY(it.u.c, it.u.r));
      }
    }
    for (const pt of state.portals) if (pt.r === r && seen[idx(m, pt.c, pt.r)]) drawPortal(R, pt, now, seen[idx(m, pt.c, pt.r)] === 2);
    if (list) for (const it of list) it.kind === 'u' ? (UNITS[it.u.type].classe === 'inf' ? drawSoldier(R, it, now, state.tick + alpha) : UNITS[it.u.type].classe === 'civil' ? drawColono(R, it, now) : drawMech(R, it, now)) : drawEnemy(R, it, now, state.tick + alpha);
    for (const md of state.modules) if (md.r === r && md.fase === 'obra' && md.t < 12) drawDust(R, md);
  }
  // Insetos voadores: sombra no chão e o bicho 10 px acima
  for (const e of air) {
    const x = Math.round(e.px + (e.x - e.px) * alpha), y = Math.round(e.py + (e.y - e.py) * alpha);
    g.globalAlpha = 0.35; g.fillStyle = '#000'; g.fillRect(x - 5, y + 1, 10, 2); g.fillRect(x - 3, y, 6, 4); g.globalAlpha = 1;
    drawEnemy(R, { u: e, x, y: y - 10 }, now, state.tick + alpha);
  }
  // Bombardeamento orbital: hexes a piscar e a nave-mãe a descer até ao alvo
  for (const a of state.orbital.alvos) {
    const k = Math.max(0, Math.min(1, 1 - (a.t - state.tick - alpha) / 40));
    if (Math.floor(now / 150) % 2) for (const p of range(a, 1)) g.drawImage(A.outlines.bad, tileOriginX(p.c, p.r), tileOriginY(p.c, p.r));
    g.drawImage(A.nave, Math.round(centerX(a.c, a.r)) - 24, Math.round(centerY(a.c, a.r) - 40 - (1 - k) * 90), 48, 48);
  }
  if (ui.mode === 'orbital' && ui.hover) for (const p of range(ui.hover, 1)) g.drawImage(A.outlines.bad, tileOriginX(p.c, p.r), tileOriginY(p.c, p.r));
  // Ponto de encontro do módulo selecionado
  const selMd = ui.module && state.modules.find(md => md.id === ui.module);
  if (selMd && selMd.rally) {
    const a = { x: centerX(selMd.c, selMd.r), y: centerY(selMd.c, selMd.r) }, b = { x: centerX(selMd.rally.c, selMd.rally.r), y: centerY(selMd.rally.c, selMd.rally.r) };
    g.fillStyle = 'rgba(125,255,154,0.8)';
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 6));
    for (let i = 1; i < n; i++) g.fillRect(Math.round(a.x + (b.x - a.x) * i / n) - 1, Math.round(a.y + (b.y - a.y) * i / n) - 1, 2, 2);
    g.drawImage(A.outlines.ok, tileOriginX(selMd.rally.c, selMd.rally.r), tileOriginY(selMd.rally.c, selMd.rally.r));
  }
  // Bandeiras de objetivo (Robot Warfare): destino, portal a destruir ou zona de evacuação
  const M = state.mission, flags = [];
  if (M && M.alvo && (M.tipo === 'chegar' || M.tipo === 'destruir')) flags.push(M.alvo);
  if (M && M.tipo === 'escoltar') flags.push(state.map.start);
  for (const p of flags) g.drawImage(A.bandeira, (Math.floor(now / 140) % 6) * 64, 0, 64, 64, Math.round(centerX(p.c, p.r)) - 25, Math.round(centerY(p.c, p.r)) - 34 - (M.tipo === 'destruir' ? 22 : 0), 64, 64);

  // Projéteis, explosões e barras de vida
  for (const sh of state.shots) {
    const t = get(state, sh.ref); if (!t) continue;
    const b = posOf(sh.ref.k, t), k = Math.min(1, (sh.t + alpha) / sh.T);
    const px = Math.round(sh.x0 + (b.x - sh.x0) * k), py = Math.round(sh.y0 + (b.y - sh.y0) * k);
    if (sh.sp === 'bala') g.drawImage(A.rwBala, 8, 0, 8, 8, px - 4, py - 4, 8, 8);
    else if (sh.sp === 'granada') { const f = Math.floor((sh.t + alpha) * 2) % 8; g.drawImage(A.rwGranada, f * 8, 0, 8, 8, px - 4, py - 4 - Math.round(Math.sin(k * Math.PI) * 6), 8, 8); }
    else if (sh.sp === 'rocket') { g.save(); g.translate(px, py); if (b.x < sh.x0) g.scale(-1, 1); g.drawImage(A.rwRocket, (Math.floor(now / 60) % 3) * 16, 0, 16, 16, -8, -8, 16, 16); g.restore(); }
    else { const img = sh.sp === 'torre' || sh.sp === 'laser' ? A.balaTorre : A.bala, f = Math.floor(now / 90) % 2; g.drawImage(img, f * 16, 0, 16, 16, px - 8, py - 8, 16, 16); }
  }
  for (const f of state.fx) {
    const fr = Math.floor((state.tick - f.t + alpha) / 2);
    if (f.k === 'morte') { drawDeath(R, f, state.tick + alpha); continue; }
    if (f.k === 'morteSold') { drawSoldierDeath(R, f, state.tick + alpha); continue; }
    // explosões e impactos do Gridwright Space Shooter (2 ticks por frame)
    if (f.k === 'hit') { if (fr >= 0 && fr < 3) g.drawImage(A.hit, fr * 16, 0, 16, 16, f.x - 8, f.y - 8, 16, 16); }
    else if (f.k === 'boomS') { if (fr >= 0 && fr < 6) g.drawImage(A.boomS, fr * 16, 0, 16, 16, f.x - 8, f.y - 8, 16, 16); }
    else if (fr >= 0 && fr < 8) g.drawImage(A.boomL, fr * 32, 0, 32, 32, f.x - 16, f.y - 20, 32, 32);
  }
  const hpBar = (k, ent, x, y, w, sel) => {
    const max = maxHp(k, ent); if (!sel && ent.hp >= max) return;
    const f = Math.max(0, ent.hp / max);
    g.fillStyle = '#0b0707'; g.fillRect(x - 1, y - 1, w + 2, 4);
    g.fillStyle = f > 0.5 ? '#6fe08a' : f > 0.25 ? '#ffd25a' : '#ff6b5a'; g.fillRect(x, y, Math.max(1, Math.round(w * f)), 2);
  };
  for (const u of state.units) hpBar('u', u, Math.round(u.px + (u.x - u.px) * alpha) - 6, Math.round(u.py + (u.y - u.py) * alpha) - (UNITS[u.type].classe === 'inf' ? 15 : 16), 12, ui.selected.has(u.id));
  for (const e of state.enemies) if (seen[idx(m, e.c, e.r)] === 2) hpBar('e', e, Math.round(e.px + (e.x - e.px) * alpha) - 6, Math.round(e.py + (e.y - e.py) * alpha) - (e.type === 'bruto' ? 24 : ENEMIES[e.type].aereo ? 30 : 18), 12, false);
  for (const md of state.modules) if (md.fase === 'ativo') hpBar('m', md, Math.round(centerX(md.c, md.r)) - 10, tileOriginY(md.c, md.r) + 3, 20, ui.module === md.id);
  for (const pt of state.portals) if (seen[idx(m, pt.c, pt.r)] === 2) hpBar('p', pt, Math.round(centerX(pt.c, pt.r)) - 10, tileOriginY(pt.c, pt.r) - 30, 20, false);

  // Drop pods a cair e barras de progresso por cima de tudo
  for (const md of pods) drawPod(R, md, alpha);
  for (const md of state.modules) {
    if (md.fase === 'obra') bar(g, md, md.t / (MODULES[md.type].tempo * TICK_HZ), '#8fe3ff');
    else if (md.fila && md.fila.length) bar(g, md, queueProgress(md), '#7dff9a');
  }
  // Pré-visualização da construção
  if (building && ui.hover) {
    const h = ui.hover, ox = tileOriginX(h.c, h.r), oy = tileOriginY(h.c, h.r);
    const why = canBuild(state, ui.buildType, h.c, h.r);
    g.globalAlpha = 0.7; drawTile(R, A.atlas, TERRAIN.modulos[ui.buildType], ox, oy); g.globalAlpha = 1;
    g.drawImage(why ? A.outlines.bad : A.outlines.ok, ox, oy);
  }
  R.stats.tiles = count;

  // Caminho das unidades selecionadas
  g.fillStyle = 'rgba(143,227,255,0.85)';
  for (const u of state.units) {
    if (!ui.selected.has(u.id)) continue;
    for (const p of u.path) g.fillRect(centerX(p.c, p.r) - 1, centerY(p.c, p.r) - 1, 2, 2);
  }
  // Patrulha: pontas marcadas
  for (const u of state.units) {
    if (!ui.selected.has(u.id) || !u.patrol) continue;
    for (const p of [u.patrol.from, u.patrol.to]) g.drawImage(A.outlines.target, tileOriginX(p.c, p.r), tileOriginY(p.c, p.r));
  }
  // Marcador do destino (sprite do kit)
  if (ui.marker && now - ui.marker.t < 900) {
    const k = 1 - (now - ui.marker.t) / 900;
    g.globalAlpha = Math.min(1, k * 2);
    g.drawImage(A.target, Math.round(centerX(ui.marker.c, ui.marker.r) - 15), Math.round(centerY(ui.marker.c, ui.marker.r) - 14));
    g.globalAlpha = 1;
  }
  // Retângulo de seleção (coordenadas do ecrã)
  if (ui.box) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    const b = ui.box, lw = Math.max(1, Math.round(cam.dpr));
    const x = Math.round(Math.min(b.x0, b.x1)), y = Math.round(Math.min(b.y0, b.y1));
    const w = Math.round(Math.abs(b.x1 - b.x0)), h = Math.round(Math.abs(b.y1 - b.y0));
    g.fillStyle = 'rgba(143,227,255,0.12)'; g.fillRect(x, y, w, h);
    g.fillStyle = '#8fe3ff';
    g.fillRect(x, y, w, lw); g.fillRect(x, y + h - lw, w, lw); g.fillRect(x, y, lw, h); g.fillRect(x + w - lw, y, lw, h);
  }
}

function bar(g, md, k, color) {
  const x = Math.round(centerX(md.c, md.r) - 10), y = tileOriginY(md.c, md.r) + 28;
  g.fillStyle = '#0b0707'; g.fillRect(x - 1, y - 1, 22, 4);
  g.fillStyle = '#2a2d38'; g.fillRect(x, y, 20, 2);
  g.fillStyle = color; g.fillRect(x, y, Math.round(20 * Math.max(0, Math.min(1, k))), 2);
}

function drawPod(R, md, alpha) {
  const k = Math.min(1, (md.t + alpha) / POD_TICKS), fall = (1 - k) * (1 - k) * 180;
  const x = Math.round(centerX(md.c, md.r) - 16), y = Math.round(centerY(md.c, md.r) - 44 - fall);
  R.g.globalAlpha = 0.35 + 0.4 * k;
  R.g.fillStyle = '#000'; R.g.fillRect(Math.round(centerX(md.c, md.r) - 6 * k - 2), Math.round(centerY(md.c, md.r)), Math.round(12 * k + 4), 2);
  R.g.globalAlpha = 1;
  R.g.drawImage(R.assets.pod, x, y);
}

function drawDust(R, md) {
  const f = Math.min(5, Math.floor(md.t / 2));
  R.g.drawImage(R.assets.dust, f * 64, 0, 64, 64, Math.round(centerX(md.c, md.r) - 32), Math.round(centerY(md.c, md.r) - 40), 64, 64);
}

function drawPortal(R, p, now, lit) {
  const { g, assets: A } = R;
  const f = Math.floor(now / 140) % 4;
  const x = Math.round(centerX(p.c, p.r) - 48), y = Math.round(centerY(p.c, p.r) - 70);
  if (!lit) g.globalAlpha = 0.45;
  g.drawImage(A.portal, f * 96, 0, 96, 96, x, y, 96, 96);
  g.globalAlpha = 1;
}

// Insetos do Enxame: rastejador (kit craftpix reduzido, 2 diagonais espelhadas) e larva/bruto (Foozle reduzidos,
// linhas 0-2 mover baixo/cima/lado, 3-5 atacar baixo/cima/lado; o lado esquerdo é espelhado).
function drawEnemy(R, it, now, tickF) {
  const { g, assets: A } = R, e = it.u, D = ENEMIES[e.type];
  const cx = Math.cos(e.dir), sy = Math.sin(e.dir);
  const atk = tickF - e.atk, attacking = atk >= 0 && atk < D.recarga * 0.8;
  // pequeno desvio por inseto para não ficarem todos empilhados no centro do hex
  const ox = ((e.id * 37) % 9) - 4, oy = ((e.id * 53) % 7) - 3;
  let x = Math.round(it.x) + ox, y = Math.round(it.y) + oy;
  if (attacking && atk < 4) { x += Math.round(cx * 3); y += Math.round(sy * 3); }
  g.save(); g.translate(x, y);
  if (D.sprite === 'alien') {
    const sheet = sy < -0.2 ? A.alienSU : A.alienSD, f = e.moving || attacking ? Math.floor(now / 90) % 6 : 0;
    if (cx < 0) g.scale(-1, 1);
    g.drawImage(sheet, f * 24, 0, 24, 24, -12, -14, 24, 24);
  } else {
    const dirRow = Math.abs(sy) > 0.5 ? (sy > 0 ? 0 : 1) : 2;
    if (dirRow === 2 && cx < 0) g.scale(-1, 1);
    // parado (linhas 0-2) ou a mover/investir (linhas 3-5); o ataque é uma investida curta
    const moving = e.moving || attacking;
    const row = dirRow + (moving ? 3 : 0), n = D.frames[moving ? 1 : 0];
    const f = Math.floor(now / (moving ? 80 : 140)) % n;
    g.drawImage(A[D.sprite], f * D.cw, row * 32, D.cw, 32, -D.cw / 2, -20, D.cw, 32);
  }
  g.restore();
}

// Colonos (Space Crew reduzido para 8x16): linhas baixo, esquerda, direita, cima; colunas parado 1-2, andar 1-4
function drawColono(R, it, now) {
  const u = it.u, cx = Math.cos(u.dir), sy = Math.sin(u.dir);
  const row = Math.abs(sy) > 0.5 ? (sy > 0 ? 0 : 3) : (cx < 0 ? 1 : 2);
  const f = u.moving ? 2 + Math.floor(now / 130) % 4 : Math.floor(now / 500) % 2;
  R.g.drawImage(R.assets.colono, f * 8, row * 16, 8, 16, Math.round(it.x) - 4, Math.round(it.y) - 14, 8, 16);
}

// Soldados Robot Warfare (CC0): 16x16, virados para a direita (espelho para a esquerda).
// Linhas: 0 parado, 3 a disparar, 5 morrer, 6 andar.
function drawSoldier(R, it, now, tickF) {
  const { g, assets: A } = R, u = it.u, img = A['inf_' + u.type];
  const firing = tickF - u.firing < 6;
  let row = 0, f = Math.floor(now / 400) % 2;
  if (firing) { row = 3; f = Math.floor((tickF - u.firing) / 2) % 2; }
  else if (u.moving) { row = 6; f = Math.floor(now / 130) % 3; }
  g.save(); g.translate(Math.round(it.x), Math.round(it.y));
  if (Math.cos(u.dir) < 0) g.scale(-1, 1);
  g.drawImage(img, f * 16, row * 16, 16, 16, -8, -13, 16, 16);
  g.restore();
}
function drawSoldierDeath(R, f, tickF) {
  const fr = Math.min(4, Math.floor((tickF - f.t) / 3));
  if (tickF - f.t > 38) return;
  R.g.save(); R.g.translate(f.x, f.y);
  if (Math.cos(f.dir) < 0) R.g.scale(-1, 1);
  R.g.globalAlpha = Math.min(1, (40 - (tickF - f.t)) / 10);
  R.g.drawImage(R.assets['inf_' + f.type], fr * 16, 5 * 16, 16, 16, -8, -13, 16, 16);
  R.g.restore();
}

// Animação de morte dos insetos Foozle (linhas 6-8), 2 ticks por frame
function drawDeath(R, f, tickF) {
  const D = ENEMIES[f.type], fr = Math.floor((tickF - f.t) / 2);
  if (fr < 0 || fr >= D.frames[2]) return;
  const cx = Math.cos(f.dir), sy = Math.sin(f.dir), dirRow = Math.abs(sy) > 0.5 ? (sy > 0 ? 0 : 1) : 2;
  const ox = ((f.id * 37) % 9) - 4, oy = ((f.id * 53) % 7) - 3;
  R.g.save(); R.g.translate(f.x + ox, f.y + oy);
  if (dirRow === 2 && cx < 0) R.g.scale(-1, 1);
  R.g.drawImage(R.assets[D.sprite], fr * D.cw, (6 + dirRow) * 32, D.cw, 32, -D.cw / 2, -20, D.cw, 32);
  R.g.restore();
}

// Mech reduzido (assets/units/mech_small.png, gerado por tools/build_mech_small.py).
// Linha = variante do corpo pela direção (horizontal, diagonal, diagonal espelhada, vertical) x frame;
// coluna = ângulo da arma (9 de baixo a cima pelo lado direito, +9 espelhados para o lado esquerdo).
const CELL_M = 24;
function drawMech(R, it, now) {
  const { g, assets: A } = R, u = it.u;
  const deg = u.dir * 180 / Math.PI;            // 0 = direita, 90 = baixo
  const a = ((deg % 360) + 360) % 360;
  let body = 0;
  if ((a > 22.5 && a < 67.5) || (a > 202.5 && a < 247.5)) body = 2;            // SE / NW
  else if ((a > 112.5 && a < 157.5) || (a > 292.5 && a < 337.5)) body = 1;     // SW / NE
  else if ((a >= 67.5 && a <= 112.5) || (a >= 247.5 && a <= 292.5)) body = 3;  // vertical
  const frame = u.moving ? Math.floor(now / 120) % 4 : 0;
  let d = ((deg + 180) % 360 + 360) % 360 - 180, gun;
  if (d > 90 || d < -90) { d = 180 - d; if (d > 180) d -= 360; gun = 9 + Math.max(0, Math.min(8, Math.round((90 - d) / 22.5))); }
  else gun = Math.max(0, Math.min(8, Math.round((90 - d) / 22.5)));
  const x = Math.round(it.x) - 12, y = Math.round(it.y) - 14;
  const arma = UNITS[u.type].arma || 1, sheet = arma === 1 ? A.mechSmall : A['mechSmall_' + arma];
  g.drawImage(sheet, gun * CELL_M, (body * 4 + frame) * CELL_M, CELL_M, CELL_M, x, y, CELL_M, CELL_M);
}

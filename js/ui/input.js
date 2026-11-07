// Entrada: rato, teclado e toque. Converte gestos em câmara, seleção e comandos para a fila.
import { screenToWorld, panBy, zoomAt, offsetX, offsetY } from '../render/camera.js';
import { pixelToHex } from '../sim/hex.js';
import { inBounds } from '../sim/map.js';
import { canBuild, moduleAt } from '../sim/economy.js';
import { idx } from '../sim/map.js';

const TAP_SLOP = 10;      // píxeis CSS antes de um toque passar a ser arrasto
const DOUBLE_MS = 320;

export function attachInput(canvas, ctx) {
  const { cam, ui, queue, getState, onChange } = ctx;
  const pointers = new Map();
  const keys = new Set();
  let pinch = null, lastMouse = null, lastClick = { t: 0, id: 0 };

  const dev = e => ({ x: e.clientX * cam.dpr, y: e.clientY * cam.dpr });
  const hexAt = p => { const w = screenToWorld(cam, p.x, p.y); const h = pixelToHex(w.x, w.y); return inBounds(getState().map, h.c, h.r) ? h : null; };
  const toScreen = u => ({ x: u.x * cam.s + offsetX(cam), y: (u.y - 2) * cam.s + offsetY(cam) });
  // Inimigo visível (ou portal) debaixo do ponteiro
  const enemyAt = p => {
    const s = getState(), w = screenToWorld(cam, p.x, p.y);
    let best = null, bd = 10 * 10;
    for (const e of s.enemies) {
      if (s.fog.seen[idx(s.map, e.c, e.r)] !== 2) continue;
      const dx = e.x - w.x, dy = (e.y - 4) - w.y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = { k: 'e', id: e.id }; }
    }
    if (best) return best;
    const h = hexAt(p), pt = h && s.portals.find(q => q.c === h.c && q.r === h.r);
    return pt && s.fog.seen[idx(s.map, pt.c, pt.r)] ? { k: 'p', id: pt.id } : null;
  };
  const unitAt = p => {
    const w = screenToWorld(cam, p.x, p.y);
    let best = null, bd = 9 * 9;
    for (const u of getState().units) { const dx = u.x - w.x, dy = (u.y - 2) - w.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = u; } }
    return best;
  };

  // --- ações partilhadas (rato, teclado, toque e botões da interface) ---
  const api = {
    select(ids, add = false) { if (!add) ui.selected.clear(); for (const id of ids) ui.selected.add(id); if (ids.length) ui.module = null; ui.mode = null; onChange(); },
    toggle(id) { ui.selected.has(id) ? ui.selected.delete(id) : ui.selected.add(id); onChange(); },
    clear() { ui.selected.clear(); ui.module = null; ui.mode = null; onChange(); },
    selectAll() { api.select(getState().units.map(u => u.id)); },
    setMode(mode) { ui.mode = ui.selected.size && ui.mode !== mode ? mode : null; onChange(); },
    startBuild(type) { ui.buildMenu = false; ui.mode = 'build'; ui.buildType = type; onChange(); },
    toggleBuildMenu() { ui.buildMenu = !ui.buildMenu; if (ui.mode === 'build') ui.mode = null; onChange(); },
    selectModule(id) { ui.selected.clear(); ui.module = id; ui.mode = null; onChange(); },
    train(unit) { if (ui.module) queue.push({ type: 'train', moduleId: ui.module, unit }); onChange(); },
    research(id) { if (ui.module) queue.push({ type: 'research', moduleId: ui.module, id }); onChange(); },
    cancelTrain() { if (ui.module) queue.push({ type: 'cancel', moduleId: ui.module }); onChange(); },
    stop() { if (ui.selected.size) queue.push({ type: 'stop', ids: [...ui.selected] }); ui.mode = null; onChange(); },
    hold() { if (ui.selected.size) queue.push({ type: 'hold', ids: [...ui.selected] }); ui.mode = null; onChange(); },
    attack(target) {
      if (!ui.selected.size || !target) return;
      queue.push({ type: 'attack', ids: [...ui.selected], target });
      ctx.sfx?.play('ordem');
      const s = getState(), t = (target.k === 'e' ? s.enemies : s.portals).find(x => x.id === target.id);
      if (t) ui.marker = { c: t.c, r: t.r, t: performance.now(), type: 'attack' };
      ui.mode = null; onChange();
    },
    order(type, h) {
      if (!h || !ui.selected.size) return;
      queue.push({ type, ids: [...ui.selected], c: h.c, r: h.r });
      ctx.sfx?.play('ordem');
      ui.marker = { c: h.c, r: h.r, t: performance.now(), type };
      ui.mode = null; onChange();
    },
    saveGroup(n) { ui.groups[n] = [...ui.selected]; onChange(); },
    recallGroup(n) {
      const alive = new Set(getState().units.map(u => u.id));
      const ids = (ui.groups[n] || []).filter(id => alive.has(id));
      if (!ids.length) return;
      const now = performance.now();
      if (ui.lastGroup && ui.lastGroup.n === n && now - ui.lastGroup.t < DOUBLE_MS) api.centerOn(ids);
      ui.lastGroup = { n, t: now };
      api.select(ids);
    },
    centerOn(ids) {
      const us = getState().units.filter(u => ids.includes(u.id));
      if (!us.length) return;
      cam.x = us.reduce((a, u) => a + u.x, 0) / us.length; cam.y = us.reduce((a, u) => a + u.y, 0) / us.length;
      panBy(cam, 0, 0);
    },
    toggleBoxMode() { ui.boxMode = !ui.boxMode; onChange(); },
  };

  function selectInBox(add) {
    const b = ui.box, x0 = Math.min(b.x0, b.x1), x1 = Math.max(b.x0, b.x1), y0 = Math.min(b.y0, b.y1), y1 = Math.max(b.y0, b.y1);
    const ids = getState().units.filter(u => { const p = toScreen(u); return p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1; }).map(u => u.id);
    if (ids.length || !add) api.select(ids, add);
  }

  function click(p, e) {
    const touch = e.pointerType !== 'mouse', shift = e.shiftKey;
    if (ui.mode === 'build') {
      const h = hexAt(p);
      if (!h) return;
      const why = canBuild(getState(), ui.buildType, h.c, h.r);
      if (why) { ctx.toast(why); return; }
      queue.push({ type: 'build', module: ui.buildType, c: h.c, r: h.r });
      if (!shift) ui.mode = null;
      onChange();
      return;
    }
    if (ui.mode === 'attack') { const en = enemyAt(p); en ? api.attack(en) : api.order('amove', hexAt(p)); return; }
    if (ui.mode) { api.order(ui.mode, hexAt(p)); return; }
    const u = unitAt(p);
    if (u) {
      const now = performance.now();
      if (!touch && lastClick.id === u.id && now - lastClick.t < DOUBLE_MS) {
        // duplo clique: todos os mechs visíveis
        const vis = getState().units.filter(o => { const q = toScreen(o); return q.x >= 0 && q.y >= 0 && q.x <= cam.w && q.y <= cam.h; });
        api.select(vis.map(o => o.id));
      } else if (shift) api.toggle(u.id);
      else if (touch && ui.selected.size === 1 && ui.selected.has(u.id)) api.clear();
      else api.select([u.id]);
      lastClick = { t: now, id: u.id };
      return;
    }
    if (touch && ui.selected.size) { const en = enemyAt(p); en ? api.attack(en) : api.order('move', hexAt(p)); return; }
    const hh = hexAt(p), md = hh && moduleAt(getState(), hh.c, hh.r);
    if (md) { api.selectModule(md.id); return; }
    if (touch) { ui.hover = hexAt(p); onChange(); return; }
    if (!shift) api.clear();
  }

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  const off = () => ctx.active && !ctx.active();
  canvas.addEventListener('pointerdown', e => {
    if (off()) return;
    canvas.setPointerCapture(e.pointerId);
    const p = dev(e);
    let kind = 'pan';
    if (e.pointerType === 'mouse') {
      if (e.button === 2) {
        if (ui.mode) { ui.mode = null; onChange(); return; }
        const en = enemyAt(p);
        en ? api.attack(en) : api.order('move', hexAt(p));
        return;
      }
      kind = e.button === 1 || keys.has(' ') ? 'pan' : 'box';
    } else if (ui.boxMode) kind = 'box';
    pointers.set(e.pointerId, { start: p, last: p, moved: false, kind });
    if (pointers.size === 2) {
      for (const q of pointers.values()) q.moved = true;
      ui.box = null;
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.last.x - b.last.x, a.last.y - b.last.y), mx: (a.last.x + b.last.x) / 2, my: (a.last.y + b.last.y) / 2 };
    }
  });
  canvas.addEventListener('pointermove', e => {
    const p = dev(e), pt = pointers.get(e.pointerId);
    if (e.pointerType === 'mouse') lastMouse = p;
    if (!pt) return;
    if (pointers.size === 2 && pinch) {
      pt.last = p;
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.last.x - b.last.x, a.last.y - b.last.y), mx = (a.last.x + b.last.x) / 2, my = (a.last.y + b.last.y) / 2;
      panBy(cam, mx - pinch.mx, my - pinch.my);
      if (d / pinch.d > 1.3) { zoomAt(cam, 1, mx, my); pinch.d = d; onChange(); }
      else if (d / pinch.d < 0.77) { zoomAt(cam, -1, mx, my); pinch.d = d; onChange(); }
      pinch.mx = mx; pinch.my = my;
      return;
    }
    if (Math.hypot(p.x - pt.start.x, p.y - pt.start.y) / cam.dpr > TAP_SLOP) pt.moved = true;
    if (pt.moved) {
      if (pt.kind === 'pan') panBy(cam, p.x - pt.last.x, p.y - pt.last.y);
      else ui.box = { x0: pt.start.x, y0: pt.start.y, x1: p.x, y1: p.y };
    }
    pt.last = p;
  });
  const end = e => {
    const pt = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pt || e.type === 'pointercancel') { ui.box = null; return; }
    if (pt.kind === 'box' && pt.moved && ui.box) {
      selectInBox(e.shiftKey);
      ui.box = null;
      if (e.pointerType !== 'mouse') ui.boxMode = false;
      onChange();
      return;
    }
    if (!pt.moved && (e.pointerType !== 'mouse' || e.button === 0)) click(dev(e), e);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { lastMouse = null; ui.hover = null; onChange(); } });

  let wheelAcc = 0;
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    wheelAcc += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
    const p = dev(e);
    if (Math.abs(wheelAcc) >= 80) { zoomAt(cam, wheelAcc < 0 ? 1 : -1, p.x, p.y); wheelAcc = 0; onChange(); }
  }, { passive: false });

  window.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea')) return;
    if (off()) return;
    const k = e.key.toLowerCase();
    keys.add(k);
    if (e.code.startsWith('Digit') && e.code !== 'Digit0') {
      const n = Number(e.code.slice(5));
      if (e.shiftKey) api.saveGroup(n); else api.recallGroup(n);
      return;
    }
    if (k === '+' || k === '=') { zoomAt(cam, 1); onChange(); }
    else if (k === '-' || k === '_') { zoomAt(cam, -1); onChange(); }
    else if (k === 'escape') { if (ui.buildMenu) { ui.buildMenu = false; onChange(); } else if (ui.mode) { ui.mode = null; onChange(); } else if (ui.selected.size || ui.module) api.clear(); else ctx.pause && ctx.pause(); }
    else if (k === 'b') api.toggleBuildMenu();
    else if (k === 's') api.stop();
    else if (k === 'm') api.setMode('move');
    else if (k === 'p') api.setMode('patrol');
    else if (k === 'a' && !(e.ctrlKey || e.metaKey)) api.setMode('attack');
    else if (k === 'h') api.hold();
    if (k === 'a' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); api.selectAll(); }
    if (k.startsWith('arrow') || k === ' ') e.preventDefault();
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  // Chamado em cada frame: câmara por teclado e contorno do hex debaixo do rato
  api.update = dtMs => {
    const sp = 700 * cam.dpr * dtMs / 1000;
    let dx = 0, dy = 0;
    if (keys.has('arrowleft')) dx += sp;
    if (keys.has('arrowright')) dx -= sp;
    if (keys.has('arrowup')) dy += sp;
    if (keys.has('arrowdown')) dy -= sp;
    if (dx || dy) panBy(cam, dx, dy);
    if (lastMouse) { const h = hexAt(lastMouse); if (!ui.hover || !h || h.c !== ui.hover.c || h.r !== ui.hover.r) ui.hover = h; }
    canvas.style.cursor = ui.mode ? ctx.cursors.order : ctx.cursors.normal;
  };
  return api;
}

// Minimapa: terreno (cor média de cada tile do atlas), fog of war, módulos, unidades, insetos visíveis,
// portais, objetivo e retângulo da câmara. Tocar ou arrastar move a câmara.
import { TERRAIN } from '../data/terrain.js';
import { idx } from '../sim/map.js';
import { HEX_W, ROW_H, centerX, centerY } from '../sim/hex.js';
import { offsetX, offsetY, clampCamera } from './camera.js';

const K = 4, KY = 3;   // píxeis do minimapa por hex (horizontal, vertical)

function tileColors(atlas) {
  const c = document.createElement('canvas'); c.width = atlas.width; c.height = atlas.height;
  const g = c.getContext('2d'); g.drawImage(atlas, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data, cols = TERRAIN.colunas, out = [];
  const n = (atlas.width / 32) * (atlas.height / 32);
  for (let v = 0; v < n; v++) {
    let r = 0, gg = 0, b = 0, k = 0;
    const x0 = (v % cols) * 32, y0 = Math.floor(v / cols) * 32;
    for (let y = y0 + 8; y < y0 + 26; y++) for (let x = x0 + 6; x < x0 + 26; x++) {
      const i = (y * c.width + x) * 4;
      if (d[i + 3] > 200) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; k++; }
    }
    out.push(k ? [r / k | 0, gg / k | 0, b / k | 0] : [0, 0, 0]);
  }
  return out;
}

export function createMinimap(canvas, atlas, cam, getState) {
  const colors = tileColors(atlas), g = canvas.getContext('2d');
  const base = document.createElement('canvas'), bg = base.getContext('2d');
  let lastBase = 0, mapKey = '';
  function rebuild(s) {
    const m = s.map, W = m.w * K + K / 2, H = m.h * KY + 1;
    if (base.width !== W || base.height !== H) { base.width = W; base.height = H; }
    const img = bg.createImageData(W, H), px = img.data, seen = s.fog.seen;
    for (let r = 0; r < m.h; r++) for (let c = 0; c < m.w; c++) {
      const i = idx(m, c, r), f = seen[i];
      let col = [5, 6, 10];
      if (f) {
        col = m.s[i] > 0 ? [143, 227, 255] : m.s[i] < 0 ? [214, 60, 200] : colors[m.v[i]];
        if (f === 1) col = col.map(v => v * 0.45 | 0);
      }
      const x0 = c * K + (r & 1) * (K / 2), y0 = r * KY;
      for (let y = y0; y < y0 + KY; y++) for (let x = x0; x < x0 + K; x++) {
        const o = (y * W + x) * 4; px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
      }
    }
    bg.putImageData(img, 0, 0);
  }
  const toMini = (wx, wy) => ({ x: wx / HEX_W * K, y: wy / ROW_H * KY });

  function draw(now) {
    const s = getState(), m = s.map;
    const key = m.w + 'x' + m.h + ':' + s.seed;
    if (key !== mapKey || now - lastBase > 300) { rebuild(s); lastBase = now; mapKey = key; }
    if (canvas.width !== base.width || canvas.height !== base.height) {
      canvas.width = base.width; canvas.height = base.height;
      const scale = Math.max(1, Math.floor(Math.min(180 / base.width, 120 / base.height) * 2) / 2);
      canvas.style.width = Math.round(base.width * scale) + 'px'; canvas.style.height = Math.round(base.height * scale) + 'px';
    }
    g.drawImage(base, 0, 0);
    const dot = (wx, wy, color, size = 2) => { const p = toMini(wx, wy); g.fillStyle = color; g.fillRect(Math.round(p.x) - (size >> 1), Math.round(p.y) - (size >> 1), size, size); };
    for (const u of s.units) dot(u.x, u.y, u.type === 'colono' ? '#ffffff' : '#7dff9a');
    for (const e of s.enemies) if (s.fog.seen[idx(m, e.c, e.r)] === 2) dot(e.x, e.y, '#ff4d4d');
    const M = s.mission;
    if (M && (M.alvo || M.tipo === 'escoltar') && Math.floor(now / 400) % 2) {
      const a = M.alvo || m.start; dot(centerX(a.c, a.r), centerY(a.c, a.r), '#ffd25a', 4);
    }
    // Retângulo da câmara
    const tl = toMini(-offsetX(cam) / cam.s, -offsetY(cam) / cam.s), br = toMini((cam.w - offsetX(cam)) / cam.s, (cam.h - offsetY(cam)) / cam.s);
    g.strokeStyle = '#8fe3ff'; g.lineWidth = 1;
    g.strokeRect(Math.round(tl.x) + 0.5, Math.round(tl.y) + 0.5, Math.max(2, Math.round(br.x - tl.x) - 1), Math.max(2, Math.round(br.y - tl.y) - 1));
  }

  // Tocar ou arrastar no minimapa move a câmara
  let dragging = false;
  const move = e => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width * canvas.width, my = (e.clientY - rect.top) / rect.height * canvas.height;
    cam.x = mx / K * HEX_W; cam.y = my / KY * ROW_H; clampCamera(cam);
  };
  canvas.addEventListener('pointerdown', e => { dragging = true; canvas.setPointerCapture(e.pointerId); move(e); e.preventDefault(); });
  canvas.addEventListener('pointermove', e => { if (dragging) move(e); });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  return { draw };
}

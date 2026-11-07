// Câmara com zoom em múltiplos inteiros: 1 píxel da arte = 's' píxeis do ecrã (dispositivo).
export function createCamera() {
  return { x: 0, y: 0, s: 3, sMin: 1, sMax: 8, w: 0, h: 0, dpr: 1, worldW: 1000, worldH: 1000 };
}
export function resizeCamera(cam, canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(window.innerWidth * dpr), h = Math.round(window.innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const first = cam.w === 0;
  cam.w = w; cam.h = h; cam.dpr = dpr;
  cam.sMin = Math.max(1, Math.round(dpr));
  cam.sMax = Math.max(cam.sMin + 2, Math.round(7 * dpr));
  if (first) cam.s = Math.round(dpr * (window.innerWidth < 900 ? 2.4 : 3));
  cam.s = Math.min(cam.sMax, Math.max(cam.sMin, cam.s));
  clampCamera(cam);
}
export const offsetX = cam => Math.round(cam.w / 2 - cam.x * cam.s);
export const offsetY = cam => Math.round(cam.h / 2 - cam.y * cam.s);
export const screenToWorld = (cam, sx, sy) => ({ x: (sx - offsetX(cam)) / cam.s, y: (sy - offsetY(cam)) / cam.s });

export function clampCamera(cam) {
  const hw = cam.w / 2 / cam.s, hh = cam.h / 2 / cam.s, m = 24;
  const clamp = (v, lo, hi) => lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v));
  cam.x = clamp(cam.x, hw - m, cam.worldW - hw + m);
  cam.y = clamp(cam.y, hh - m, cam.worldH - hh + m);
}
export function panBy(cam, dxScreen, dyScreen) { cam.x -= dxScreen / cam.s; cam.y -= dyScreen / cam.s; clampCamera(cam); }

// Muda o zoom mantendo fixo o ponto do mundo debaixo de (sx, sy).
export function zoomAt(cam, delta, sx = cam.w / 2, sy = cam.h / 2) {
  const ns = Math.min(cam.sMax, Math.max(cam.sMin, cam.s + delta));
  if (ns === cam.s) return;
  const before = screenToWorld(cam, sx, sy);
  cam.s = ns;
  cam.x = before.x - (sx - cam.w / 2) / cam.s;
  cam.y = before.y - (sy - cam.h / 2) / cam.s;
  clampCamera(cam);
}

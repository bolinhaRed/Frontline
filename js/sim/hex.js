// Geometria hexagonal "odd-r" (hexes de topo bicudo, linhas ímpares desviadas para a direita).
// Medidas em píxeis da arte original (1x).
export const HEX_W = 24;        // passo horizontal
export const ROW_H = 19;        // passo vertical entre linhas
export const CELL = 32;         // tamanho da célula de cada tile no atlas
export const CENTER_DX = 16;    // centro da face do hex dentro da célula
export const CENTER_DY = 18;
const Y_SCALE = (HEX_W * Math.sqrt(3) / 2) / ROW_H;

export const tileOriginX = (c, r) => c * HEX_W + (r & 1) * (HEX_W / 2);
export const tileOriginY = (c, r) => r * ROW_H;
export const centerX = (c, r) => tileOriginX(c, r) + CENTER_DX;
export const centerY = (c, r) => tileOriginY(c, r) + CENTER_DY;

const EVEN = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
const ODD = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];
export function neighbors(c, r) {
  const d = (r & 1) ? ODD : EVEN;
  return d.map(([dc, dr]) => ({ c: c + dc, r: r + dr }));
}
export function toCube(c, r) { const q = c - ((r - (r & 1)) >> 1); return { q, r, s: -q - r }; }
export function fromCube(q, r) { return { c: q + ((r - (r & 1)) >> 1), r }; }
export function distance(a, b) {
  const A = toCube(a.c, a.r), B = toCube(b.c, b.r);
  return Math.max(Math.abs(A.q - B.q), Math.abs(A.r - B.r), Math.abs(A.s - B.s));
}
function cubeRound(q, r, s) {
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
  return fromCube(rq, rr);
}
// Linha de hexes entre a e b (inclui ambos).
export function line(a, b) {
  const n = distance(a, b), A = toCube(a.c, a.r), B = toCube(b.c, b.r), out = [];
  for (let i = 0; i <= n; i++) {
    const t = n === 0 ? 0 : i / n;
    out.push(cubeRound(A.q + (B.q - A.q) * t + 1e-6, A.r + (B.r - A.r) * t + 2e-6, A.s + (B.s - A.s) * t - 3e-6));
  }
  return out;
}
// Hex cuja face está mais próxima de um ponto do mundo.
export function pixelToHex(x, y) {
  const rg = Math.round((y - CENTER_DY) / ROW_H);
  let best = null, bd = Infinity;
  for (let r = rg - 1; r <= rg + 1; r++) {
    const cg = Math.round((x - CENTER_DX - (r & 1) * (HEX_W / 2)) / HEX_W);
    for (let c = cg - 1; c <= cg + 1; c++) {
      const dx = x - centerX(c, r), dy = (y - centerY(c, r)) * Y_SCALE, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = { c, r }; }
    }
  }
  return best;
}
// Todos os hexes até um raio (sem verificar limites do mapa).
export function range(center, radius) {
  const C = toCube(center.c, center.r), out = [];
  for (let dq = -radius; dq <= radius; dq++)
    for (let dr = Math.max(-radius, -dq - radius); dr <= Math.min(radius, -dq + radius); dr++)
      out.push(fromCube(C.q + dq, C.r + dr));
  return out;
}

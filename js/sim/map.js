// Mapa: grelha de terrenos. Só dados simples, para ser serializável.
import { TERRAIN } from '../data/terrain.js';

export const TERRAIN_IDS = Object.keys(TERRAIN.terrenos);
export const T = Object.fromEntries(TERRAIN_IDS.map((id, i) => [id, i]));
export const terrainDef = (ti) => TERRAIN.terrenos[TERRAIN_IDS[ti]];

export function createMap(w, h) {
  // s: estrutura em cada hex (0 nenhuma, <0 portal com esse id, >0 id do módulo); ore: cristal restante por hex
  return { w, h, t: new Array(w * h).fill(T.solo), v: new Array(w * h).fill(0), s: new Array(w * h).fill(0), ore: new Array(w * h).fill(0), start: null, portals: [] };
}
export const inBounds = (m, c, r) => c >= 0 && r >= 0 && c < m.w && r < m.h;
export const idx = (m, c, r) => r * m.w + c;
export const getT = (m, c, r) => m.t[idx(m, c, r)];
export function setT(m, c, r, ti, variant) {
  const i = idx(m, c, r);
  m.t[i] = ti;
  const vs = terrainDef(ti).variantes;
  m.v[i] = vs[(variant ?? 0) % vs.length];
}
// Custo de entrar num hex: 0 = intransitável.
export function moveCost(m, c, r) {
  if (!inBounds(m, c, r)) return 0;
  const i = idx(m, c, r);
  if (m.s[i] !== 0) return 0;
  return terrainDef(m.t[i]).custo;
}
export const blocksVision = (m, c, r) => inBounds(m, c, r) && terrainDef(getT(m, c, r)).bloqueiaVisao;

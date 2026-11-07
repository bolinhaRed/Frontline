// Gerador pseudoaleatório com semente (mulberry32). O estado é um número,
// guardado dentro do estado do jogo para a simulação ser determinística e serializável.
export function rngNext(holder) {
  holder.rng = (holder.rng + 0x6D2B79F5) >>> 0;
  let t = holder.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const rngInt = (h, min, max) => min + Math.floor(rngNext(h) * (max - min + 1));
export const rngPick = (h, arr) => arr[Math.floor(rngNext(h) * arr.length)];

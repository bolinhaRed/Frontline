// Ciclo com simulação em passo fixo e desenho interpolado.
export const TICK_HZ = 20;
export const TICK_MS = 1000 / TICK_HZ;

export function startLoop({ tick, frame }) {
  let last = performance.now(), acc = 0, running = true;
  function onFrame(now) {
    if (!running) return;
    let dt = now - last; last = now;
    if (dt > 250) dt = 250;            // após pausas longas não tenta recuperar tudo
    acc += dt;
    let steps = 0;
    while (acc >= TICK_MS && steps < 5) { tick(); acc -= TICK_MS; steps++; }
    if (steps === 5) acc = 0;
    frame(acc / TICK_MS, now, dt);
    requestAnimationFrame(onFrame);
  }
  document.addEventListener('visibilitychange', () => { last = performance.now(); acc = 0; });
  requestAnimationFrame(onFrame);
  return { stop: () => { running = false; } };
}

// Fila de comandos: a interface (e no futuro a IA) só escreve aqui; a simulação consome no início de cada tick.
export function createCommandQueue() {
  let pending = [];
  return {
    push(cmd) { pending.push(cmd); },
    drain() { const out = pending; pending = []; return out; },
  };
}

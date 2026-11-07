// Mensagens da simulação para a interface (só as últimas 8).
// Eventos do tick (para sons e efeitos na interface); a simulação não depende deles.
export const ev = (s, k, x, y) => { if (s.ev) s.ev.push({ k, x: Math.round(x || 0), y: Math.round(y || 0) }); };
export const log = (s, txt) => { s.log.push({ t: s.tick, txt }); if (s.log.length > 8) s.log.shift(); };

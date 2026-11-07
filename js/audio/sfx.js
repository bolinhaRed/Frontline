// Efeitos sonoros com Web Audio. Os sons tocam a partir de eventos da simulação (state.ev),
// com volume pela distância ao centro do ecrã e limite de repetições para não saturar.
export const SFX_NAMES = ['tiro_mech', 'tiro_torre', 'impacto', 'morte_inseto', 'explosao_peq', 'explosao_grande', 'pod_queda', 'pod_aterra',
  'modulo_pronto', 'mech_pronto', 'clique', 'ordem', 'recusado', 'vaga', 'ataque', 'vitoria', 'derrota'];
// intervalo mínimo entre dois sons iguais (ms) e volume base
const RULES = { tiro_mech: [70, 0.35], tiro_torre: [90, 0.4], impacto: [60, 0.3], morte_inseto: [60, 0.6], explosao_peq: [80, 0.7],
  explosao_grande: [150, 0.9], pod_queda: [200, 0.6], pod_aterra: [200, 0.8], modulo_pronto: [300, 0.7], mech_pronto: [300, 0.7],
  clique: [40, 0.5], ordem: [80, 0.5], recusado: [300, 0.6], vaga: [2000, 0.9], ataque: [8000, 0.8], vitoria: [0, 0.9], derrota: [0, 0.9] };
const POSITIONAL = new Set(['tiro_mech', 'tiro_torre', 'impacto', 'morte_inseto', 'explosao_peq', 'explosao_grande', 'pod_queda', 'pod_aterra', 'modulo_pronto', 'mech_pronto']);

export function createSfx(urls) {
  let ctx = null, master = null, muted = false;
  const buffers = {}, last = {};
  try { muted = localStorage.getItem('frontline.som') === 'off'; } catch (e) { /* sem armazenamento */ }
  async function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
    await Promise.all(SFX_NAMES.map(async n => {
      try { const r = await fetch(urls[n]); buffers[n] = await ctx.decodeAudioData(await r.arrayBuffer()); } catch (e) { /* som em falta: continua sem ele */ }
    }));
  }
  // Os browsers só deixam tocar som depois de um gesto do jogador
  const unlock = () => { init().then(() => ctx && ctx.state === 'suspended' && ctx.resume()); };
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
  return {
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('frontline.som', muted ? 'off' : 'on'); } catch (e) { /* ignora */ }
      if (master) master.gain.value = muted ? 0 : 0.8;
      return muted;
    },
    // where: { x, y } no mundo; view: função que dá a posição no ecrã de 0 a 1 (ou null se não houver)
    play(name, where, view) {
      if (!ctx || muted || !buffers[name] || ctx.state !== 'running') return;
      const [gap, vol] = RULES[name] || [0, 0.7], now = performance.now();
      if (now - (last[name] || 0) < gap) return;
      let v = vol;
      if (where && view && POSITIONAL.has(name)) {
        const p = view(where.x, where.y);
        const off = Math.max(0, Math.abs(p.x - 0.5) - 0.5, Math.abs(p.y - 0.5) - 0.5);
        if (name.startsWith('tiro') || name === 'impacto') { if (off > 0) return; }
        else v *= off > 0 ? Math.max(0.15, 1 - off * 2) : 1;
      }
      last[name] = now;
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buffers[name]; src.playbackRate.value = name.startsWith('tiro') || name === 'impacto' ? 0.94 + Math.random() * 0.12 : 1;
      g.gain.value = v; src.connect(g); g.connect(master); src.start();
    },
  };
}

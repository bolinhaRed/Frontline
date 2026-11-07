// Música do jogo (faixas fornecidas pelo Vasco). Cada momento tem uma lista que roda:
// 'titulo', 'mapa' (mapa estratégico e diálogos), 'jogo' e 'tensao' (durante as vagas).
// Usa elementos <audio> em streaming (pouca memória no telemóvel) e transições de 2 s.
export const MUSIC_TRACKS = {
  titulo: ['titulo'],
  mapa: ['mapa_1', 'mapa_2'],
  jogo: ['jogo_1', 'jogo_2', 'jogo_3'],
  tensao: ['tensao_1', 'tensao_2', 'tensao_3'],
};
export const MUSIC_NAMES = Object.values(MUSIC_TRACKS).flat();
const VOL = 0.55, FADE_MS = 2000;

export function createMusic(urls, isMuted) {
  let enabled = true, unlocked = false, wanted = null, cur = null;
  try { enabled = localStorage.getItem('frontline.musica') !== 'off'; } catch (e) { /* sem armazenamento */ }
  const next = { titulo: 0, mapa: 0, jogo: 0, tensao: 0 };
  const level = () => (enabled && !isMuted() ? VOL : 0);

  function fade(el, to, ms, done) {
    const from = el.volume, t0 = performance.now();
    clearInterval(el._fade);
    el._fade = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k >= 1) { clearInterval(el._fade); if (done) done(); }
    }, 50);
  }
  function start(mood) {
    const list = MUSIC_TRACKS[mood], name = list[next[mood] % list.length];
    next[mood]++;
    const el = new Audio(urls[name]);
    el.loop = list.length === 1;
    el.volume = 0;
    el.addEventListener('ended', () => { if (cur && cur.el === el) { cur = null; start(mood); } });
    const old = cur;
    cur = { el, mood };
    el.play().then(() => fade(el, level(), FADE_MS)).catch(() => { /* o browser ainda não deixa tocar */ });
    if (old) fade(old.el, 0, FADE_MS, () => { old.el.pause(); old.el.removeAttribute('src'); old.el.load(); });
  }
  const unlock = () => { if (!unlocked) { unlocked = true; if (wanted) start(wanted); } else if (cur && cur.el.paused) cur.el.play().catch(() => {}); };
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  return {
    play(mood) {
      if (wanted === mood) return;
      wanted = mood;
      if (unlocked) start(mood);
    },
    refresh() { if (cur) fade(cur.el, level(), 300); },
    get enabled() { return enabled; },
    toggle() {
      enabled = !enabled;
      try { localStorage.setItem('frontline.musica', enabled ? 'on' : 'off'); } catch (e) { /* ignora */ }
      this.refresh();
      return enabled;
    },
  };
}

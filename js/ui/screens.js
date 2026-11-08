// Ecrãs fora do jogo: título, mapa estratégico, diálogos e menu de pausa.
import { MISSIONS, CHARACTERS, missionById, regionState } from '../data/campaign.js';
import { TERRAIN } from '../data/terrain.js';
import { MODULES } from '../data/modules.js';
import { UNITS } from '../data/units.js';
import { RESEARCH } from '../data/research.js';

const $ = id => document.getElementById(id);
const show = (id, on) => { $(id).hidden = !on; };
const NAMES = id => id === 'orbital' ? 'Bombardeamento orbital' : (MODULES[id] || UNITS[id] || RESEARCH[id] || { nome: id }).nome;

export function createScreens({ atlas, portraits, actions }) {
  const tileIcon = v => {
    const c = document.createElement('canvas'); c.width = 32; c.height = 32;
    c.getContext('2d').drawImage(atlas, (v % TERRAIN.colunas) * 32, Math.floor(v / TERRAIN.colunas) * 32, 32, 32, 0, 0, 32, 32);
    return c.toDataURL();
  };
  const icons = {};
  for (const m of MISSIONS) icons[m.id] = tileIcon(TERRAIN.terrenos[m.tile].variantes[0]);

  // ---------- título ----------
  $('t-campaign').onclick = () => actions.openMap();
  $('t-continue').onclick = () => actions.continueGame();
  $('t-skirmish').onclick = () => actions.skirmishOptions();
  $('t-survival').onclick = () => actions.survival();
  $('t-help').onclick = () => $('help').toggleAttribute('hidden');

  // ---------- mapa estratégico ----------
  let selected = null, progress = null;
  const svg = $('map-lines'), nodes = $('map-nodes');
  function renderMap() {
    svg.replaceChildren(); nodes.replaceChildren();
    for (const m of MISSIONS) for (const d of m.depois) {
      const a = missionById(d), ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y); ln.setAttribute('x2', m.x); ln.setAttribute('y2', m.y);
      ln.setAttribute('class', regionState(progress, m) === 'bloqueada' ? 'off' : '');
      svg.append(ln);
    }
    for (const m of MISSIONS) {
      const st = regionState(progress, m), b = document.createElement('button');
      b.type = 'button'; b.className = `node ${st}${selected === m.id ? ' sel' : ''}`;
      b.style.left = m.x + '%'; b.style.top = m.y + '%';
      b.innerHTML = `<img alt="" src="${icons[m.id]}"><span>${m.regiao}</span>`;
      b.setAttribute('aria-label', `${m.regiao}: ${m.nome} (${st})`);
      b.onclick = () => { selected = m.id; renderMap(); };
      nodes.append(b);
    }
    const done = MISSIONS.filter(m => progress.concluidas.includes(m.id)).length;
    $('map-progress').textContent = `${done} de 6 missões concluídas`;
    const m = missionById(selected), st = regionState(progress, m);
    const label = { concluida: 'Conquistada', disponivel: 'Disponível', perdida: 'Entregue ao Enxame', bloqueada: 'Bloqueada' }[st];
    $('mp-title').textContent = m.nome;
    $('mp-region').textContent = `${m.regiao} · ${label}`;
    $('mp-text').textContent = m.resumo;
    $('mp-goal').textContent = m.objetivoTxt;
    $('mp-reward').textContent = m.recompensa.length ? 'Desbloqueia: ' + m.recompensa.map(NAMES).join(', ') : 'Missão final';
    $('mp-start').disabled = !(st === 'disponivel' || st === 'concluida');
    $('mp-start').textContent = st === 'concluida' ? 'Jogar outra vez' : 'Iniciar missão';
  }
  $('mp-start').onclick = () => actions.startMission(selected);
  $('map-back').onclick = () => actions.title();
  $('map-reset').onclick = () => { if (confirm('Apagar todo o progresso da campanha?')) actions.resetCampaign(); };

  // ---------- diálogos ----------
  let lines = [], at = 0, done = null;
  function renderLine() {
    const [who, text] = lines[at], ch = CHARACTERS[who];
    $('dlg-name').textContent = ch.nome;
    $('dlg-text').textContent = text;
    $('dlg-portrait').style.backgroundImage = `url(${portraits[ch.retrato]})`;
    $('dlg-next').textContent = at < lines.length - 1 ? 'Seguinte' : 'Continuar';
  }
  $('dlg-next').onclick = () => { if (++at < lines.length) renderLine(); else { show('dialog', false); done(); } };
  $('dlg-skip').onclick = () => { show('dialog', false); done(); };

  // ---------- pausa ----------
  $('p-resume').onclick = () => actions.resume();
  $('p-save').onclick = () => actions.saveAndExit();
  $('p-restart').onclick = () => actions.restart();
  $('p-quit').onclick = () => actions.title();

  return {
    title(hasSave) { show('screen-title', true); show('screen-map', false); $('t-continue').hidden = !hasSave; },
    map(p) {
      progress = p;
      const avail = MISSIONS.find(m => regionState(p, m) === 'disponivel');
      selected = (avail || MISSIONS[MISSIONS.length - 1]).id;
      show('screen-title', false); show('screen-map', true); renderMap();
    },
    hideAll() { show('screen-title', false); show('screen-map', false); show('screen-skirmish', false); show('pause', false); show('dialog', false); },
    dialog(ls, then) { lines = ls; at = 0; done = then; show('dialog', true); renderLine(); },
    pause(on, canSave) { show('pause', on); $('p-save').hidden = !canSave; },
  };
}

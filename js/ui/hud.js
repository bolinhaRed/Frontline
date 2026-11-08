// Painéis HTML por cima do canvas. Mostram estado e chamam as ações da entrada; não têm lógica de jogo.
import { terrainDef, getT, inBounds } from '../sim/map.js';
import { UNITS } from '../data/units.js';
import { MODULES, BUILD_ORDER } from '../data/modules.js';
import { RESEARCH, RESEARCH_ORDER } from '../data/research.js';
import { missing, allowed, canTrain, canResearch, queueProgress, canOrbital } from '../sim/economy.js';
import { ORBITAL } from '../data/modules.js';
import { survivalScore } from '../data/campaign.js';
import { TERRAIN } from '../data/terrain.js';
import { TICK_HZ } from '../core/loop.js';
import { ENEMIES, PORTAL } from '../data/enemies.js';

const $ = id => document.getElementById(id);
const LONG_MS = 500;

export function createHud({ cam, ui, getState, actions, input, iconUrls, atlas, sfx }) {
  const soundBtn = $('btn-sound');
  const showSound = () => { soundBtn.classList.toggle('off', sfx.muted); soundBtn.setAttribute('aria-label', sfx.muted ? 'Ligar o som' : 'Desligar o som'); };
  soundBtn.onclick = () => { sfx.toggle(); showSound(); actions.soundChanged && actions.soundChanged(); };
  showSound();
  document.addEventListener('click', e => { if (e.target.closest('button')) sfx.play('clique'); });
  // Ícones do menu de construção recortados do atlas (sem alterar o PNG)
  const tileIcon = v => {
    const c = document.createElement('canvas'); c.width = 32; c.height = 32;
    c.getContext('2d').drawImage(atlas, (v % TERRAIN.colunas) * 32, Math.floor(v / TERRAIN.colunas) * 32, 32, 32, 0, 0, 32, 32);
    return c.toDataURL();
  };
  const bmButtons = BUILD_ORDER.map(type => {
    const d = MODULES[type], b = document.createElement('button');
    b.type = 'button'; b.className = 'bm-item';
    b.innerHTML = `<img alt="" src="${tileIcon(TERRAIN.modulos[type])}"><span><strong>${d.nome}</strong><small class="desc">${d.desc}</small></span><span class="cost">${d.custo}${d.gas ? ' +' + d.gas + 'g' : ''} · ${d.tempo}s</span>`;
    b.onclick = () => input.startBuild(type);
    $('bm-list').append(b);
    return [type, b];
  });
  $('btn-build').onclick = () => input.toggleBuildMenu();
  $('btn-orbital').onclick = () => input.startOrbital();
  // Ações do módulo selecionado (Quartel, Hangar, Laboratório), recriadas só quando mudam
  let actionsKey = '';
  const cost = d => `${d.custo}${d.gas ? ' +' + d.gas + 'g' : ''}`;
  function renderActions(s, md) {
    const d = MODULES[md.type], items = [];
    if (d.produz) for (const t of d.produz) if (allowed(s, t)) { const u = UNITS[t]; items.push({ k: 'u', id: t, nome: u.nome, cost: cost(u), why: canTrain(s, md, t), desc: u.desc }); }
    if (d.pesquisa) for (const id of RESEARCH_ORDER) if (allowed(s, id) && !s.tech.done.includes(id)) { const r = RESEARCH[id]; items.push({ k: 'r', id, nome: r.nome, cost: cost(r), why: canResearch(s, md, id), desc: r.desc }); }
    const key = md.id + '|' + md.fila.length + '|' + ui.mode + '|' + !!md.rally + '|' + items.map(i => i.id + ':' + (i.why || '')).join(',');
    if (key === actionsKey) return;
    actionsKey = key;
    const box = $('mod-actions');
    box.replaceChildren(...items.map(it => {
      const b = document.createElement('button'); b.type = 'button'; b.disabled = !!it.why;
      const sub = it.why && it.why !== 'Cristal insuficiente' && it.why !== 'Gás insuficiente' ? it.why : it.desc;
      b.innerHTML = `<span>${it.nome}<br><small>${sub}</small></span><span class="cost">${it.cost}</span>`;
      b.title = it.why || it.desc;
      b.onclick = () => it.k === 'u' ? input.train(it.id) : input.research(it.id);
      return b;
    }));
    if (d.produz) { const r = document.createElement('button'); r.type = 'button'; r.className = ui.mode === 'rally' ? 'on' : '';
      r.innerHTML = `<span>Ponto de encontro<br><small>${md.rally ? 'Toca noutro hex para mudar' : 'Para onde vão as unidades novas'}</small></span>`; r.onclick = () => input.startRally(); box.append(r); }
    if (md.fila.length) { const c = document.createElement('button'); c.type = 'button'; c.textContent = 'Cancelar o último da fila'; c.onclick = () => input.cancelTrain(); box.append(c); }
  }
  let toastTimer = null, lastLog = 0, lastAlert = -1;
  const toast = (txt, isAlert) => { const t = $('toast'); t.textContent = txt; t.hidden = false; t.classList.toggle('alerta', !!isAlert); clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, isAlert ? 4000 : 2600); };
  $('toast').onclick = () => { if ($('toast').classList.contains('alerta')) { actions.jumpAlert(); $('toast').hidden = true; } };
  $('tip-close').onclick = () => { $('tip').hidden = true; };
  $('zoom-in').onclick = () => actions.zoom(1);
  $('zoom-out').onclick = () => actions.zoom(-1);
  $('btn-menu').onclick = () => actions.pause();
  $('obj').onclick = () => actions.focusObjective();
  $('btn-help').onclick = () => $('help').toggleAttribute('hidden');
  $('help-close').onclick = () => $('help').setAttribute('hidden', '');
  $('btn-full').onclick = () => {
    const d = document;
    if (d.fullscreenElement) d.exitFullscreen?.();
    else d.documentElement.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  };
  if (!document.documentElement.requestFullscreen) $('btn-full').hidden = true;
  $('cmd-move').onclick = () => input.setMode('move');
  $('cmd-stop').onclick = () => input.stop();
  $('cmd-patrol').onclick = () => input.setMode('patrol');
  $('cmd-attack').onclick = () => input.setMode('attack');
  $('cmd-hold').onclick = () => input.hold();
  $('end-new').onclick = () => actions.endPrimary();
  $('end-alt').onclick = () => actions.endAlt();
  $('btn-all').onclick = () => input.selectAll();
  $('btn-box').onclick = () => input.toggleBoxMode();
  $('info-close').onclick = () => input.clear();
  window.addEventListener('keydown', e => { if (e.key === 'F2' || e.key === '`') { ui.debug = !ui.debug; $('debug').hidden = !ui.debug; } });

  // Grupos 1–5: toque curto seleciona (duas vezes centra), toque longo guarda a seleção
  const groupsEl = $('groups');
  for (let n = 1; n <= 5; n++) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.n = n; b.className = 'group';
    b.setAttribute('aria-label', `Grupo ${n}: toque para selecionar, toque longo para guardar`);
    let timer = null, long = false;
    b.onpointerdown = () => { long = false; timer = setTimeout(() => { long = true; input.saveGroup(n); navigator.vibrate?.(20); }, LONG_MS); };
    b.onpointerup = b.onpointerleave = () => clearTimeout(timer);
    b.onclick = () => { if (!long) input.recallGroup(n); };
    b.oncontextmenu = e => e.preventDefault();
    groupsEl.append(b);
  }

  let iconsKey = '';
  function renderIcons(sel) {
    const key = sel.map(u => u.id).join(',');
    if (key === iconsKey) return;
    iconsKey = key;
    const box = $('sel-icons');
    box.replaceChildren(...sel.slice(0, 12).map(u => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'unit-icon';
      const cl = UNITS[u.type].classe;
      b.style.backgroundImage = `url(${iconUrls[cl === 'mech' ? 'mech' : 'inf_' + u.type]})`;
      if (cl === 'inf') { b.style.backgroundSize = '160px 224px'; b.style.backgroundPosition = '2px 0'; }
      if (cl === 'civil') { b.style.backgroundSize = '112px 128px'; b.style.backgroundPosition = '10px 2px'; }
      b.setAttribute('aria-label', `${UNITS[u.type].nome} ${u.id}`);
      b.onclick = e => e.shiftKey ? input.toggle(u.id) : input.select([u.id]);
      return b;
    }));
    box.hidden = sel.length < 2;
  }

  function update() {
    const s = getState();
    $('seed').textContent = s.seed;
    $('zoom-level').textContent = `${(cam.s / cam.dpr).toFixed(cam.s % cam.dpr ? 1 : 0)}×`;
    // Recursos (missões sem base não têm economia)
    $('res').hidden = !s.cfg.base; $('btn-build').hidden = !s.cfg.base;
    const orbOk = allowed(s, 'orbital') && s.modules.some(m => m.type === 'nucleo'), espera = Math.ceil((s.orbital.pronto - s.tick) / TICK_HZ);
    $('btn-orbital').hidden = !orbOk;
    if (orbOk) { $('btn-orbital').firstChild.textContent = espera > 0 ? `Orbital ${espera}s ` : 'Orbital '; $('btn-orbital').disabled = espera > 0; $('btn-orbital').classList.toggle('on', ui.mode === 'orbital'); }
    $('r-cristal').textContent = Math.floor(s.res.cristal);
    $('r-gas').textContent = Math.floor(s.res.gas);
    $('r-energia').textContent = `${s.power.prod}/${s.power.cons}`;
    $('r-energia').classList.toggle('warn', s.power.ratio < 1);
    const queued = s.modules.reduce((a, md) => a + (MODULES[md.type].pesquisa ? 0 : md.fila.reduce((b, it) => b + UNITS[it].pop, 0)), 0);
    $('r-pop').textContent = `${s.pop.used}${queued ? '+' + queued : ''}/${s.pop.cap}`;
    $('r-pop').classList.toggle('warn', s.pop.used + queued >= s.pop.cap);
    // Mensagens da simulação
    const last = s.log.at(-1);
    if (last && (last.t !== lastLog.t || last.txt !== lastLog.txt)) { if (lastLog !== 0) toast(last.txt); lastLog = last; }
    else if (!last) lastLog = { t: -1 };
    // Menu de construção
    $('build-menu').hidden = !ui.buildMenu;
    $('btn-build').classList.toggle('on', !!ui.buildMenu || ui.mode === 'build');
    for (const [type, b] of bmButtons) {
      const d = MODULES[type], req = missing(s, d.requer);
      b.hidden = !allowed(s, type);
      b.disabled = !!req || s.res.cristal < d.custo || s.res.gas < (d.gas || 0);
      const small = b.querySelector('.desc'); small.textContent = req || d.desc; small.classList.toggle('req', !!req);
    }
    // Módulo selecionado
    const md = ui.module ? s.modules.find(x => x.id === ui.module) : null;
    if (ui.module && !md) ui.module = null;
    const prod = md && md.fase === 'ativo' && (MODULES[md.type].produz || MODULES[md.type].pesquisa);
    $('mod-actions').hidden = !prod;
    if (prod) renderActions(s, md); else actionsKey = '';
    const sel = s.units.filter(u => ui.selected.has(u.id));
    $('commands').hidden = !sel.length;
    for (const [id, mode] of [['cmd-move', 'move'], ['cmd-patrol', 'patrol'], ['cmd-attack', 'attack']]) $(id).classList.toggle('on', ui.mode === mode);
    // Vagas, alertas e fim da partida
    const left = Math.max(0, Math.ceil((s.swarm.next - s.tick) / TICK_HZ));
    $('r-wave').parentElement.hidden = !s.swarm.cfg || !s.portals.length;
    $('r-wave').textContent = `Vaga ${s.swarm.wave + 1} em ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    // Objetivo da missão
    const M = s.mission, mmss = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    const rest = M ? Math.max(0, M.segundos - Math.floor(s.tick / TICK_HZ)) : 0;
    $('obj-title').textContent = actions.missionName();
    $('obj-text').textContent = !M ? '' : M.tipo === 'chegar' ? 'Leva um soldado até à bandeira'
      : M.tipo === 'sobreviver' ? `Aguenta mais ${mmss(rest)}`
      : M.tipo === 'defender' ? `Defende a plataforma mais ${mmss(rest)}`
      : M.tipo === 'escoltar' ? `Colonos a salvo ${M.salvos}/${M.minimo} · vivos ${s.units.filter(u => u.type === 'colono').length}`
      : M.tipo === 'destruir' ? 'Destrói o portal da bandeira'
      : M.tipo === 'sobrevivencia' ? `Vaga ${s.swarm.wave} · ${survivalScore(s)} pontos`
      : `Portais por destruir: ${s.portals.length}`;
    $('r-wave').classList.toggle('warn', left <= 15);
    if (s.alert && s.alert.t !== lastAlert && s.tick - s.alert.t < 5 && (lastAlert < 0 || s.alert.t - lastAlert > 15 * TICK_HZ)) { toast('A base está a ser atacada · toca para ir lá', true); lastAlert = s.alert.t; }
    $('end').hidden = !s.result;
    if (s.result) {
      $('end-title').textContent = s.result === 'vitoria' ? 'Vitória' : 'Derrota';
      const [lp, la] = actions.endLabels(s.result); $('end-new').textContent = lp; $('end-alt').textContent = la;
      const min = Math.floor(s.tick / TICK_HZ / 60), sec = Math.floor(s.tick / TICK_HZ) % 60;
      $('end-text').textContent = actions.endText(s.result);
    }
    $('btn-box').classList.toggle('on', !!ui.boxMode);
    for (const b of groupsEl.children) {
      const n = b.dataset.n, cnt = (ui.groups[n] || []).filter(id => s.units.some(u => u.id === id)).length;
      b.textContent = cnt ? `${n}·${cnt}` : n;
      b.classList.toggle('empty', !cnt);
    }
    renderIcons(sel);
    $('info-close').hidden = !(sel.length || md);
    if (ui.mode === 'orbital') {
      $('info-title').textContent = `${ORBITAL.nome} · ${ORBITAL.custo} cristais`;
      $('info-body').textContent = 'Toca no hex onde deve cair. Atinge também os 6 hexes à volta, 2 s depois.';
    } else if (ui.boxMode) {
      $('info-title').textContent = 'Seleção em área';
      $('info-body').textContent = 'Arrasta um dedo para desenhar um retângulo à volta das tropas.';
    } else if (ui.mode === 'build') {
      const d = MODULES[ui.buildType];
      $('info-title').textContent = `Construir ${d.nome} · ${d.custo} cristais`;
      $('info-body').textContent = d.sobre === 'cristal' ? 'Toca num hex de cristais dentro do território.' : d.sobre === 'geiser' ? 'Toca num géiser dentro do território.' : 'Toca num hex livre dentro do território. Esc ou botão direito cancela.';
    } else if (md) {
      const d = MODULES[md.type];
      $('info-title').textContent = d.nome;
      let t;
      if (md.fase === 'pod') t = 'Drop pod a caminho';
      else if (md.fase === 'obra') t = `Em construção · ${Math.floor(100 * md.t / (d.tempo * TICK_HZ))}%`;
      else {
        const parts = [`vida ${Math.ceil(md.hp)}/${d.vida}`, d.energia > 0 ? `+${d.energia} energia` : `consome ${-d.energia} de energia`];
        if (d.pop) parts.push(`+${d.pop} população`);
        if (d.taxa) parts.push(`jazida: ${Math.floor(s.map.ore[md.r * s.map.w + md.c])} cristais`);
        if (d.taxaGas) parts.push(`géiser: ${Math.floor(s.map.ore[md.r * s.map.w + md.c])} de gás`);
        if ((d.produz || d.pesquisa) && md.fila.length) {
          const it = md.fila[0], nome = (d.pesquisa ? RESEARCH[it] : UNITS[it]).nome;
          parts.push(`${d.pesquisa ? 'a investigar' : 'a produzir'} ${nome} ${Math.floor(100 * queueProgress(md))}% · fila ${md.fila.length}${md.bloqueado ? ' · sem espaço à volta' : ''}`);
        } else if (d.produz || d.pesquisa) parts.push('parado');
        if (d.territorio > 1) parts.push(`território: ${d.territorio} hexes`);
        if (d.dano) parts.push(`dispara até ${d.alcance} hexes`);
        if (s.power.ratio < 1 && d.energia < 0) parts.push('a trabalhar mais devagar por falta de energia');
        t = parts.join(' · ');
      }
      $('info-body').textContent = t;
    } else if (ui.mode) {
      $('info-title').textContent = ui.mode === 'move' ? 'Escolhe o destino' : ui.mode === 'attack' ? 'Escolhe o alvo ou o ponto de ataque' : ui.mode === 'rally' ? 'Escolhe o ponto de encontro' : 'Escolhe o fim da patrulha';
      $('info-body').textContent = 'Toca ou clica num hex. Botão direito ou Esc cancela.';
    } else if (sel.length === 1) {
      const u = sel[0];
      $('info-title').textContent = `${UNITS[u.type].nome} #${u.id}`;
      const n = u.path.length + (u.leg ? 1 : 0);
      const st = s.tick - u.firing < 12 ? 'A disparar' : u.hold ? 'A manter posição' : u.patrol ? 'A patrulhar' : u.amGoal ? 'A avançar em combate' : n ? `A caminho · ${n} ${n === 1 ? 'hex' : 'hexes'} até ao destino` : 'Parado';
      $('info-body').textContent = `Vida ${Math.ceil(u.hp)}/${UNITS[u.type].vida} · ${st}`;
    } else if (sel.length > 1) {
      const moving = sel.filter(u => u.leg || u.path.length).length;
      $('info-title').textContent = `${sel.length} unidades selecionadas`;
      $('info-body').textContent = moving ? `${moving} em movimento` : 'Todos parados';
    } else if (ui.hover && inBounds(s.map, ui.hover.c, ui.hover.r)) {
      const h = ui.hover, i = h.r * s.map.w + h.c;
      if (!s.fog.seen[i]) { $('info-title').textContent = 'Desconhecido'; $('info-body').textContent = 'Envia um mech para explorar.'; }
      else {
        const hm = s.map.s[i] > 0 ? s.modules.find(x => x.id === s.map.s[i]) : null;
        if (hm) { $('info-title').textContent = MODULES[hm.type].nome; $('info-body').textContent = 'Clica para selecionar.'; return; }
        const t = terrainDef(getT(s.map, h.c, h.r));
        const portal = s.portals.find(q => q.c === h.c && q.r === h.r);
        const bug = s.fog.seen[i] === 2 && s.enemies.find(e => e.c === h.c && e.r === h.r);
        if (portal) { $('info-title').textContent = PORTAL.nome; $('info-body').textContent = s.cfg.objetivo.tipo === 'sobrevivencia' ? 'Invulnerável na Sobrevivência: as vagas não param.' : `Vida ${Math.ceil(portal.hp)}/${PORTAL.vida} · gera as vagas. Destrói todos para ganhar.`; return; }
        if (bug) { $('info-title').textContent = ENEMIES[bug.type].nome; $('info-body').textContent = `Vida ${Math.ceil(bug.hp)}/${bug.maxHp || ENEMIES[bug.type].vida} · dano ${ENEMIES[bug.type].dano}${ENEMIES[bug.type].aereo ? ' · voa' : ''}`; return; }
        $('info-title').textContent = t.nome;
        const mov = portal || t.custo === 0 ? 'Intransitável' : t.custo === 1 ? 'Movimento normal' : 'Movimento lento';
        $('info-body').textContent = mov + (t.bloqueiaVisao ? ' · tapa a visão' : '');
      }
    } else { $('info-title').textContent = 'Nenhuma seleção'; $('info-body').textContent = 'Toca nas tropas para as juntar, ou usa Selecionar área.'; }
  }
  return {
    update, toast,
    tip(txt) { $('tip-text').textContent = txt; $('tip').hidden = false; clearTimeout(this._tipT); this._tipT = setTimeout(() => { $('tip').hidden = true; }, 12000); },
    debug(fps, renderer) { if (ui.debug) $('debug').textContent = `${fps.toFixed(0)} fps · tick ${getState().tick} · ${renderer.stats.tiles} hexes desenhados · zoom ${cam.s}`; },
  };
}

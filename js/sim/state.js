// Estado do jogo e passo de simulação. Sem DOM nem canvas: corre também em Node.
import { generateMap } from './mapgen.js';
import { createFog, updateFog } from './fog.js';
import { createUnit, orderMove, updateUnit, buildOccupancy, groupDestinations } from './units.js';
import { economyStep, placeActive, build, train, research, cancelQueue } from './economy.js';
import { shotsStep, towersStep, get } from './combat.js';
import { swarmStep, enemyStep, spawnEnemy } from './swarm.js';
import { range, distance } from './hex.js';
import { moveCost, inBounds, idx } from './map.js';
import { TICK_HZ } from '../core/loop.js';

import { SKIRMISH } from '../data/campaign.js';
import { setupMission, objectiveStep } from './mission.js';

export const MAP_W = SKIRMISH.w, MAP_H = SKIRMISH.h;
export const FOG_EVERY = 4;     // ticks (5 Hz a 20 Hz)

// cfg: configuração da partida (escaramuça por omissão, ou a de uma missão da campanha)
export function createGame(seed, cfg = SKIRMISH) {
  const s = { version: 5, seed: seed >>> 0, rng: seed >>> 0, tick: 0, nextId: 1, cfg, units: [], modules: [], modRev: 0,
    enemies: [], portals: [], shots: [], fx: [], ev: [], alert: null, result: null,
    swarm: { wave: 0, next: cfg.ondas ? cfg.ondas.primeira * TICK_HZ : 1e12, cfg: cfg.ondas }, stats: { abatidos: 0, perdidos: 0 },
    res: { cristal: cfg.recursos.cristal, gas: cfg.recursos.gas }, tech: { done: [], allowed: cfg.tech }, power: { prod: 0, cons: 0, ratio: 1 }, pop: { used: 0, cap: 0 }, log: [] };
  s.map = generateMap(s, cfg.w, cfg.h, cfg.portais);
  s.fog = createFog(s.map);
  setupMission(s, cfg);
  economyStep(s);
  updateFog(s);
  return s;
}

export function step(s, commands) {
  if (s.result) return;
  s.ev = [];
  for (const cmd of commands) applyCommand(s, cmd);
  economyStep(s);
  const occ = buildOccupancy(s);
  for (const u of s.units.slice()) updateUnit(s, u, occ);
  for (const e of s.enemies.slice()) enemyStep(s, e);
  towersStep(s);
  shotsStep(s);
  swarmStep(s);
  objectiveStep(s);
  s.tick++;
  if (s.tick % FOG_EVERY === 0) updateFog(s);
}

function applyCommand(s, cmd) {
  if (cmd.type === 'build') { build(s, cmd.module, cmd.c, cmd.r); return; }
  if (cmd.type === 'train' || cmd.type === 'cancel' || cmd.type === 'research') {
    const md = s.modules.find(m => m.id === cmd.moduleId);
    if (cmd.type === 'train') train(s, md, cmd.unit);
    else if (cmd.type === 'research') research(s, md, cmd.id);
    else cancelQueue(s, md);
    return;
  }
  const units = (cmd.ids || []).map(id => s.units.find(u => u.id === id)).filter(Boolean);
  if (!units.length) return;
  const reset = u => { u.target = null; u.autoTarget = false; u.amGoal = null; u.hold = false; u.patrol = null; };
  if (cmd.type === 'move' || cmd.type === 'patrol' || cmd.type === 'amove') {
    const dests = groupDestinations(s, units, { c: cmd.c, r: cmd.r });
    for (const u of units) {
      const d = dests.get(u.id);
      reset(u);
      if (cmd.type === 'patrol') u.patrol = { from: { c: u.c, r: u.r }, to: d };
      if (cmd.type === 'amove') u.amGoal = d;
      orderMove(s, u, d);
    }
  } else if (cmd.type === 'attack') {
    if (!get(s, cmd.target)) return;
    for (const u of units) { reset(u); u.target = cmd.target; u.path = []; }
  } else if (cmd.type === 'hold') {
    for (const u of units) { reset(u); u.path = []; u.goal = null; u.hold = true; }
  } else if (cmd.type === 'stop') {
    for (const u of units) { reset(u); u.path = []; u.goal = null; }
  }
}

export const serialize = s => JSON.stringify(s);
export const deserialize = json => JSON.parse(json);

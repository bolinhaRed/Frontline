// Gravação local (localStorage): progresso da campanha e uma partida em curso.
const KEY_CAMP = 'frontline.campanha.v1', KEY_GAME = 'frontline.jogo.v1';
const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

export const loadProgress = () => read(KEY_CAMP) || { concluidas: [] };
export const saveProgress = p => write(KEY_CAMP, p);
export const resetProgress = () => { try { localStorage.removeItem(KEY_CAMP); localStorage.removeItem(KEY_GAME); } catch (e) { /* ignora */ } };
export const loadGame = () => read(KEY_GAME);
export const saveGame = (meta, stateJson) => write(KEY_GAME, { meta, estado: stateJson, quando: Date.now() });
export const clearGame = () => { try { localStorage.removeItem(KEY_GAME); } catch (e) { /* ignora */ } };

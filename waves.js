import { createEnemyPressure } from './enemy-pressure.js';

export const ENEMY_HEALTH = Object.freeze({ snail: 2, slug: 1 });

export function waveStats(number) {
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('Wave number must be a positive integer');
  return { number, enemyCount: Math.min(8 + (number - 1) * 3, 30), healthBonus: Math.floor((number - 1) / 3) };
}

export function enemyHealth(kind, wave) {
  if (!Object.hasOwn(ENEMY_HEALTH, kind)) throw new Error(`Unknown enemy kind: ${kind}`);
  return ENEMY_HEALTH[kind] + waveStats(wave).healthBonus;
}

export function createCampaign(mapIds, { wavesPerMap = 3 } = {}) {
  if (!mapIds.length || mapIds.some(id => typeof id !== 'string' || !id)) throw new Error('Campaign requires map IDs');
  if (!Number.isSafeInteger(wavesPerMap) || wavesPerMap < 1) throw new Error('Waves per map must be a positive integer');
  const order = [...mapIds];
  let startingMap = 0;
  return {
    setStartingMap(id) {
      const index = order.indexOf(id);
      if (index < 0) throw new Error(`Unknown map: ${id}`);
      startingMap = index;
    },
    nextMapWave(number) {
      waveStats(number);
      return (Math.floor((number - 1) / wavesPerMap) + 1) * wavesPerMap + 1;
    },
    plan(number) {
      const stats = waveStats(number);
      return { ...stats, mapId: order[(startingMap + Math.floor((number - 1) / wavesPerMap)) % order.length] };
    },
  };
}

// Simulation time drives transitions, so pause, tab suspension and restart do not
// leave wall-clock timers that can spawn a wave in the wrong map or game session.
export function createWaveDirector({ campaign, onWave, onReinforcements }) {
  const pressure = createEnemyPressure();
  let current = null, clearTime = 0;
  function begin(number) {
    const next = campaign.plan(number);
    onWave(next);
    current = next;
    clearTime = 0;
    pressure.reset();
  }
  return {
    get current() { return current; },
    start() { begin(1); },
    completeMap() { if (current) begin(campaign.nextMapWave(current.number)); },
    onKill: pressure.onKill,
    update(dt, livingEnemies) {
      if (!current) return;
      if (livingEnemies === 0) {
        clearTime += dt;
        if (clearTime + 1e-8 >= 1.4) begin(current.number + 1);
      } else {
        clearTime = 0;
        const count = pressure.update(dt, livingEnemies);
        if (count) onReinforcements(count, current);
      }
    },
  };
}

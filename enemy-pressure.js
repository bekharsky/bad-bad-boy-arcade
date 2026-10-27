// Give exploration some breathing room, then make avoiding combat costly.
export function createEnemyPressure() {
  let quietTime = 0;
  let reinforcements = 0;
  let nextArrival = 18;

  function reset() {
    quietTime = 0;
    reinforcements = 0;
    nextArrival = 18;
  }

  function update(dt, livingEnemies) {
    if (!livingEnemies) { reset(); return 0; }
    quietTime += dt;
    if (quietTime + 1e-8 < nextArrival) return 0;
    // Consume the arrival even at the cap, so there is no stored-up burst.
    reinforcements++;
    nextArrival += Math.max(4, 10 - reinforcements * 2);
    return Math.max(0, Math.min(2 + Math.floor((reinforcements - 1) / 2), 6, 48 - livingEnemies));
  }

  return { update, reset, onKill: reset };
}

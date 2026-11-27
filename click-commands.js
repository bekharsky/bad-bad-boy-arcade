const DEFAULT_APPROACH_MIN = 1.4;
const DEFAULT_APPROACH_MAX = 3.4;
const APPROACH_HYSTERESIS = 0.18;

export function createClickCommands({
  world,
  player,
  stopDistance = .48,
  approachMin = DEFAULT_APPROACH_MIN,
  approachMax = DEFAULT_APPROACH_MAX,
  random = Math.random,
}) {
  let destination = null;
  let target = null;
  let attackIntent = null;

  function currentTarget() {
    if (target && !target.alive) {
      target = null;
      attackIntent = null;
    }
    return target;
  }

  function routedMovement(point, arrivalDistance, clearOnArrival) {
    const distance = Math.hypot(point.x - player.x, point.z - player.z);
    if (distance <= arrivalDistance) {
      if (clearOnArrival) destination = null;
      return null;
    }
    const direction = world.routeTowards(player.x, player.z, point.x, point.z);
    const length = Math.hypot(direction.x, direction.z);
    if (length < .01) {
      if (clearOnArrival) destination = null;
      return null;
    }
    return { x: direction.x / length, z: direction.z / length };
  }

  return {
    moveTo(point) {
      destination = { x: point.x, z: point.z };
      target = null;
      attackIntent = null;
    },
    attack(enemy, { approach = true, airborne = false, preferredDistance = null, minimumDistance = null } = {}) {
      destination = null;
      target = enemy;
      const safeDistance = minimumDistance
        ?? (enemy.size ?? .45) + (player.radius ?? .45) + .5;
      const randomDistance = approachMin + Math.pow(Math.max(0, Math.min(1, random())), 1.35) * (approachMax - approachMin);
      attackIntent = {
        approach,
        airborne,
        preferredDistance: Math.max(safeDistance, preferredDistance ?? randomDistance),
        minimumDistance: safeDistance,
      };
    },
    clear() {
      destination = null;
      target = null;
      attackIntent = null;
    },
    movement() {
      if (destination) return routedMovement(destination, stopDistance, true);

      const enemy = currentTarget();
      if (!enemy || !attackIntent?.approach) return null;
      const dx = enemy.x - player.x, dz = enemy.z - player.z;
      const distance = Math.hypot(dx, dz);

      if (distance > attackIntent.preferredDistance + APPROACH_HYSTERESIS) {
        return routedMovement(enemy, attackIntent.preferredDistance, false);
      }
      if (distance < attackIntent.minimumDistance - APPROACH_HYSTERESIS) {
        const awayX = distance > .001 ? -dx / distance : -(player.dx ?? 0);
        const awayZ = distance > .001 ? -dz / distance : -(player.dz ?? 1);
        const retreatDistance = attackIntent.minimumDistance + .35;
        return routedMovement({ x: enemy.x + awayX * retreatDistance, z: enemy.z + awayZ * retreatDistance }, .12, false);
      }
      return null;
    },
    get destination() { return destination; },
    get target() { return currentTarget(); },
    get attacking() { return !!currentTarget(); },
    get airborne() { return !!currentTarget() && !!attackIntent?.airborne; },
    get active() { return !!destination || !!currentTarget(); },
  };
}

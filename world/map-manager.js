// A stable query surface lets movement, spray, and pickups follow the active map
// without keeping references to a map that has already been unloaded.
export function createMapManager(scene, definitions, playerRadius = .4) {
  const registry = new Map(definitions.map(definition => [definition.id, definition]));
  if (registry.size !== definitions.length) throw new Error('Map IDs must be unique');
  let active = null, prepared = null;
  const defaultBackground = scene.background, defaultFog = scene.fog;
  function create(id) {
    const definition = registry.get(id);
    if (!definition) throw new Error(`Unknown map: ${id}`);
    const map = definition.create();
    if (!map.canStandAt(map.spawn.x, map.spawn.z, playerRadius)) {
      map.dispose();
      throw new Error(`Map ${id} has a blocked player spawn`);
    }
    return map;
  }
  const manager = {
    get id() { return active?.id; },
    get root() { return active?.root; },
    get name() { return active?.name; },
    get mode() { return active?.mode ?? 'arena'; },
    get runner() { return active?.runner; },
    get targets() { return active?.targets ?? []; },
    get spawn() { return active.spawn; },
    get openingCameoRoute() { return active.openingCameoRoute; },
    get pedestrianRoutes() { return active.pedestrianRoutes; },
    pickupCapacity(kind) {
      return Math.max(0, ...definitions.map(definition => definition.pickups?.[kind]?.length ?? 0));
    },
    prepare(id) {
      if (active?.id === id) return active.root;
      if (prepared?.id !== id) {
        const next = create(id);
        prepared?.dispose();
        prepared = next;
      }
      return prepared.root;
    },
    activate(id) {
      if (active?.id === id) return false;
      const definition = registry.get(id);
      // Prepare and validate a detached map before replacing the visible one.
      const next = prepared?.id === id ? prepared : create(id);
      if (next === prepared) prepared = null;
      const previous = active;
      active = next;
      scene.add(next.root);
      scene.background = definition.environment?.background ?? defaultBackground;
      scene.fog = definition.environment?.fog === undefined ? defaultFog : definition.environment.fog;
      previous?.dispose();
      return true;
    },
    dispose() {
      active?.dispose(); prepared?.dispose();
      active = prepared = null;
      scene.background = defaultBackground; scene.fog = defaultFog;
    },
  };
  for (const method of ['move', 'routeTo', 'chase', 'flee', 'spawnPoint', 'pickupPoint', 'pickupPoints', 'lineClear', 'lineClear3D', 'canStandAt', 'update', 'updateRunner', 'updateVisibility', 'refresh', 'reset']) {
    manager[method] = (...args) => active[method](...args);
  }
  return manager;
}

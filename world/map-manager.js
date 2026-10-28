// A stable query surface lets movement, spray, and pickups follow the active map
// without keeping references to a map that has already been unloaded.
export function createMapManager(scene, definitions, playerRadius = .4) {
  const registry = new Map(definitions.map(definition => [definition.id, definition]));
  if (registry.size !== definitions.length) throw new Error('Map IDs must be unique');
  let active = null;
  const manager = {
    get id() { return active?.id; },
    get name() { return active?.name; },
    get mode() { return active?.mode ?? 'arena'; },
    get spawn() { return active.spawn; },
    pickupCapacity(kind) {
      return Math.max(0, ...definitions.map(definition => definition.pickups?.[kind]?.length ?? 0));
    },
    activate(id) {
      if (active?.id === id) return false;
      const definition = registry.get(id);
      if (!definition) throw new Error(`Unknown map: ${id}`);
      // Prepare and validate a detached map before replacing the visible one.
      const next = definition.create();
      if (!next.canStandAt(next.spawn.x, next.spawn.z, playerRadius)) {
        next.dispose();
        throw new Error(`Map ${id} has a blocked player spawn`);
      }
      const previous = active;
      active = next;
      scene.add(next.root);
      previous?.dispose();
      return true;
    },
    dispose() { active?.dispose(); active = null; },
  };
  for (const method of ['move', 'routeTo', 'chase', 'spawnPoint', 'pickupPoints', 'lineClear', 'lineClear3D', 'canStandAt', 'update', 'updateRunner', 'updateVisibility', 'reset']) {
    manager[method] = (...args) => active[method](...args);
  }
  return manager;
}

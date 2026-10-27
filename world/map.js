import * as THREE from 'three';
import { createNavigation } from './navigation.js';
import { createBuildingVisibility } from './building-visibility.js';
import { disposeObject } from './dispose.js';

/**
 * A map owns its scenery subtree, collision data, spawn, and pickup anchors.
 * The builder supplies static colliders and optional buildings, dynamicColliders,
 * reset(), and update(dt, actors, navigation), which may return an announcement.
 * Coordinates use world metres; the map root stays at the origin.
 */
export function createMap(definition, build) {
  const root = new THREE.Group();
  root.name = `Map: ${definition.id}`;
  try {
    const content = build(root);
    const navigation = createNavigation({ bounds: definition.bounds, colliders: content.colliders, dynamicColliders: content.dynamicColliders });
    const visibility = createBuildingVisibility(content.buildings ?? []);
    let disposed = false;
    const map = {
      ...navigation,
      id: definition.id,
      name: definition.name,
      spawn: definition.spawn,
      root,
      pickupCapacity(kind) { return definition.pickups?.[kind]?.length ?? 0; },
      pickupPoints(kind, radius) {
        return (definition.pickups?.[kind] ?? []).map(point => navigation.pickupPoint(point, radius)).filter(Boolean);
      },
      updateVisibility: visibility.update,
      update: (dt, actors) => content.update?.(dt, actors, navigation),
      reset() {
        content.reset?.();
        visibility.reset();
        navigation.refresh();
        navigation.routeTo(map.spawn.x, map.spawn.z);
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        disposeObject(root);
      },
    };
    map.reset();
    return map;
  } catch (error) {
    disposeObject(root);
    throw error;
  }
}

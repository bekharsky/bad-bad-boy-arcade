import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'three') specifier = new URL('../vendor/three-0.180.0/build/three.module.min.js', import.meta.url).href;
    if (specifier.startsWith('three/addons/')) specifier = new URL(`../vendor/three-0.180.0/examples/jsm/${specifier.slice(13)}`, import.meta.url).href;
    return nextResolve(specifier, context);
  },
});
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, fillText() {} }) }) };
const THREE = await import('three');
const { createMap } = await import('../world/map.js');
const { createMapManager } = await import('../world/map-manager.js');
const { createNavigation } = await import('../world/navigation.js');
const { createBatteries } = await import('../batteries.js');
const { createMedkits } = await import('../medkits.js');

function fixture(id, offset = 0, blockedSpawn = false) {
  const instances = [], disposed = [];
  const definition = {
    id, name: id,
    spawn: { x: offset - 3, z: 0 },
    bounds: { minX: offset - 6, maxX: offset + 6, minZ: -3, maxZ: 3 },
    pickups: { medkit: [{ x: offset - 4, z: 1 }], battery: [{ x: offset - 4, z: -1 }] },
    create() {
      const map = createMap(definition, root => {
        // Shared within this map, never shared with another map or the hero.
        const geometry = new THREE.BoxGeometry(1, 1, 1), texture = new THREE.Texture();
        const material = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture });
        const instanced = new THREE.InstancedMesh(geometry, material, 1);
        for (const [label, resource] of [['geometry', geometry], ['texture', texture], ['material', material], ['instances', instanced]]) {
          resource.addEventListener('dispose', () => disposed.push(label));
        }
        root.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material), instanced);
        return { colliders: [{ minX: offset - 1, maxX: offset + 1, minZ: -1, maxZ: 1, height: 2 },
          ...(blockedSpawn ? [{ minX: offset - 4, maxX: offset - 2, minZ: -1, maxZ: 1, height: 2 }] : [])] };
      });
      instances.push(map);
      return map;
    },
  };
  return { definition, instances, disposed };
}

test('map replacement updates existing query consumers and disposes only the previous map, once', () => {
  const scene = new THREE.Scene(), first = fixture('first'), second = fixture('second', 30);
  const hero = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  let heroDisposals = 0;
  hero.geometry.addEventListener('dispose', () => heroDisposals++);
  scene.add(hero);
  const world = createMapManager(scene, [first.definition, second.definition], .736);
  world.activate('first');
  const canStandAt = world.canStandAt, lineClear3D = world.lineClear3D;
  assert.equal(canStandAt(-3, 0, .736), true);
  assert.equal(world.activate('first'), false, 'A new wave on the same map does not rebuild scenery');
  assert.equal(first.instances.length, 1);
  world.activate('second');
  assert.equal(canStandAt(-3, 0, .736), false, 'Movement no longer uses the old map');
  assert.equal(canStandAt(27, 0, .736), true);
  assert.equal(lineClear3D({ x: 28, y: 1, z: 0 }, { x: 32, y: 1, z: 0 }), false);
  assert.equal(lineClear3D({ x: 28, y: 3, z: 0 }, { x: 32, y: 3, z: 0 }), true);
  assert.deepEqual([...first.disposed].sort(), ['geometry', 'instances', 'material', 'texture']);
  first.instances[0].dispose();
  assert.equal(first.disposed.length, 4, 'Shared resources are not disposed twice');
  assert.equal(heroDisposals, 0);
  assert.equal(hero.parent, scene);
  assert.equal(scene.children.length, 2, 'The previous map subtree is detached');
  world.dispose();
  assert.deepEqual([...second.disposed].sort(), ['geometry', 'instances', 'material', 'texture']);
  assert.deepEqual(scene.children, [hero]);
});

test('unknown maps and blocked spawns leave the playable map intact', () => {
  const scene = new THREE.Scene(), valid = fixture('valid'), blocked = fixture('blocked', 30, true);
  const world = createMapManager(scene, [valid.definition, blocked.definition]);
  world.activate('valid');
  const root = scene.children[0];
  assert.throws(() => world.activate('missing'), /Unknown map/);
  assert.throws(() => world.activate('blocked'), /blocked player spawn/);
  assert.equal(world.id, 'valid');
  assert.deepEqual(scene.children, [root]);
  assert.equal(valid.disposed.length, 0);
  assert.equal(blocked.disposed.length, 4, 'A rejected map releases its own resources');
  assert.throws(() => createMapManager(scene, [valid.definition, valid.definition]), /unique/);
  world.dispose();
});

test('existing medkit and Battery systems reset against the new map anchors', () => {
  const scene = new THREE.Scene(), first = fixture('first'), second = fixture('second', 30);
  second.definition.pickups.medkit = [[26, 1], [26, -1], [25.5, 0], [26.5, 0], [25.5, 1.5], [26.5, 1.5]].map(([x, z]) => ({ x, z }));
  const world = createMapManager(scene, [first.definition, second.definition], .736);
  world.activate('first');
  const medkits = createMedkits(scene, world), batteries = createBatteries(scene, world);
  const player = { x: -4, z: 1, radius: .736, hp: 3, maxHp: 5 };
  medkits.reset(player); batteries.reset(player);
  world.activate('second');
  medkits.reset(player); batteries.reset(player);
  assert.equal(scene.children.filter(mesh => mesh.isInstancedMesh && mesh.count === 6).length, 3, 'Capacity covers maps with more than five medkits');
  let healed = 0, powered = 0;
  const collect = amount => { healed += amount; player.hp += amount; };
  medkits.update(0, player, collect);
  batteries.update(0, player, () => powered++);
  assert.equal(healed, 0, 'The first map has no remaining medkit');
  player.x = 26;
  medkits.update(0, player, collect);
  assert.equal(healed, 2);
  player.z = -1;
  batteries.update(0, player, () => powered++);
  batteries.update(0, player, () => powered++);
  assert.equal(powered, 1, 'A new-map pickup is collected once');
  batteries.reset(player);
  assert.equal(scene.getObjectByName('Battery pickups').children.length, 1);
  medkits.clear(); batteries.dispose(); world.dispose();
});

test('spawn fallback on a small shifted map stays reachable and inside its own bounds', () => {
  const navigation = createNavigation({ bounds: { minX: 20, maxX: 24, minZ: -8, maxZ: -4 } });
  const player = { x: 22, z: -6 };
  navigation.routeTo(player.x, player.z);
  const spawn = navigation.spawnPoint(player, 0, 1);
  assert.ok(spawn);
  assert.equal(navigation.canStandAt(spawn.x, spawn.z, .75), true);
  assert.equal(navigation.lineClear(player.x, player.z, spawn.x, spawn.z, .5), true);
  const blocked = createNavigation({
    bounds: { minX: 20, maxX: 24, minZ: -8, maxZ: -4 },
    colliders: [{ minX: 20, maxX: 24, minZ: -8, maxZ: -4, height: 2 }],
  });
  blocked.routeTo(player.x, player.z);
  assert.equal(blocked.spawnPoint(player, 0, 1), null, 'No hard-coded harbor fallback');
});

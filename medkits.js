import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function createMedkits(scene, world) {
  const capacity = world.pickupCapacity('medkit');
  function boxes(parts) {
    const pieces = parts.map(([x, y, z, w, h, d]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z));
    const geometry = mergeGeometries(pieces);
    for (const piece of pieces) piece.dispose();
    return geometry;
  }
  const cases = new THREE.InstancedMesh(
    boxes([
      [0, 0, 0, .72, .46, .36],
      [-.14, .28, 0, .07, .14, .12], [.14, .28, 0, .07, .14, .12],
      [0, .36, 0, .35, .07, .12]
    ]),
    new THREE.MeshStandardMaterial({ color: '#f4f3e9', roughness: .55 }),
    capacity
  );
  const crosses = new THREE.InstancedMesh(
    boxes([
      [0, 0, .187, .12, .30, .018], [0, 0, .187, .34, .11, .018],
      [0, 0, -.187, .12, .30, .018], [0, 0, -.187, .34, .11, .018],
      [0, .237, 0, .12, .018, .28], [0, .237, 0, .34, .018, .10]
    ]),
    new THREE.MeshStandardMaterial({ color: '#2eaa78', emissive: '#187448', emissiveIntensity: .4, roughness: .6 }),
    capacity
  );
  const halos = new THREE.InstancedMesh(
    new THREE.RingGeometry(.47, .56, 32),
    new THREE.MeshBasicMaterial({ color: '#75e3a8', transparent: true, opacity: .5, depthWrite: false, side: THREE.DoubleSide }),
    capacity
  );
  const meshes = [cases, crosses, halos];
  for (const mesh of meshes) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
    scene.add(mesh);
  }
  cases.castShadow = crosses.castShadow = true;
  const dummy = new THREE.Object3D();
  const kits = [];
  let time = 0, offsetZ = 0, scale = 1, lastX = 0, lastZ = 0;

  function render() {
    let count = 0;
    for (const kit of kits) {
      if (!kit.active) continue;
      dummy.position.set(kit.x, (.43 + Math.sin(time * 2.5 + kit.phase) * .055) * scale, kit.z + offsetZ);
      dummy.rotation.set(0, time * .55 + kit.phase, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      cases.setMatrixAt(count, dummy.matrix);
      crosses.setMatrixAt(count, dummy.matrix);
      dummy.position.y = scale > 1 ? .085 : .018;
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(scale * (1 + Math.sin(time * 3 + kit.phase) * .08));
      dummy.updateMatrix();
      halos.setMatrixAt(count++, dummy.matrix);
    }
    for (const mesh of meshes) { mesh.count = count; mesh.instanceMatrix.needsUpdate = true; }
  }

  function reset(player) {
    kits.length = 0;
    time = 0; offsetZ = 0; scale = world.mode === 'runner' ? 1.7 : 1;
    lastX = player.x; lastZ = player.z;
    for (const point of world.pickupPoints('medkit', player.radius + .12)) {
      kits.push({ ...point, active: true, phase: Math.random() * Math.PI * 2 });
    }
    render();
  }

  function update(dt, player, onPickup, runnerState = null) {
    time += dt;
    offsetZ = runnerState?.distance ?? 0;
    const x = player.x, z = player.z - offsetZ;
    for (const kit of kits) {
      if (!kit.active || player.hp >= player.maxHp) continue;
      // Sweep the moving frame so a boosted run cannot skip over a pickup
      // between rendered frames. Arenas retain their usual proximity check.
      const dx = x - lastX, dz = z - lastZ, lengthSq = dx * dx + dz * dz;
      const t = runnerState && lengthSq > 0 ? Math.max(0, Math.min(1, ((kit.x - lastX) * dx + (kit.z - lastZ) * dz) / lengthSq)) : 1;
      if (Math.hypot(lastX + dx * t - kit.x, lastZ + dz * t - kit.z) > player.radius + .45 * scale) continue;
      if (!world.lineClear(player.x, player.z, kit.x, kit.z + offsetZ, .12)) continue;
      kit.active = false;
      onPickup(Math.min(2, player.maxHp - player.hp));
    }
    lastX = x; lastZ = z;
    render();
  }

  function clear() {
    kits.length = 0;
    for (const mesh of meshes) mesh.count = 0;
  }

  return { reset, update, clear };
}

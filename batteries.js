import * as THREE from 'three';

export function createBatteries(scene, world) {
  const root = new THREE.Group();
  root.name = 'Battery pickups';
  scene.add(root);
  const batteries = [];
  // Battery energy drink can: black body, gold label. The side carries the label; the ends are plain black.
  function makeCanLabel() {
    const canvasLabel = document.createElement('canvas');
    canvasLabel.width = 256;
    canvasLabel.height = 128;
    const ctx = canvasLabel.getContext('2d');
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#e2b24a';
    ctx.fillRect(0, 34, 256, 10);
    ctx.fillRect(0, 84, 256, 10);
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e2b24a';
    ctx.fillText('BATTERY', 128, 64);
    const texture = new THREE.CanvasTexture(canvasLabel);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  const batteryGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.34, 16);
  const canEnd = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.35, metalness: 0.4 });
  const batteryMaterials = [new THREE.MeshStandardMaterial({ map: makeCanLabel(), roughness: 0.35, metalness: 0.4 }), canEnd, canEnd];

  function clear() {
    root.clear();
    batteries.length = 0;
  }
  function reset(player) {
    clear();
    for (const point of world.pickupPoints('battery', player.radius + .12)) {
      const mesh = new THREE.Mesh(batteryGeometry, batteryMaterials);
      mesh.position.set(point.x, .3, point.z);
      root.add(mesh);
      batteries.push({ ...point, mesh });
    }
  }
  function update(dt, player, onPickup) {
    for (let i = batteries.length - 1; i >= 0; i--) {
      const battery = batteries[i];
      battery.mesh.rotation.y += dt * 2;
      if (Math.hypot(player.x - battery.x, player.z - battery.z) > player.radius + .4) continue;
      if (!world.lineClear(player.x, player.z, battery.x, battery.z, .12)) continue;
      battery.mesh.removeFromParent();
      batteries.splice(i, 1);
      onPickup();
    }
  }
  return {
    reset, update, clear,
    dispose() {
      clear();
      root.removeFromParent();
      batteryGeometry.dispose();
      for (const material of new Set(batteryMaterials)) {
        material.map?.dispose();
        material.dispose();
      }
    },
  };
}

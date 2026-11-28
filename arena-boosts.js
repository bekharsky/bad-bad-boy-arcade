import * as THREE from 'three';
import { createSpeedSkates } from './models/speed-skate.js';
import { disposeObject } from './world/dispose.js';

export const SKATE_SPEED_MULTIPLIER = 2;

export function createArenaBoosts(scene, world) {
  const root = new THREE.Group();
  root.name = 'Arena boost pickups';
  const templates = new THREE.Group();
  templates.visible = false;
  scene.add(root, templates);
  const pickups = [];
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

  const models = { battery: new THREE.Mesh(batteryGeometry, batteryMaterials), skates: createSpeedSkates([-.13, .13]) };
  templates.add(...Object.values(models));

  function clear() {
    root.clear();
    pickups.length = 0;
  }
  function reset(player) {
    clear();
    for (const [kind, model] of Object.entries(models)) for (const point of world.pickupPoints(kind, player.radius + .12)) {
      const object = model.clone();
      object.position.set(point.x, .3, point.z);
      root.add(object);
      pickups.push({ ...point, kind, object });
    }
  }
  function update(dt, player, onPickup) {
    for (let i = pickups.length - 1; i >= 0; i--) {
      const { x, z, kind, object } = pickups[i];
      object.rotation.y += dt * 2;
      if (Math.hypot(player.x - x, player.z - z) > player.radius + .4) continue;
      if (!world.lineClear(player.x, player.z, x, z, .12)) continue;
      object.removeFromParent();
      pickups.splice(i, 1);
      onPickup(kind);
    }
  }
  return {
    reset, update, clear,
    dispose() {
      clear();
      root.removeFromParent();
      disposeObject(templates);
    },
  };
}

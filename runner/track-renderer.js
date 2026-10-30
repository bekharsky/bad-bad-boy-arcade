import * as THREE from 'three';
import { createSceneryModel } from '../maps/scenery-model.js';
import { createTrafficModel, animateTraffic } from './traffic-models.js';
import { RUN_LANES, TRAFFIC_COLORS, TRAFFIC_CAPACITY, ROADWORK_TYPES } from './course.js';

// Geometry is shared within this map; hit-flash materials belong to each slot.
export function createRunnerTraffic(root, name, { riderKinds = ['bike', 'scooter'], lanes = RUN_LANES, tramChance = 0, roadworkKinds = ROADWORK_TYPES } = {}) {
  const trafficPool = [], trafficMaterials = [];
  const templates = [];
  for (const kind of riderKinds) for (const color of TRAFFIC_COLORS) templates.push(createTrafficModel(kind, color));
  for (const kind of roadworkKinds) templates.push(createTrafficModel(kind, 'roadwork'));
  if (tramChance > 0) templates.push(createTrafficModel('tram', 'tram'));
  for (let i = 0; i < TRAFFIC_CAPACITY; i++) {
    const object = new THREE.Group(); object.name = `${name} traffic`; object.visible = false;
    // One material per traffic slot keeps hit flashes local, while all colour
    // variants and wheels within that slot share the vertex-coloured material.
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .65 });
    trafficMaterials.push(material);
    for (const template of templates) {
      const variant = template.clone(true); variant.visible = false;
      variant.traverse(node => { if (node.isMesh) node.material = material; });
      object.add(variant);
    }
    root.add(object); trafficPool.push(object);
  }
  const templateMaterials = new Set();
  for (const template of templates) template.traverse(node => { if (node.material) templateMaterials.add(node.material); });
  for (const material of templateMaterials) material.dispose();
  // Shared geometries and per-slot materials are now owned by this map's subtree.
  return { update(state) {
    for (let i = 0; i < trafficPool.length; i++) {
      const object = trafficPool[i], agent = state.traffic[i], material = trafficMaterials[i];
      object.visible = !!agent && !agent.cleared;
      material.emissive.set(agent?.hitUntil > state.elapsed ? '#ffe58c' : '#000000');
      material.emissiveIntensity = agent?.hitUntil > state.elapsed ? .7 : 0;
      if (!agent) continue;
      object.position.set(agent.x ?? lanes[agent.lane], 0, state.distance - agent.progress);
      object.rotation.y = agent.crossing ? Math.sign(agent.vx) * Math.PI / 2 : 0;
      for (const variant of object.children) {
        variant.visible = variant.name === `${ROADWORK_TYPES.includes(agent.kind) ? 'roadwork' : agent.color} ${agent.kind}`;
        if (variant.visible) animateTraffic(variant, state.elapsed + agent.id, agent.crossing ? Math.abs(agent.vx) : agent.speed + state.speed);
      }
    }
  } };
}

export function createRunnerFinish(root, name, length) {
  const finish = createSceneryModel(`${name} finish`);
  for (let row = 0; row < 2; row++) for (let col = 0; col < 12; col++) finish.box((row + col) % 2 ? '#e1ddc2' : '#354d50', (col - 5.5) * .8, .055, row * .8, .8, .02, .8);
  const finishLine = finish.finish({ vertexColors: true }); finishLine.visible = false; root.add(finishLine);
  return { update(state) {
    finishLine.visible = length - state.distance < 80;
    finishLine.position.z = state.distance - length;
  } };
}

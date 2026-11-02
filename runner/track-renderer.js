import * as THREE from 'three';
import { createSceneryModel } from '../maps/scenery-model.js';
import { createTrafficModel, animateTraffic } from './traffic-models.js';
import { RUN_LANES, TRAFFIC_COLORS, TRAFFIC_CAPACITY, ROADWORK_TYPES } from './course.js';

// Geometry is shared within this map; hit-flash materials belong to each slot.
export function createRunnerTraffic(root, name, { riderKinds = ['bike', 'scooter'], lanes = RUN_LANES, tramChance = 0, tramRoute = null, roadworkKinds = ROADWORK_TYPES } = {}) {
  const trafficPool = [], trafficMaterials = [];
  const templates = new Map(), activeVariants = Array(TRAFFIC_CAPACITY).fill(null);
  // Keep one copy of each geometry in the map subtree for deterministic
  // disposal. Slots clone only the variant they currently display.
  const templateRoot = new THREE.Group();
  templateRoot.name = `${name} traffic templates`;
  templateRoot.visible = false;
  root.add(templateRoot);
  function addTemplate(kind, color) {
    const template = createTrafficModel(kind, color);
    templates.set(`${color} ${kind}`, template);
    templateRoot.add(template);
  }
  const pose = {};
  for (const kind of riderKinds) for (const color of TRAFFIC_COLORS) addTemplate(kind, color);
  for (const kind of roadworkKinds) addTemplate(kind, 'roadwork');
  if (tramChance > 0) addTemplate('tram', 'tram');
  const emptyGeometry = new THREE.BufferGeometry();
  emptyGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
  for (let i = 0; i < TRAFFIC_CAPACITY; i++) {
    const object = new THREE.Group(); object.name = `${name} traffic`; object.visible = false;
    // One material per traffic slot keeps hit flashes local, while all colour
    // variants and wheels within that slot share the vertex-coloured material.
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .65 });
    trafficMaterials.push(material);
    templateRoot.add(new THREE.Mesh(emptyGeometry, material));
    root.add(object); trafficPool.push(object);
  }
  // Shared templates and per-slot materials are owned by the map subtree.
  return { update(state) {
    for (let i = 0; i < trafficPool.length; i++) {
      const object = trafficPool[i], agent = state.traffic[i], material = trafficMaterials[i];
      object.visible = !!agent && !agent.cleared;
      material.emissive.set(agent?.hitUntil > state.elapsed ? '#ffe58c' : '#000000');
      material.emissiveIntensity = agent?.hitUntil > state.elapsed ? .7 : 0;
      if (!agent) continue;
      const key = `${ROADWORK_TYPES.includes(agent.kind) ? 'roadwork' : agent.color} ${agent.kind}`;
      if (activeVariants[i] !== key) {
        const template = templates.get(key);
        if (!template) throw new Error(`Unknown traffic model: ${key}`);
        object.clear();
        const variant = template.clone(true);
        variant.traverse(node => { if (node.isMesh) node.material = material; });
        object.add(variant);
        activeVariants[i] = key;
      }
      if (agent.kind === 'tram' && tramRoute) {
        tramRoute(agent.progress, lanes[agent.lane], pose);
        object.position.set(pose.x, 0, state.distance + pose.z); object.rotation.y = pose.heading;
      } else {
        object.position.set(agent.x ?? lanes[agent.lane], 0, state.distance - agent.progress);
        object.rotation.y = agent.crossing ? Math.sign(agent.vx) * Math.PI / 2 : 0;
      }
      const variant = object.children[0];
      if (agent.kind === 'tram' && tramRoute) for (const part of variant.children) {
        const offset = part.userData.tramOffset;
        if (offset === undefined) continue;
        tramRoute(agent.progress - offset, lanes[agent.lane], pose);
        const dx = pose.x - object.position.x, dz = state.distance + pose.z - object.position.z;
        const c = Math.cos(object.rotation.y), s = Math.sin(object.rotation.y);
        part.position.set(dx * c - dz * s, 0, dx * s + dz * c);
        part.rotation.y = pose.heading - object.rotation.y;
      }
      animateTraffic(variant, state.elapsed + agent.id, agent.crossing ? Math.abs(agent.vx) : agent.speed + state.speed);
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

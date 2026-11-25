import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { createSceneryModel } from '../maps/scenery-model.js';
import { animateGoose, createGooseModel, gooseRig } from '../goose.js';
import { createTrafficModel, animateTraffic } from './traffic-models.js';
import { RUN_LANES, TRAFFIC_COLORS, TRAFFIC_CAPACITY, ROADWORK_TYPES } from './course.js';
import { isCameo } from './cameo-roster.js';
import { animateCameo } from './cameo-models.js';
import { paintFigure } from '../world/painted-material.js';
import { prepareFadingMaterials, setModelAppearance } from './model-appearance.js';

// Geometry is shared within this map; hit-flash materials belong to each slot.
export function createRunnerTraffic(root, name, { riderKinds = ['bike', 'scooter'], lanes = RUN_LANES, tramChance = 0, tramRoute = null, roadworkKinds = ROADWORK_TYPES } = {}) {
  const trafficPool = [], trafficMaterials = [];
  const templates = new Map(), activeVariants = Array(TRAFFIC_CAPACITY).fill(null);
  const slotAppearance = [];
  const goosePoses = [];
  const actorSlots = new Map(), activeActors = new Set(), slotOwners = Array(TRAFFIC_CAPACITY).fill(null);
  // Keep one copy of each geometry in the map subtree for deterministic
  // disposal. Slots clone only the variant they currently display.
  const templateRoot = new THREE.Group();
  templateRoot.name = `${name} traffic templates`;
  templateRoot.visible = false;
  templateRoot.userData.runnerTraffic = true;
  root.add(templateRoot);
  function addTemplate(kind, color) {
    const template = kind === 'goose' ? createGooseModel() : createTrafficModel(kind, color);
    if (kind === 'goose') { template.name = 'goose goose'; template.scale.setScalar(.88); }
    prepareFadingMaterials(template);
    templates.set(`${color} ${kind}`, template);
    templateRoot.add(template);
  }
  const pose = {};
  for (const kind of riderKinds) for (const color of isCameo(kind) ? ['cameo'] : kind === 'goose' ? ['goose'] : TRAFFIC_COLORS) addTemplate(kind, color);
  for (const kind of roadworkKinds) addTemplate(kind, 'roadwork');
  if (tramChance > 0) addTemplate('tram', 'tram');
  const emptyGeometry = new THREE.BufferGeometry();
  emptyGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
  for (let i = 0; i < TRAFFIC_CAPACITY; i++) {
    const object = new THREE.Group(); object.name = `${name} traffic`; object.visible = false;
    object.userData.runnerTraffic = true;
    // One material per traffic slot keeps hit flashes local, while all colour
    // variants and wheels within that slot share the vertex-coloured material.
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .65, alphaHash: true });
    paintFigure(material);
    trafficMaterials.push(material);
    templateRoot.add(new THREE.Mesh(emptyGeometry, material));
    root.add(object); trafficPool.push(object);
  }
  // Shared templates and per-slot materials are owned by the map subtree.
  let elapsed = 0;
  return { update(state, viewPosition) {
    const dt = Math.max(0, state.elapsed - elapsed);
    elapsed = state.elapsed;
    activeActors.clear();
    for (const agent of state.traffic) activeActors.add(agent);
    // Compacting the course's array must not replace the models of surviving actors.
    for (const [agent, index] of actorSlots) {
      if (activeActors.has(agent)) continue;
      trafficPool[index].visible = false;
      slotOwners[index] = null;
      actorSlots.delete(agent);
    }
    for (const agent of state.traffic) {
      let i = actorSlots.get(agent);
      if (i === undefined) {
        i = slotOwners.indexOf(null);
        if (i < 0) break;
        actorSlots.set(agent, i);
        slotOwners[i] = agent;
      }
      const object = trafficPool[i], material = trafficMaterials[i];
      object.visible = !agent.cleared;
      if (agent.cleared) continue;
      const cameo = isCameo(agent.kind);
      const goose = agent.kind === 'goose';
      const key = `${cameo ? 'cameo' : goose ? 'goose' : ROADWORK_TYPES.includes(agent.kind) ? 'roadwork' : agent.color} ${agent.kind}`;
      if (activeVariants[i] !== key) {
        const template = templates.get(key);
        if (!template) throw new Error(`Unknown traffic model: ${key}`);
        if (goosePoses[i]) {
          object.children[0].traverse(node => { if (node.isSkinnedMesh) node.skeleton.dispose(); });
          goosePoses[i] = null;
        }
        object.clear();
        const variant = goose ? clone(template) : template.clone(true);
        if (goose) goosePoses[i] = { goose: gooseRig(variant), body: variant, gait: 0 };
        if (!cameo) variant.traverse(node => {
          if (node.isMesh && node.material.vertexColors && node.material.side === material.side) node.material = material;
        });
        object.add(variant);
        slotAppearance[i] = prepareFadingMaterials(variant);
        activeVariants[i] = key;
      }
      if (agent.kind === 'tram' && tramRoute) {
        tramRoute(agent.progress, lanes[agent.lane], pose);
        object.position.set(pose.x, 0, state.distance + pose.z); object.rotation.y = pose.heading;
      } else {
        object.position.set(agent.x ?? lanes[agent.lane], 0, state.distance - agent.progress);
        object.rotation.y = agent.heading ?? (agent.crossing ? Math.sign(agent.vx) * Math.PI / 2 : 0);
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
      const viewerYaw = viewPosition
        ? Math.atan2(viewPosition.x - object.position.x, viewPosition.z - object.position.z) - object.rotation.y
        : 0;
      // Crossing scooters have less time before reaching a lane than
      // oncoming rows. Keep their fade brief so the warning remains useful.
      const fadeTime = cameo ? .5 : agent.crossing ? .24 : .7;
      const age = cameo ? agent.age : state.elapsed - (agent.spawnTime ?? state.elapsed - fadeTime);
      const opacity = THREE.MathUtils.smoothstep(age ?? fadeTime, 0, fadeTime);
      setModelAppearance(variant, slotAppearance[i], opacity, agent.hitUntil > state.elapsed ? .7 : 0);
      if (cameo) {
        const approaching = agent.panicSide === undefined;
        animateCameo(variant, (agent.gait ?? state.elapsed) + agent.id, agent.stumbleTime === undefined,
          approaching ? viewerYaw : 0, false, approaching ? .18 : 0, agent.stumbleTime);
      } else if (goose) {
        animateGoose(goosePoses[i], dt, agent.z > -4.5 && agent.z < 2.5, agent.speed);
      } else {
        animateTraffic(variant, state.elapsed + agent.id, agent.crossing ? Math.abs(agent.vx) : agent.speed + state.speed, viewerYaw);
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

import * as THREE from 'three';
import { CAMEO_LOOKS } from './cameo-roster.js';
import { createMarinPortrait } from './marin-portrait.js';
import { createOrpoPortrait } from './orpo-portrait.js';
import { createPurraPortrait } from './purra-portrait.js';
import { createStatesmanPortrait } from './statesmen-portraits.js';

const portraits = {
  purra: createPurraPortrait, orpo: createOrpoPortrait, marin: createMarinPortrait,
  stubb: createStatesmanPortrait, trump: createStatesmanPortrait, putin: createStatesmanPortrait,
  kadyrov: createStatesmanPortrait, lepen: createStatesmanPortrait, zelenskyy: createStatesmanPortrait,
  macron: createStatesmanPortrait, merz: createStatesmanPortrait,
};

export function createCameoHead(kind) {
  if (!Object.hasOwn(portraits,kind)) throw new Error(`Unknown cameo head: ${kind}`);
  return portraits[kind](kind);
}

export function createCameoNeck(kind) {
  const look=CAMEO_LOOKS[kind];
  if (!look) throw new Error(`Unknown cameo neck: ${kind}`);
  const neck=new THREE.Group();
  const geometry=new THREE.CylinderGeometry(.11,.14,.33,24).translate(0,2.30,0);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:look.skin,roughness:.86}));
  mesh.name=`${kind} neck mesh`;
  mesh.castShadow=mesh.receiveShadow=true;
  neck.add(mesh);
  return neck;
}

export function animateCameoHead(head,time,running) {
  const stride=running?Math.sin(time*9):0;
  head.rotation.z=stride*.012;
  const opening=running?.35+.65*Math.max(0,stride):0;
  for(const part of head.children) {
    if(part.morphTargetInfluences) part.morphTargetInfluences[0]=opening;
  }
}

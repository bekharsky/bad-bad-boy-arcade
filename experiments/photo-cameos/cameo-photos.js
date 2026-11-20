import * as THREE from 'three';
import { PURRA_FRAMES } from './assets/purra-frames.js';
import { ROSTER_FRAMES } from './assets/roster-frames.js';
import { aimPhotoHead, animatePhotoJaw, createSplitPhotoHead, photoDirection, PHOTO_HEAD_Y } from './cameo-photo-head.js';

const framesByKind = { purra: PURRA_FRAMES, ...ROSTER_FRAMES };
const HEAD_FORWARD = { orpo: .16, stubb: .17 };
export const CAMEO_PHOTO_FILES = Object.values(framesByKind).flatMap(frames => Object.values(frames).map(frame => frame.file));
// Texture owners are local to each map/actor pool. Only the decoded source
// pixels are shared, so district disposal leaves the other owners intact.
const sources = new Map(CAMEO_PHOTO_FILES.map(file => [file, new THREE.Source()]));

export async function preloadCameoPhotos(resolveUrl = file => new URL(`./assets/${file}`, import.meta.url).href) {
  const loader = new THREE.ImageLoader();
  const results = await Promise.allSettled([...sources].map(async ([file, source]) => {
    if (source.data) return;
    source.data = await loader.loadAsync(resolveUrl(file));
    source.needsUpdate = true;
  }));
  return results.filter(result => result.status === 'rejected').length;
}

export function createCameoPhotoHead(kind, height) {
  const head = new THREE.Group();
  head.name = 'Photo head';
  head.position.y = PHOTO_HEAD_Y;
  head.visible = false;
  for (const [direction, frame] of Object.entries(framesByKind[kind])) {
    const texture = new THREE.Texture();
    texture.source = sources.get(frame.file);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    const photo = createSplitPhotoHead(frame, texture, height);
    photo.name = direction;
    photo.userData.facing = frame.facing ?? 1;
    head.add(photo);
  }
  return head;
}

export function poseCameoPhoto(root, viewerYaw, time, running) {
  const head = root.getObjectByName('Photo head');
  const degrees = -THREE.MathUtils.radToDeg(Math.atan2(Math.sin(viewerYaw), Math.cos(viewerYaw)));
  const direction = photoDirection(degrees);
  const ready = frame => Boolean(frame.children[0].material.map.image);
  const photo = head.children.find(frame => frame.name === direction && ready(frame)) ?? head.children.find(ready);
  head.visible = Boolean(photo);
  if (!photo) return null;
  const angle = Math.abs(degrees);
  const kind = root.userData.character;
  const profileWeight = THREE.MathUtils.smoothstep(angle, 35, 78);
  const quarterWeight = kind === 'orpo' ? .65 * THREE.MathUtils.smoothstep(angle, 15, 30) : 0;
  const forwardWeight = THREE.MathUtils.lerp(quarterWeight, 1, profileWeight);
  const rearFade = 1 - THREE.MathUtils.smoothstep(angle, 103, 120);
  aimPhotoHead(head, viewerYaw, (HEAD_FORWARD[kind] ?? 0) * forwardWeight * rearFade);
  for (const frame of head.children) frame.visible = frame === photo;
  photo.scale.x = photo.name === 'quarter' && Math.sign(degrees) !== photo.userData.facing ? -1 : 1;
  animatePhotoJaw(photo, time, running);
  return photo.name;
}

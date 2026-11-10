import * as THREE from 'three';
import { createBody } from './models.js';
import { PURRA_FRAMES } from '../../assets/cameos/purra-frames.js';
import { aimPhotoHead, animatePhotoJaw, createSplitPhotoHead, photoDirection, PHOTO_HEAD_Y } from '../../runner/cameo-photo-head.js';
import front from '../../assets/cameos/purra-front.webp';
import quarter from '../../assets/cameos/purra-quarter.webp';
import right from '../../assets/cameos/purra-right.webp';
import left from '../../assets/cameos/purra-left.webp';
import rear from '../../assets/cameos/purra-rear.webp';

export async function createPhotoPurra() {
  const root = createBody({ neck: false });
  const head = new THREE.Group();
  head.position.y = PHOTO_HEAD_Y;
  root.add(head);
  root.userData.head = head;
  const loader = new THREE.TextureLoader();
  const urls = { front, quarter, left, right, rear };
  const photos = Object.fromEntries(await Promise.all(Object.entries(PURRA_FRAMES).map(async ([name, frame]) => {
    const texture = await loader.loadAsync(urls[name]);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const photo = createSplitPhotoHead(frame, texture);
    head.add(photo);
    return [name, photo];
  })));
  root.userData.photos = photos;
  return root;
}

export function posePhotoHead(root, degrees, time, running) {
  const { head, photos } = root.userData;
  const active = photoDirection(degrees);
  aimPhotoHead(head, -root.rotation.y);
  for (const [name, photo] of Object.entries(photos)) photo.visible = name === active;
  const photo = photos[active];
  photo.scale.x = active === 'quarter' && degrees < 0 ? -1 : 1;
  animatePhotoJaw(photo, time, running);
  return active === 'rear' ? 'Затылок' : active === 'front' ? 'Анфас' : active === 'quarter' ? 'Три четверти' : 'Профиль';
}

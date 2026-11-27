import * as THREE from 'three';

const paintColor = '#667f60';

export function createDaciaDuster(parent, { x = 7, z = -14.5, rotation = Math.PI / 2 } = {}) {
  const root = new THREE.Group();
  root.name = 'Dacia Duster';
  root.position.set(x, 0, z);
  root.rotation.y = rotation;
  parent.add(root);

  const paint = new THREE.MeshStandardMaterial({ color: paintColor, roughness: .68, metalness: .04 });
  const trim = new THREE.MeshStandardMaterial({ color: '#303b3b', roughness: .82 });
  const tire = new THREE.MeshStandardMaterial({ color: '#202728', roughness: .95 });
  const glass = new THREE.MeshStandardMaterial({ color: '#294e58', roughness: .27, metalness: .1, side: THREE.DoubleSide });
  const chrome = new THREE.MeshStandardMaterial({ color: '#b7beb2', roughness: .36, metalness: .42 });
  const lamp = new THREE.MeshStandardMaterial({ color: '#f7dda0', emissive: '#876328', emissiveIntensity: .16, roughness: .32 });
  const tailLamp = new THREE.MeshStandardMaterial({ color: '#b94637', emissive: '#41130f', emissiveIntensity: .18, roughness: .42 });
  const materials = [paint, trim, tire, glass, chrome, lamp, tailLamp];

  function mesh(geometry, material, px, py, pz, castShadow = true) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(px, py, pz);
    object.castShadow = castShadow;
    object.receiveShadow = true;
    root.add(object);
    return object;
  }

  function box(material, px, py, pz, sx, sy, sz, castShadow = true) {
    return mesh(new THREE.BoxGeometry(sx, sy, sz), material, px, py, pz, castShadow);
  }

  // A sturdy, short-wheelbase SUV silhouette with a high roof and broad bumpers.
  box(trim, 0, .44, -.05, 1.78, .28, 3.56);
  box(paint, 0, .89, -.06, 1.86, .72, 3.72);
  box(paint, 0, 1.25, .92, 1.82, .34, 1.44);
  box(paint, 0, 1.26, -1.1, 1.8, .42, .86);
  box(trim, 0, .74, -.05, 1.91, .12, 3.58);

  const cabin = box(paint, 0, 1.66, -.12, 1.62, .82, 1.95);
  cabin.scale.y = .94;
  box(paint, 0, 2.075, -.13, 1.68, .16, 1.92);

  // Windscreen panes sit just outside the body so they read clearly at game scale.
  const windshield = mesh(new THREE.PlaneGeometry(1.48, .62), glass, 0, 1.77, 1.022, false);
  windshield.rotation.x = -.4;
  const rearWindow = mesh(new THREE.PlaneGeometry(1.37, .53), glass, 0, 1.75, -1.108, false);
  rearWindow.rotation.x = .4;
  for (const side of [-1, 1]) {
    const sx = side * .824;
    for (const offset of [-.55, .38]) {
      const window = box(glass, sx, 1.755, offset, .035, .43, .72, false);
      window.material = glass;
    }
    for (const pillarZ of [-.98, -.05, .85]) box(trim, side * .835, 1.77, pillarZ, .075, .61, .09);
    box(paint, side * .91, 1.36, -.12, .08, .58, 1.92);
    box(chrome, side * .963, 1.25, -.12, .025, .035, .43, false);
    box(trim, side * .93, 1.62, .88, .27, .12, .24);
    box(glass, side * 1.025, 1.64, .88, .14, .17, .19, false);
    box(trim, side * .91, 1.03, -.13, .075, .045, .32, false);
    box(chrome, side * .952, 1.035, -.13, .024, .025, .2, false);
    for (const wheelZ of [-1.14, 1.13]) {
      const arch = mesh(new THREE.TorusGeometry(.53, .065, 6, 14, Math.PI), trim, side * .92, .55, wheelZ, true);
      arch.rotation.y = Math.PI / 2;
    }
    for (const wheelZ of [-1.14, 1.13]) {
      const rubber = mesh(new THREE.CylinderGeometry(.42, .42, .28, 14), tire, side * .91, .52, wheelZ);
      rubber.rotation.z = Math.PI / 2;
      const hub = mesh(new THREE.CylinderGeometry(.225, .225, .3, 10), chrome, side * 1.02, .52, wheelZ, false);
      hub.rotation.z = Math.PI / 2;
      const hubInset = mesh(new THREE.CylinderGeometry(.09, .09, .305, 8), trim, side * 1.03, .52, wheelZ, false);
      hubInset.rotation.z = Math.PI / 2;
    }
    box(trim, side * .89, 1.08, -.64, .035, .055, .28, false);
    box(trim, side * .89, 1.08, .39, .035, .055, .28, false);
  }

  // Dark roof rails, a small front grille and a diamond-like Dacia badge.
  for (const side of [-1, 1]) {
    box(trim, side * .61, 2.19, -.16, .075, .08, 1.55);
    box(chrome, side * .93, 1.55, 1.04, .08, .1, .25, false);
  }
  box(trim, 0, 1.02, 1.875, .88, .42, .08, false);
  for (let i = 0; i < 5; i++) box(chrome, 0, .88 + i * .065, 1.924, .72, .024, .025, false);
  const badge = mesh(new THREE.CylinderGeometry(.12, .12, .055, 8), chrome, 0, 1.08, 1.94, false);
  badge.rotation.x = Math.PI / 2;
  box(lamp, -.66, 1.36, 1.85, .43, .22, .1, false);
  box(lamp, .66, 1.36, 1.85, .43, .22, .1, false);
  box(trim, 0, .46, 1.91, 2.02, .2, .26);
  box(trim, 0, .47, -1.91, 2.02, .2, .25);
  box(tailLamp, -.72, 1.23, -1.87, .28, .43, .11, false);
  box(tailLamp, .72, 1.23, -1.87, .28, .43, .11, false);

  const plateCanvas = document.createElement('canvas');
  plateCanvas.width = 384; plateCanvas.height = 96;
  const context = plateCanvas.getContext('2d');
  context.fillStyle = '#e8e6d9'; context.fillRect(0, 0, plateCanvas.width, plateCanvas.height);
  context.fillStyle = '#263638'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = 'bold 66px sans-serif'; context.fillText('DUSTER', 192, 49);
  const plateTexture = new THREE.CanvasTexture(plateCanvas);
  plateTexture.colorSpace = THREE.SRGBColorSpace;
  const plateMaterial = new THREE.MeshStandardMaterial({ map: plateTexture, roughness: .76, side: THREE.DoubleSide });
  materials.push(plateMaterial);
  mesh(new THREE.PlaneGeometry(.68, .17), plateMaterial, 0, .56, 2.045, false);

  const halfX = Math.abs(Math.sin(rotation)) > .5 ? 2.02 : 1.06;
  const halfZ = Math.abs(Math.sin(rotation)) > .5 ? 1.06 : 2.02;
  const collider = { minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ, height: 2.25 };
  const target = {
    kind: 'dacia-duster', root, x, z, size: 2.1, hitHeight: .92,
    hp: 28, maxHp: 28, nextJetHit: 0, age: 1, alive: true, airborne: false, hit: 0,
    collider,
    update(dt) {
      target.hit = Math.max(0, target.hit - dt);
      const flashing = target.hit > 0;
      paint.emissive.set(flashing ? '#f5d48c' : '#000000');
      paint.emissiveIntensity = flashing ? .38 : 0;
    },
    reset() {
      target.hp = target.maxHp;
      target.nextJetHit = 0;
      target.hit = 0;
      target.alive = true;
      root.visible = true;
      paint.emissive.set('#000000');
      paint.emissiveIntensity = 0;
    },
  };
  return target;
}

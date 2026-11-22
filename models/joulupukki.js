import * as THREE from 'three';

// The rider shares the sleigh’s scale and faces its forward (+Z) direction.
export function createJoulupukki() {
  const root = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: '#bb233a', roughness: .8 });
  const fur = new THREE.MeshStandardMaterial({ color: '#fff1d6', roughness: .97 });
  const skin = new THREE.MeshStandardMaterial({ color: '#e99c7b', roughness: .86 });
  const leather = new THREE.MeshStandardMaterial({ color: '#272435', roughness: .72 });
  const gold = new THREE.MeshStandardMaterial({ color: '#f7c16b', metalness: .35, roughness: .32 });
  const ball = new THREE.SphereGeometry(1, 20, 14);
  function mesh(parent, geometry, material, x, y, z) {
    const node = new THREE.Mesh(geometry, material);
    node.position.set(x, y, z);
    parent.add(node);
    return node;
  }
  function oval(parent, material, x, y, z, width, height, depth) {
    const node = mesh(parent, ball, material, x, y, z);
    node.scale.set(width, height, depth);
    return node;
  }
  oval(root, red, 0, .47, 0, .63, .65, .49);
  oval(root, leather, 0, .38, .025, .635, .14, .49);
  mesh(root, new THREE.BoxGeometry(.24, .18, .06), gold, 0, .39, .505);
  mesh(root, new THREE.BoxGeometry(.12, .081, .065), leather, 0, .39, .53);
  oval(root, fur, 0, .93, .06, .47, .17, .35);
  oval(root, fur, 0, 1.31, -.07, .438, .42, .36);
  oval(root, skin, 0, 1.34, .09, .392, .394, .359);
  for (const side of [-1, 1]) {
    oval(root, skin, side * .39, 1.33, .104, .085, .105, .08);
    oval(root, leather, side * .14, 1.428, .403, .034, .043, .026);
    oval(root, fur, side * .14, 1.507, .373, .087, .021, .034).rotation.z = side * .15;
    oval(root, fur, side * .138, 1.22, .43, .17, .084, .103).rotation.z = side * .26;
    oval(root, red, side * .29, -.05, .31, .237, .214, .4);
    oval(root, leather, side * .29, -.15, .62, .173, .177, .34);
  }
  oval(root, skin, 0, 1.325, .433, .091, .089, .093);
  oval(root, fur, 0, 1.105, .345, .34, .35, .229);
  oval(root, fur, 0, .91, .355, .217, .243, .17);
  oval(root, fur, 0, 1.63, .045, .44, .113, .395);
  const cap = mesh(root, new THREE.LatheGeometry([
    [.397, 0], [.362, .135], [.278, .26], [.17, .38], [.075, .48], [.019, .535],
  ].map(([radius, y]) => new THREE.Vector2(radius, y)), 24), red, -.05, 1.66, .023);
  cap.rotation.z = .43;
  oval(root, fur, -.25, 2.147, .025, .103, .111, .106);
  const arms = [-1, 1].map(side => {
    const arm = new THREE.Group();
    arm.position.set(side * .49, .79, .09);
    root.add(arm);
    oval(arm, red, side * .066, -.17, .21, .177, .227, .34).rotation.x = -.49;
    oval(arm, fur, side * .065, -.24, .435, .142, .137, .109);
    oval(arm, leather, side * .06, -.244, .526, .125, .126, .138);
    return arm;
  });
  return { root, arms };
}

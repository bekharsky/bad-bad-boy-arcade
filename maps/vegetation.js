import * as THREE from 'three';

// Winter trees join the map's existing colour batch and keep deterministic silhouettes.
export function addTree(model, { x = 0, y = 0, z = 0, height = 4.4, radius = 1.2, variant = 0 } = {}) {
  const style = ((variant % 3) + 3) % 3;
  function branch(from, to, bottom, top, color = '#806047') {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), delta = b.clone().sub(a);
    // Branches meet at the joints and taper to tiny tips, so they need no caps.
    const piece = new THREE.CylinderGeometry(top, bottom, delta.length(), 4, 1, true);
    piece.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()));
    model.geometry(color, piece.translate(...a.add(b).multiplyScalar(.5).toArray()));
  }
  if (style === 1) {
    const needles = ['#24594f', '#387565', '#599882'];
    branch([x, y, z], [x, y + height * .64, z], radius * .12, radius * .06);
    // Three overlapping skirts, with slightly different facet directions.
    for (let tier = 0; tier < 3; tier++) {
      const h = height * (.46 - tier * .055);
      const bottom = y + height * [.18, .41, .64][tier];
      const r = radius * (1 - tier * .24);
      const crown = new THREE.LatheGeometry([
        new THREE.Vector2(.02*r,-h*.45), new THREE.Vector2(r,-h*.5),
        new THREE.Vector2(.50*r,-h*.16), new THREE.Vector2(.04*r,h*.5),
      ], 7);
      model.geometry(needles[tier], crown.rotateY(tier * .43 + variant).translate(x, bottom + h / 2, z));
    }
    return;
  }
  const birch = style === 0;
  const bark = birch ? '#d7d3be' : '#765c4d';
  const twigs = birch ? '#908678' : '#68564b';
  const lean = Math.sin(variant * 2.17) * radius * .28;
  const trunkX = t => x + lean * Math.max(0, t - .12);
  const foot = [x, y + height * .12, z];
  const fork = [trunkX(.72), y + height * .72, z];
  branch([x, y, z], foot, radius * .14, radius * .125, bark);
  branch(foot, fork, radius * .125, radius * .052, bark);
  branch(fork, [trunkX(1.45), y + height * .996, z + radius * .15], radius * .052, radius * .008, twigs);
  if (birch) for (let i = 1; i < 5; i++) {
    const t = i * .11;
    model.box('#515955', trunkX(t), y + t * height, z + radius * (.13 - .1 * t),
      radius * (.13 + .035 * (i % 2)), height * .013, radius * .055, .12 * (i % 3 - 1));
  }
  for (let i = 0; i < 5; i++) {
    const angle = i * 2.4 + variant * .7;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const base = .33 + i * .093;
    const reach = radius * (1.12 - i * .11) * (birch ? .86 : 1);
    const joint = [trunkX(base) + dx * reach * .56, y + height * (base + .15), z + dz * reach * .56];
    branch([trunkX(base), y + height * base, z], joint, radius * .072, radius * .038, bark);
    branch(joint, [joint[0] + dx * reach * .44, joint[1] + height * .13, joint[2] + dz * reach * .44], radius * .038, radius * .008, twigs);
    for (const side of [-1, 1]) {
      branch(joint, [joint[0] + (dx - side * dz) * reach * .34, joint[1] + height * (.1 + side * .022),
        joint[2] + (dz + side * dx) * reach * .34], radius * .022, radius * .006, twigs);
    }
  }
}

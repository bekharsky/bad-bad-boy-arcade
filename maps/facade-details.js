import * as THREE from 'three';

// Decorations use the caller's local building coordinates and batching owner.
// The modest relief keeps existing streets and courtyard paths unobstructed.
export function addFacadeDetails(model, { width, depth, height, baseY = 0, storey = 1.55, windowBase = 1.25, windowHeight = 1.22, variant = 0, flowers = true, balcony = false }) {
  const { box } = model, front = depth / 2;
  const metal = '#536c66', stone = '#dcd1b5';
  const sillLevel = baseY + Math.min(height - 1.25, windowBase + storey * 2 - windowHeight / 2 - .2);
  for (const side of [-1, 1]) {
    const face = side * (front + .18);
    // Gutters turn the roof edge into a readable silhouette; downpipes end at
    // the stone plinth rather than floating above the ground.
    box(metal, 0, baseY + height + .27, face, width + .28, .075, .1);
    for (const px of [-width / 2 + .22, width / 2 - .22]) {
      box(metal, px, baseY + height / 2 + .13, face, .065, height - .16, .075);
      for (let y = 1; y < height; y += 1.8) box('#96a394', px, baseY + y, face + side * .015, .12, .07, .09);
    }
    for (let px = -width / 2 + .6; px < width / 2; px += .95) box('#92968a', px, baseY + .22, side * (front + .065), .025, .35, .035);
    for (let y = windowBase + storey / 2; y < height - .4; y += storey) box(stone, 0, baseY + y, side * (front + .07), width + .12, .065, .12);
    if (flowers && height > 3.6) {
      for (const px of [-width * .27, width * .27]) {
        const fy = sillLevel;
        box('#a76f54', px, fy, side * (front + .22), .78, .17, .3);
        box('#6b9259', px, fy + .12, side * (front + .24), .73, .13, .3);
        for (let i = 0; i < 3; i++) box((i + variant) % 2 ? '#e8bc7e' : '#d88681', px + (i - 1) * .24, fy + .23, side * (front + .27), .13, .13, .14);
      }
    }
    if (balcony && height > 4.5 && width > 5) {
      const y = sillLevel, bz = side * (front + .4), rail = side * (front + .68);
      box(stone, 0, y, bz, 1.8, .12, .8);
      box(metal, 0, y + .63, rail, 1.72, .065, .055);
      for (let px = -.8; px <= .81; px += .2) box(metal, px, y + .32, rail, .035, .6, .035);
      for (const px of [-.83, .83]) box(metal, px, y + .63, bz, .045, .065, .6);
    }
  }
  // Standing-seam roof strips and capped chimneys read from the game camera.
  for (let px = -width / 2 + .55; px < width / 2; px += 1.1) box('#819087', px, baseY + height + .365, 0, .027, .025, depth - .3);
  for (const px of [-width * .25, width * .25]) {
    box('#a58d77', px, baseY + height + .52, -depth * .17, .38, .6, .42);
    box('#536763', px, baseY + height + .84, -depth * .17, .5, .1, .54);
  }
}

export function addPitchedRoof(model, { width, depth, height, rise = .8, color = '#627772' }) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2 - .12, 0); shape.lineTo(width / 2 + .12, 0); shape.lineTo(0, rise); shape.closePath();
  model.geometry(color, new THREE.ExtrudeGeometry(shape, { depth: depth + .24, bevelEnabled: false }).translate(0, height, -depth / 2 - .12));
  model.box('#8b9d8d', 0, height + rise, 0, .12, .09, depth + .3);
}

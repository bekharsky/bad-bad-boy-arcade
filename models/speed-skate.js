import { createSceneryModel } from '../maps/scenery-model.js';

// The blade sits on y=0 and the toe points along +z, like the hero's feet.
export function createSpeedSkates(offsets = [0]) {
  const skate = createSceneryModel('Speed skates');
  for (const x of offsets) {
    skate.box('#70d9f8', x, .16, .02, .17, .15, .39);
    skate.box('#2b608e', x, .26, -.075, .143, .25, .19);
    skate.box('#edfaff', x, .365, -.072, .156, .07, .202);
    skate.box('#ccf5ff', x, .023, .035, .032, .046, .48);
    for (const z of [-.1, .1]) skate.box('#788d9c', x, .069, z, .044, .056, .055);
  }
  const model = skate.finish({ vertexColors: true });
  for (const mesh of model.children) mesh.castShadow = mesh.receiveShadow = false;
  return model;
}

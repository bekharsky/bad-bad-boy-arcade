import * as THREE from 'three';

// Compile hidden effects too. Refraction and district transitions render into a
// linear target, so their shader variants must be prepared as well as the canvas.
// Keep ordinary animation paused until this promise settles.
export async function prepareScene(renderer, scene, camera, draw = () => renderer.render(scene, camera)) {
  const target = new THREE.WebGLRenderTarget(1, 1);
  const previousTarget = renderer.getRenderTarget();
  const opaqueMaterials = new Set(), textures = new Set(), transmissionMeshes = [];
  scene.traverse(node => {
    if (!node.isMesh) return;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (!material.transparent) opaqueMaterials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      if (material.transmission > 0 && !node.visible) transmissionMeshes.push(node);
    }
  });
  try {
    // Buildings fade and the hero flashes after a bite. Retain both programs
    // on their materials so the first occlusion or hit does not compile them.
    for (const transparent of [true, false]) {
      for (const material of opaqueMaterials) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      for (const output of [target, previousTarget]) {
        let compilation;
        try {
          renderer.setRenderTarget(output);
          compilation = renderer.compileAsync(scene, camera);
        } finally {
          renderer.setRenderTarget(previousTarget);
        }
        await compilation;
      }
    }
    for (const texture of textures) renderer.initTexture(texture);
    // Empty liquid meshes activate the refraction buffer without emitting any
    // liquid. Allocate it and draw the first shadows behind the loading screen.
    for (const mesh of transmissionMeshes) mesh.visible = true;
    draw();
  } finally {
    for (const material of opaqueMaterials) {
      if (material.transparent) {
        material.transparent = false;
        material.needsUpdate = true;
      }
    }
    for (const mesh of transmissionMeshes) mesh.visible = false;
    renderer.setRenderTarget(previousTarget);
    target.dispose();
  }
}

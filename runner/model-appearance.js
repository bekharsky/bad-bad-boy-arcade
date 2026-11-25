export function prepareFadingMaterials(model) {
  const materials = new Set();
  model.traverse(node => {
    if (!node.isMesh) return;
    if (node.castShadow) node.userData.fadeShadow = true;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      material.alphaHash = true;
      materials.add(material);
    }
  });
  return materials;
}

export function setModelAppearance(model, materials, opacity, flash) {
  // Three's standard shadow pass does not use the mesh material's opacity.
  const shadows = opacity >= .65;
  if (model.userData.fadeShadows !== shadows) {
    model.traverse(node => {
      if (node.userData.fadeShadow) node.castShadow = shadows;
    });
    model.userData.fadeShadows = shadows;
  }
  for (const material of materials) {
    material.opacity = opacity;
    if (material.emissiveIntensity !== flash) {
      material.emissive?.setHex(flash > 0 ? 0xffe58c : 0x000000);
      material.emissiveIntensity = flash;
    }
  }
}

import * as THREE from 'three';

export function cameoMaterials(model) {
  const materials = new Set();
  model.traverse(node => {
    if (!node.isMesh) return;
    if (node.castShadow) node.userData.cameoShadow = true;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      material.alphaHash = true;
      materials.add(material);
    }
  });
  return materials;
}

export function showCameo(model, materials, age, flash) {
  const opacity = THREE.MathUtils.smoothstep(age, 0, 1.2);
  // Three's standard shadow pass does not use the mesh material's opacity.
  const shadows = opacity >= .65;
  if (model.userData.cameoShadows !== shadows) {
    model.traverse(node => {
      if (node.userData.cameoShadow) node.castShadow = shadows;
    });
    model.userData.cameoShadows = shadows;
  }
  for (const material of materials) {
    material.opacity = opacity;
    material.emissive?.set(flash > 0 ? '#ffe58c' : '#000000');
    material.emissiveIntensity = flash;
  }
}

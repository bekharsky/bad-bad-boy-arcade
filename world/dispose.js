// Call only for an owned subtree. Shared hero/enemy assets belong to the game.
export function disposeObject(root) {
  const resources = new Set();
  root.traverse(node => {
    if (node.isInstancedMesh) node.dispose();
    if (node.geometry) resources.add(node.geometry);
    for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
      if (!material) continue;
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  root.removeFromParent();
  for (const resource of resources) resource.dispose();
  root.clear();
}

import { Quaternion, Vector3 } from 'three';

export function createModelInstance(source) {
  const scene = source.clone(true);
  const materials = new Map();
  const pivots = [];
  scene.traverse(node => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
      const cloneMaterial = material => {
        if (!materials.has(material)) materials.set(material, material.clone());
        return materials.get(material);
      };
      node.material = Array.isArray(node.material) ? node.material.map(cloneMaterial) : cloneMaterial(node.material);
    }
    const { motion, gltfAxis, openAmount } = node.userData;
    if (['rotation','translation'].includes(motion) && ['X','Y','Z'].includes(gltfAxis) && Number.isFinite(openAmount)) {
      pivots.push({ node, motion, axis: gltfAxis.toLowerCase(), amount: openAmount, position: node.position.clone(), quaternion: node.quaternion.clone() });
    }
  });
  return { scene, materials, pivots };
}

export function styleModel(instance, color, defaultColor) {
  for (const [original, material] of instance.materials) {
    material.color.copy(original.color);
    if (original.name.startsWith('TINT_') && color !== defaultColor) material.color.set(color);
  }
}

export function openModel(instance, opened) {
  for (const pivot of instance.pivots) {
    const { node, position, quaternion, axis, motion, amount } = pivot;
    node.position.copy(position);
    node.quaternion.copy(quaternion);
    if (!opened) continue;
    if (motion === 'translation') node.position[axis] += amount;
    else {
      const vector = new Vector3(); vector[axis] = 1;
      node.quaternion.multiply(new Quaternion().setFromAxisAngle(vector, amount));
    }
  }
}

// Geometry and textures belong to the shared useGLTF cache, never to an instance.
export function disposeModelInstance(instance) {
  for (const material of instance.materials.values()) material.dispose();
}

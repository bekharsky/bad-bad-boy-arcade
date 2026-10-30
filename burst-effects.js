import * as THREE from 'three';

// One bounded GPU batch and reusable particle storage, even when many enemies
// die in the same frame. Each particle keeps its own colour and fade.
export function createBurstEffects(scene, capacity = 256) {
  const geometry = new THREE.SphereGeometry(1, 7, 6);
  const opacity = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('particleOpacity', opacity);
  const material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float particleOpacity;\nvarying float vParticleOpacity;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvParticleOpacity = particleOpacity;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vParticleOpacity;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vParticleOpacity;');
  };
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.name = 'golden-burst-effects';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.setColorAt(0, new THREE.Color());
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.visible = false;
  scene.add(mesh);
  const particles = Array.from({ length: capacity }, () => ({
    position: new THREE.Vector3(), velocity: new THREE.Vector3(), color: new THREE.Color(), radius: 0, life: 0,
  }));
  const dummy = new THREE.Object3D();
  const uploads = [[mesh.instanceMatrix, 16], [mesh.instanceColor, 3], [opacity, 1]];
  let count = 0, cursor = 0;

  function draw() {
    mesh.count = count;
    mesh.visible = count > 0;
    if (!count) return;
    for (let i = 0; i < count; i++) {
      const particle = particles[i];
      dummy.position.copy(particle.position);
      dummy.scale.setScalar(particle.radius * Math.max(.01, particle.life / .6));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, particle.color);
      opacity.setX(i, Math.max(0, particle.life / .6));
    }
    for (const [attribute, components] of uploads) {
      attribute.clearUpdateRanges();
      attribute.addUpdateRange(0, count * components);
      attribute.needsUpdate = true;
    }
  }

  return {
    burst(x, y, z, color, amount = 8, forward = null, scale = 1) {
      for (let i = 0; i < Math.min(amount, capacity); i++) {
        const particle = particles[count < capacity ? count++ : cursor++ % capacity];
        particle.position.set(x, y, z);
        particle.radius = (.025 + Math.random() * .045) * scale;
        particle.color.set(color);
        particle.velocity.set(
          forward ? forward.x * (1.8 + Math.random() * 2) + (Math.random() - .5) * 1.5 : (Math.random() - .5) * 2,
          Math.random() * (forward ? 1.2 : 1.8),
          forward ? forward.z * (1.8 + Math.random() * 2) + (Math.random() - .5) * 1.5 : (Math.random() - .5) * 2,
        ).multiplyScalar(scale);
        particle.life = .32 + Math.random() * .28;
      }
      draw();
    },
    update(dt, scroll = 0) {
      for (let i = count - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.life -= dt;
        if (particle.life <= 0) {
          particles[i] = particles[--count];
          particles[count] = particle;
          continue;
        }
        particle.position.z += scroll * dt;
        particle.position.addScaledVector(particle.velocity, dt);
        particle.velocity.y -= 2.5 * dt;
      }
      draw();
    },
    clear() { count = cursor = 0; draw(); },
  };
}

import * as THREE from 'three';

const CAPACITY = 68;
const BLOCK_COLORS = [0x1b2937, 0x3f484b, 0x70442e, 0xf04b2d, 0xff8b25, 0xffca37, 0xfff3a6];
const FIRE_PALETTE = [6, 5, 4, 3];
const FRAGMENT_PALETTE = [0, 1, 2];
const WAVE_PALETTE = [5, 4, 3];

export function createDusterExplosion(scene) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const blockMeshes = BLOCK_COLORS.map((color, index) => {
    const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ color, toneMapped: false }), CAPACITY);
    mesh.name = `Duster pixel explosion blocks ${index}`;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  });

  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffed9a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const flash = new THREE.Mesh(geometry, flashMaterial);
  flash.name = 'Duster pixel blast flash';
  flash.visible = false;
  flash.renderOrder = 2;
  scene.add(flash);

  const particles = Array.from({ length: CAPACITY }, () => ({
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    size: new THREE.Vector3(),
    rotation: new THREE.Vector3(),
    spin: new THREE.Vector3(),
    palette: 0,
    age: 0,
    life: 0,
    kind: 'fire',
  }));
  const dummy = new THREE.Object3D();
  const meshCounts = new Uint8Array(blockMeshes.length);
  let count = 0;
  let flashAge = Infinity;

  function addParticle(index, x, y, z, vx, vy, vz, sx, sy, sz, palette, life, kind, angle = 0) {
    const particle = particles[index];
    particle.position.set(x, y, z);
    particle.velocity.set(vx, vy, vz);
    particle.size.set(sx, sy, sz);
    particle.rotation.set(0, angle, 0);
    particle.spin.set((Math.random() - .5) * 5, (Math.random() - .5) * 7, (Math.random() - .5) * 5);
    particle.palette = palette;
    particle.age = 0;
    particle.life = life;
    particle.kind = kind;
  }

  function draw() {
    meshCounts.fill(0);
    for (let i = 0; i < count; i++) {
      const particle = particles[i];
      const fade = THREE.MathUtils.clamp(particle.life / (particle.kind === 'wave' ? .58 : 1.75), 0, 1);
      const shrink = THREE.MathUtils.clamp(fade / .22, 0, 1);
      const grow = particle.kind === 'wave' ? Math.min(1.8, .38 + particle.age * 8.5) : 1;
      dummy.position.copy(particle.position);
      dummy.rotation.set(
        particle.rotation.x + particle.spin.x * particle.age,
        particle.rotation.y + particle.spin.y * particle.age,
        particle.rotation.z + particle.spin.z * particle.age,
      );
      dummy.scale.set(particle.size.x * grow * shrink, particle.size.y * grow * shrink, particle.size.z * grow * shrink);
      dummy.updateMatrix();
      const mesh = blockMeshes[particle.palette];
      mesh.setMatrixAt(meshCounts[particle.palette]++, dummy.matrix);
    }
    for (let i = 0; i < blockMeshes.length; i++) {
      const mesh = blockMeshes[i];
      mesh.count = meshCounts[i];
      mesh.visible = meshCounts[i] > 0;
      if (mesh.visible) mesh.instanceMatrix.needsUpdate = true;
    }

    const flashLife = .32;
    flash.visible = flashAge < flashLife;
    if (flash.visible) {
      const progress = flashAge / flashLife;
      const pulse = progress < .24 ? progress / .24 : 1 - (progress - .24) / .76;
      const size = .35 + Math.max(0, pulse) * 3.7;
      flash.scale.set(size, size * .86, size);
      flash.rotation.set(.42, Math.PI / 4 + flashAge * 5, Math.PI / 4);
      flashMaterial.opacity = Math.max(0, pulse);
    }
  }

  return {
    burst(x, y, z) {
      count = 0;
      flashAge = 0;
      flash.position.set(x, y + .55, z);

      // A square shock ring races out around the car in chunky blocks.
      const waveCount = 20;
      for (let i = 0; i < waveCount; i++) {
        const angle = i * Math.PI * 2 / waveCount;
        const dx = Math.cos(angle), dz = Math.sin(angle);
        const speed = 9.6 + Math.random() * 2;
        addParticle(count++, x + dx * .28, y + .16, z + dz * .28,
          dx * speed, .35 + Math.random() * .55, dz * speed,
          .52, .2, .42, WAVE_PALETTE[i % WAVE_PALETTE.length], .58, 'wave', -angle);
      }

      // Orange, yellow and white blocks erupt upward, then fall away.
      const fireCount = 40;
      for (let i = 0; i < fireCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.6 + Math.random() * 3.4;
        const radius = Math.random() * .55;
        const size = .28 + Math.random() * .48;
        addParticle(count++, x + Math.cos(angle) * radius, y + .2 + Math.random() * 1.1, z + Math.sin(angle) * radius,
          Math.cos(angle) * speed, 2.2 + Math.random() * 3.8, Math.sin(angle) * speed,
          size, size * (.8 + Math.random() * .8), size,
          FIRE_PALETTE[Math.floor(Math.random() * FIRE_PALETTE.length)], .92 + Math.random() * .65, 'fire', angle);
      }

      // Dark square chunks give the burst a bold, arcade-style silhouette.
      while (count < CAPACITY) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 3.4;
        const size = .24 + Math.random() * .32;
        addParticle(count++, x + Math.cos(angle) * .3, y + .35 + Math.random() * .95, z + Math.sin(angle) * .3,
          Math.cos(angle) * speed, 1.7 + Math.random() * 4, Math.sin(angle) * speed,
          size, size * (.7 + Math.random() * .8), size,
          FRAGMENT_PALETTE[Math.floor(Math.random() * FRAGMENT_PALETTE.length)], 1.2 + Math.random() * .55, 'fragment', angle);
      }
      draw();
    },
    update(dt) {
      if (count === 0 && flashAge === Infinity) return;
      if (flashAge < .32) flashAge += dt;
      for (let i = count - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.age += dt;
        particle.life -= dt;
        if (particle.life <= 0) {
          particles[i] = particles[--count];
          particles[count] = particle;
          continue;
        }
        particle.position.addScaledVector(particle.velocity, dt);
        particle.velocity.y -= particle.kind === 'wave' ? 1.2 * dt : 5.2 * dt;
      }
      if (count === 0 && flashAge >= .32) {
        flashAge = Infinity;
        flash.visible = false;
        return;
      }
      draw();
    },
    clear() {
      count = 0;
      flashAge = Infinity;
      draw();
    },
  };
}

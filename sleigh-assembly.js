import * as THREE from 'three';

const { lerp, smoothstep } = THREE.MathUtils;

export function createSleighAssembly(parts, overlay) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  camera.position.set(0, 4.9, 9);
  camera.lookAt(0, 1.25, 0);
  const turntable = new THREE.Group();
  scene.add(turntable, new THREE.HemisphereLight('#ffe9d2', '#7998b5', 2.1));
  for (const [color, intensity, position] of [
    ['#ffe2b0', 3.65, [3, 7, 5]], ['#9ddfff', 2.7, [-5, 4, -4]], ['#f39b65', 1.2, [1, 1, -5]],
  ]) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...position);
    scene.add(light);
  }
  for (const { model } of parts) turntable.add(model);
  const stage = new THREE.Mesh(new THREE.CircleGeometry(3.1, 88), new THREE.MeshBasicMaterial({ color: '#101b25' }));
  stage.position.y = -.16;
  stage.rotation.x = -Math.PI / 2;
  scene.add(stage);
  for (const [radius, thickness, color] of [[3.09, .019, '#b08047'], [2.89, .01, '#42535c'], [2.72, .008, '#3b4650']]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius - thickness, radius, 88), new THREE.MeshBasicMaterial({ color }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -.15;
    scene.add(ring);
  }
  const sparks = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(.063), new THREE.MeshBasicMaterial({ color: '#ffcc73', toneMapped: false }), 32,
  );
  sparks.frustumCulled = false;
  scene.add(sparks);
  const dummy = new THREE.Object3D();
  const partCenter = new THREE.Vector3();
  const label = overlay.querySelector('#assembly-part');
  const status = overlay.querySelector('#assembly-status');
  const total = overlay.querySelector('#assembly-count');
  const award = overlay.querySelector('#assembly-award');
  const awardTotal = overlay.querySelector('#award-total');
  const awardBreakdown = overlay.querySelector('#award-breakdown');
  let index = -1, elapsed = 0, smallMotion = false, attached = false;

  function updatePose() {
    const model = parts[index].model;
    const landing = smallMotion ? .38 : 2.02;
    const travel = smallMotion ? smoothstep(elapsed, 0, landing) : smoothstep(elapsed, .25, landing);
    model.position.copy(parts[index].approach).multiplyScalar((1 - travel) * (smallMotion ? .45 : 1.85));
    model.rotation.set((1 - travel) * (smallMotion ? 0 : .32), 0, (1 - travel) * (smallMotion ? 0 : -.24));
    turntable.rotation.y = smallMotion ? .82 : .82 + Math.PI * 2 * smoothstep(elapsed, 0, 3.12);
    const zoom = smallMotion ? 1 : lerp(.86, 1, travel);
    if (zoom !== camera.zoom) { camera.zoom = zoom; camera.updateProjectionMatrix(); }
    if (!attached && elapsed >= landing) {
      attached = true;
      const complete = index === parts.length - 1;
      status.textContent = complete ? 'SLEIGH COMPLETE' : 'PART FITTED';
      if (complete) label.textContent = 'Joulupukki’s sleigh';
      total.textContent = `${index + 1} / ${parts.length}`;
      overlay.classList.add('part-fitted');
    }
    const burst = (elapsed - landing) / .8;
    sparks.visible = !smallMotion && burst >= 0 && burst < 1;
    if (!sparks.visible) return;
    for (let i = 0; i < sparks.count; i++) {
      const angle = i * 2.39996, reach = (.6 + (i % 7) * .15) * burst;
      dummy.position.set(partCenter.x + Math.cos(angle) * reach, partCenter.y + burst * (1.45 + (i % 4) * .3) - burst ** 2 * 1.4,
        partCenter.z + Math.sin(angle) * reach);
      dummy.position.applyAxisAngle(THREE.Object3D.DEFAULT_UP, turntable.rotation.y);
      dummy.rotation.set(i, angle + burst * 3, burst * 3);
      dummy.scale.setScalar(lerp(1.3, .03, burst));
      dummy.updateMatrix();
      sparks.setMatrixAt(i, dummy.matrix);
    }
    sparks.instanceMatrix.needsUpdate = true;
  }

  function clear() {
    index = -1;
    overlay.hidden = true;
  }

  return {
    get active() { return index >= 0; },
    prepare(renderer) { return renderer.compileAsync(scene, camera); },
    start(partIndex, reducedMotion, points) {
      index = partIndex;
      elapsed = 0;
      attached = false;
      smallMotion = reducedMotion;
      parts.forEach(({ model }, position) => {
        model.visible = position <= index;
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
      });
      turntable.rotation.y = 0;
      turntable.updateMatrixWorld(true);
      new THREE.Box3().setFromObject(parts[index].model).getCenter(partCenter);
      label.textContent = parts[index].name;
      status.textContent = 'PART FOUND';
      total.textContent = `${index} / ${parts.length}`;
      award.hidden = !points;
      if (points) {
        awardTotal.textContent = `+${points.total.toLocaleString()} pts`;
        const entries = [`Part +${points.part}`, `Speed +${points.speed}`, `Combat +${points.combat}`];
        if (points.dodges) entries.push(`Dodges +${points.dodges}`);
        entries.push(`Damage ${points.damage ? `−${points.damage}` : '0'}`);
        awardBreakdown.textContent = entries.join(' · ');
      }
      overlay.classList.remove('part-fitted');
      overlay.hidden = false;
      updatePose();
    },
    update(dt) {
      elapsed += dt;
      updatePose();
      const duration = smallMotion ? (index === parts.length - 1 ? 1.7 : 1.15) : (index === parts.length - 1 ? 4.35 : 3.45);
      if (elapsed < duration) return false;
      clear();
      return true;
    },
    resize(width, height) {
      const aspect = width / height;
      const halfHeight = Math.max(3.45, 3.95 / aspect);
      camera.left = -halfHeight * aspect;
      camera.right = -camera.left;
      camera.bottom = -halfHeight;
      camera.top = halfHeight;
      camera.updateProjectionMatrix();
    },
    render(renderer) { renderer.render(scene, camera); },
    clear,
  };
}

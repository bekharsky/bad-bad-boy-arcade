import * as THREE from 'three';
import { animateStudy, createSculptPurra } from './models.js';
import { createPhotoPurra, posePhotoHead } from './photo-head.js';

const root = document.getElementById('purra-study');
const yawControl = root.querySelector('#purra-yaw');
const yawValue = root.querySelector('#purra-yaw-value');
const motion = root.querySelector('#purra-motion');
const close = root.querySelector('#purra-close');
const photoAngle = root.querySelector('#purra-photo-angle');

function makeView(canvas, actor) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 30);
  const key = new THREE.DirectionalLight(0xfff1e4, 2.35);
  key.position.set(-3, 5, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -3;
  key.shadow.camera.right = key.shadow.camera.top = 3;
  key.shadow.normalBias = 0.018;
  const fill = new THREE.DirectionalLight(0xe7efff, 1.15);
  fill.position.set(4, 2, 5);
  const rim = new THREE.DirectionalLight(0xffe8cb, 1);
  rim.position.set(2, 4, -5);
  scene.add(key, fill, rim, new THREE.HemisphereLight(0xf3f6ff, 0xa99a89, 1.7), actor);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.ShadowMaterial({ opacity: 0.14 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  return { canvas, renderer, scene, camera, actor };
}

try {
  const sculpt = createSculptPurra();
  const collage = await createPhotoPurra();
  const views = [
    makeView(root.querySelector('#purra-sculpt'), sculpt),
    makeView(root.querySelector('#purra-photo'), collage),
  ];
  let time = 0,
    angle = 0,
    last = 0,
    raf = 0;
  const wrap = (value) => ((((value + 180) % 360) + 360) % 360) - 180;

  function draw() {
    const running = motion.value !== 'still';
    const displayAngle = Math.round(angle);
    yawControl.value = String(displayAngle);
    yawValue.value = `${displayAngle}°`;
    for (const view of views) {
      view.actor.rotation.y = THREE.MathUtils.degToRad(angle);
      animateStudy(view.actor, time, running);
    }
    const label = posePhotoHead(collage, angle, time, running);
    if (photoAngle.textContent !== label) photoAngle.textContent = label;
    for (const view of views) view.renderer.render(view.scene, view.camera);
  }

  function resize() {
    for (const { canvas, renderer, camera } of views) {
      const width = canvas.clientWidth,
        height = canvas.clientHeight;
      if (!width || !height) continue;
      renderer.setSize(width, height, false);
      const aspect = width / height;
      const halfHeight = close.checked ? Math.max(0.67, 0.59 / aspect) : 1.83;
      const center = close.checked ? 2.72 : 1.65;
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.position.set(0, center + (close.checked ? 0.15 : 0.6), 8);
      camera.lookAt(0, center, 0);
      camera.updateProjectionMatrix();
    }
    draw();
  }

  function persist() {
    window.openai
      ?.setWidgetState?.({
        modelContent: { character: 'purra', angle: Math.round(angle) },
        privateContent: { angle, close: close.checked },
      })
      ?.catch(() => {});
  }

  function restore(state) {
    if (Number.isFinite(state?.angle)) angle = THREE.MathUtils.clamp(state.angle, -180, 180);
    if (typeof state?.close === 'boolean') close.checked = state.close;
    resize();
  }

  function tick(now) {
    const dt = last ? Math.min(0.06, (now - last) / 1000) : 0;
    last = now;
    time += dt;
    if (motion.value === 'turn') angle = wrap(angle + dt * 66);
    draw();
    raf = requestAnimationFrame(tick);
  }

  function syncMotion() {
    cancelAnimationFrame(raf);
    last = 0;
    if (motion.value !== 'still' && !document.hidden) raf = requestAnimationFrame(tick);
    else draw();
  }

  yawControl.addEventListener('input', () => {
    angle = Number(yawControl.value);
    if (motion.value === 'turn') motion.value = 'run';
    draw();
  });
  yawControl.addEventListener('change', persist);
  motion.addEventListener('change', () => {
    if (motion.value !== 'still' && close.checked) {
      close.checked = false;
      resize();
    }
    syncMotion();
  });
  close.addEventListener('change', () => {
    resize();
    persist();
  });
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('openai:set_globals', (event) => restore(event.detail?.globals?.widgetState?.privateContent));
  new ResizeObserver(resize).observe(root.querySelector('.purra-pair'));
  restore(window.openai?.widgetState?.privateContent);
} catch (error) {
  const message = root.querySelector('#purra-error');
  message.textContent = `Не удалось показать модели: ${error.message}`;
  message.hidden = false;
}

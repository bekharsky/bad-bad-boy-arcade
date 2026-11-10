import * as THREE from 'three';
import { createCameoModel, animateCameo } from '../../runner/cameo-models.js';
import { preloadCameoPhotos } from '../../runner/cameo-photos.js';

const root = document.getElementById('cameo-lineup');
const slider = root.querySelector('#lineup-angle');
const output = root.querySelector('#lineup-angle-value');
const motion = root.querySelector('#lineup-motion');
const portrait = root.querySelector('#lineup-portrait');

function makeView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 30);
  const model = createCameoModel(canvas.dataset.kind);
  const sun = new THREE.DirectionalLight(0xfff1e4, 2.35);
  sun.position.set(-3, 5, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512);
  sun.shadow.normalBias = .018;
  const fill = new THREE.DirectionalLight(0xe7efff, 1.15);
  fill.position.set(4, 2, 5);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.ShadowMaterial({ opacity: .13 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(model, sun, fill, ground, new THREE.HemisphereLight(0xf3f6ff, 0xa99a89, 1.7));
  return { canvas, renderer, camera, scene, model };
}

try {
  const photoUrls = JSON.parse(document.getElementById('lineup-photos').textContent);
  const failedPhotos = await preloadCameoPhotos(file => photoUrls[file]);
  if (failedPhotos) throw new Error('Не загрузились фотографии');
  const views = [...root.querySelectorAll('canvas')].map(makeView);
  let angle = 0, time = 0, last = 0, frame = 0;
  function draw() {
    slider.value = String(Math.round(angle));
    output.value = `${Math.round(angle)}°`;
    const yaw = THREE.MathUtils.degToRad(angle);
    for (const view of views) {
      view.model.rotation.y = yaw;
      animateCameo(view.model, time, motion.value !== 'still', -yaw);
      view.renderer.render(view.scene, view.camera);
    }
  }
  function resize() {
    for (const { canvas, camera, renderer, model } of views) {
      const width = canvas.clientWidth, height = canvas.clientHeight;
      if (!width || !height) continue;
      renderer.setSize(width, height, false);
      const aspect = width / height;
      const half = portrait.checked ? Math.max(.72, .68 / aspect) : 1.91;
      const center = portrait.checked ? 2.59 * model.scale.y : 1.74;
      camera.left = -half * aspect;
      camera.right = half * aspect;
      camera.top = half;
      camera.bottom = -half;
      camera.position.set(0, center + (portrait.checked ? .13 : .55), 8);
      camera.lookAt(0, center, 0);
      camera.updateProjectionMatrix();
    }
    draw();
  }
  function tick(now) {
    const dt = last ? Math.min(.06, (now - last) / 1000) : 0;
    time += dt;
    last = now;
    if (motion.value === 'turn') angle = ((angle + 180 + dt * 66) % 360) - 180;
    draw();
    frame = requestAnimationFrame(tick);
  }
  function syncMotion() {
    cancelAnimationFrame(frame);
    last = 0;
    if (motion.value !== 'still' && !document.hidden) frame = requestAnimationFrame(tick);
    else draw();
  }
  function save() {
    window.openai?.setWidgetState?.({
      modelContent: { characters: views.map(view => view.canvas.dataset.kind) },
      privateContent: { angle, portrait: portrait.checked },
    })?.catch(() => {});
  }
  function restore(state) {
    if (Number.isFinite(state?.angle)) angle = THREE.MathUtils.clamp(state.angle, -180, 180);
    if (typeof state?.portrait === 'boolean') portrait.checked = state.portrait;
    resize();
  }
  slider.addEventListener('input', () => {
    angle = Number(slider.value);
    if (motion.value === 'turn') motion.value = 'run';
    draw();
  });
  slider.addEventListener('change', save);
  portrait.addEventListener('change', () => { resize(); save(); });
  motion.addEventListener('change', () => {
    if (motion.value !== 'still' && portrait.checked) { portrait.checked = false; resize(); }
    syncMotion();
  });
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('openai:set_globals', event => restore(event.detail?.globals?.widgetState?.privateContent));
  new ResizeObserver(resize).observe(root.querySelector('.lineup-grid'));
  restore(window.openai?.widgetState?.privateContent);
} catch (error) {
  const message = root.querySelector('#lineup-error');
  message.textContent = `Не удалось показать модели. ${error.message}`;
  message.hidden = false;
}

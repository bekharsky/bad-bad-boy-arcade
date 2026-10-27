import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createHero, animateHero, HERO_BASE_HEIGHT } from './hero.js';
import { maps, mapOrder } from './maps/index.js';
import { createMapManager } from './world/map-manager.js';
import { createGameCamera } from './world/game-camera.js';
import { createCampaign, createWaveDirector } from './waves.js';
import { createBatteries } from './batteries.js';
import { loadEnemyModels, createEnemy, animateEnemy, disposeEnemy } from './enemies.js';
import { createLiquidStream } from './liquid.js';
import { createBiteEffects } from './bites.js';
import { createMedkits } from './medkits.js';
import { createTouchControls } from './touch-controls.js';
import { movePlayer } from './movement.js';
import { createAimAssist } from './aim-assist.js';
import { createMouseAim } from './mouse-aim.js';
import { bindGameInput } from './game-input.js';
import { preventGameZoom } from './gesture-guard.js';

const MODEL_URL = './assets/bad-bad-boy.glb?v=20261025-opt1';
// World metres; the hero keeps the same physical size across every map.
const HERO_HEIGHT = 3.45;
const HERO_SCALE = HERO_HEIGHT / HERO_BASE_HEIGHT;
const keys = new Set();
let controlMode = 'tank';
let usingTouchControls = window.matchMedia('(pointer: coarse)').matches;
let aimAssistEnabled = true;
let mouseAimEnabled = true;
let soundEnabled = false;
try {
  const savedMode = localStorage.getItem('golden-blast-controls');
  if (savedMode === 'direct' || savedMode === 'tank') controlMode = savedMode;
  aimAssistEnabled = localStorage.getItem('golden-blast-aim-assist') !== 'false';
  mouseAimEnabled = localStorage.getItem('golden-blast-mouse-aim') !== 'false';
  soundEnabled = localStorage.getItem('golden-blast-sound') === 'true';
} catch { /* Settings still work when browser storage is unavailable. */ }

const canvas = document.querySelector('#game');
preventGameZoom(document);
const status = document.querySelector('#load-status');
const startScreen = document.querySelector('#start-screen');
const endScreen = document.querySelector('#end-screen');
const startButton = document.querySelector('#start');
const restartButton = document.querySelector('#restart');
const heroHud = document.querySelector('#hero-hud');
const heroPower = document.querySelector('#hero-power');
const heroHpFill = document.querySelector('#hero-hp-fill');
const heroHeadPosition = new THREE.Vector3();
const scoreLabel = document.querySelector('#score');
const waveLabel = document.querySelector('#wave');
const toast = document.querySelector('#toast');
const sprayRange = document.querySelector('#spray-range');
const pressureFill = document.querySelector('#pressure-fill');
const controlsDialog = document.querySelector('#controls-dialog');
const settingsButton = document.querySelector('#open-settings');
const settingsDone = document.querySelector('#settings-done');
const soundSetting = document.querySelector('#sound-setting');
const rangeHud = document.querySelector('.range-hud');
const query = new URLSearchParams(window.location.search);
const debugMaps = query.get('debug') === 'maps';
const mouseSupported = typeof canvas.requestPointerLock === 'function' && window.matchMedia('(any-pointer: fine)').matches;
const aimRay = new THREE.Raycaster();
const aimScreen = new THREE.Vector2();
const aimPoint = new THREE.Vector3();
const aimGround = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let lastMouseUnlock = -Infinity;
let mouseCaptureFailed = false;
const mouseAim = createMouseAim({
  canvas,
  getInitialPosition: aimCursorPosition,
  onUnlock() {
    lastMouseUnlock = performance.now();
    if (playing) openSettings();
  },
  onError() { mouseCaptureFailed = true; }
});
const touchControls = createTouchControls({
  zone: document.querySelector('#joystick-zone'),
  stick: document.querySelector('#joystick'),
  thumb: document.querySelector('#joystick-thumb'),
  home: document.querySelector('.joystick-hint'),
  fireButton: document.querySelector('#mobile-fire'),
  onFireStart: beginSpray,
  onInput() {
    if (!usingTouchControls) { usingTouchControls = true; syncControlMode(); }
  }
});

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#7c929f');
scene.fog = new THREE.Fog('#7c929f', 40, 100);
const campaign = createCampaign(mapOrder(query.get('map')).map(map => map.id));
const world = createMapManager(scene, maps, .32 * HERO_SCALE);
world.activate(campaign.plan(1).mapId);

const cameraRig = createGameCamera();
const { camera } = cameraRig;
cameraRig.frame(world.spawn.x, world.spawn.z, 0, true);

scene.add(new THREE.HemisphereLight(0xd8e9ff, 0x757264, 2.3));
const keyLight = new THREE.DirectionalLight(0xffdfad, 2.6);
keyLight.position.set(-12, 25, 10);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -38;
keyLight.shadow.camera.right = 38;
keyLight.shadow.camera.top = 38;
keyLight.shadow.camera.bottom = -38;
keyLight.shadow.normalBias = 0.035;
keyLight.shadow.camera.far = 100;
scene.add(keyLight);

const player = {
  root: new THREE.Group(),
  body: new THREE.Group(),
  model: null,
  rig: null,
  x: world.spawn.x,
  z: world.spawn.z,
  dx: 0,
  dz: 1,
  heading: 0,
  targetHeading: 0,
  moveX: 0,
  moveZ: 1,
  moveSpeed: 0,
  turnSpeed: 0,
  hp: 5,
  maxHp: 5,
  speed: 3.6,
  radius: 0.32 * HERO_SCALE,
  invulnerable: 0,
  powerTimer: 0,
  fireTimer: 0,
  tapTimer: 0,
  runTime: 0,
  runBlend: 0
};
player.root.add(player.body);
player.root.position.set(player.x, 0, player.z);
scene.add(player.root);

function hitEnemy(enemy, direction, impact) {
  enemy.hp -= impact.damage;
  enemy.hit = 0.18;
  world.move(enemy, direction.x * impact.knockback, direction.z * impact.knockback, enemy.size);
  enemy.root.position.set(enemy.x, 0, enemy.z);
  if (enemy.hp <= 0) removeEnemy(enemy, true);
}
const streamOptions = { scale: HERO_HEIGHT / 2.25, refraction: !window.matchMedia('(pointer: coarse)').matches, getHitTime: () => gameTime };
const stream = createLiquidStream(scene, world, hitEnemy, streamOptions);
// Battery power adds two side streams that fan out from the centre stream.
const sideStreams = [createLiquidStream(scene, world, hitEnemy, streamOptions), createLiquidStream(scene, world, hitEnemy, streamOptions)];

const enemies = [];
const waves = createWaveDirector({
  campaign,
  onWave: spawnWave,
  onReinforcements(count, plan) {
    spawnEnemies(count, plan.number);
    showToast(`REINFORCEMENTS +${count} · KEEP FIGHTING!`);
  },
});
const aimAssist = createAimAssist((origin, enemy) => world.lineClear(origin.x, origin.z, enemy.x, enemy.z, .12));
const assistMarker = new THREE.Mesh(
  new THREE.RingGeometry(.88, 1, 32),
  new THREE.MeshBasicMaterial({ color: '#ffd34e', transparent: true, opacity: .85, depthWrite: false })
);
assistMarker.rotation.x = -Math.PI / 2;
assistMarker.visible = false;
scene.add(assistMarker);
const effects = [];
const biteEffects = createBiteEffects(scene);
const medkits = createMedkits(scene, world);
const batteries = createBatteries(scene, world);
// Battery cans are hidden in back courtyards. Exploration powers up the spray.
const POWER_TIME = 8;
const SPREAD_ANGLE = 0.22;
const STREAM_COLOR = '#ffd34c';
const POWER_COLOR = '#39ff14';
const spreadFacing = { dx: 0, dz: 0 };
let spreadOn = false;
let playing = false;
let gameTime = 0;
let score = 0;
let audioContext = null;
let frameTime = 0;

if (debugMaps) {
  startScreen.classList.add('map-debug');
  for (const picker of document.querySelectorAll('[data-debug-maps]')) {
    picker.hidden = false;
    const title = document.createElement('h3');
    title.textContent = 'MAPS';
    picker.append(title);
    for (const map of maps) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'debug-map-button';
      button.dataset.debugMap = map.id;
      button.setAttribute('aria-label', `Play ${map.name}`);
      button.disabled = true;
      const name = document.createElement('strong'), id = document.createElement('small');
      name.textContent = map.name; id.textContent = map.id;
      button.append(name, id);
      button.addEventListener('click', () => {
        campaign.setStartingMap(map.id);
        if (controlsDialog.open) controlsDialog.close();
        startGame();
        requestMouseAim();
      });
      picker.append(button);
    }
  }
}

async function loadHero() {
  const url = new URL(MODEL_URL, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Hero download failed: HTTP ${response.status}`);
  let bytes;
  if (response.body) {
    const reader = response.body.getReader();
    const chunks = [], header = new Uint8Array(12);
    let loaded = 0, headerLength = 0, total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); loaded += value.byteLength;
        if (headerLength < header.length) {
          const part = value.subarray(0, header.length - headerLength);
          header.set(part, headerLength); headerLength += part.length;
          if (headerLength === header.length) {
            const view = new DataView(header.buffer);
            if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) throw new Error('Invalid hero GLB header');
            // GLB stores the decoded size. HTTP Content-Length can describe
            // compressed bytes, while fetch streams already decoded bytes.
            total = view.getUint32(8, true);
            if (total < 20) throw new Error('Invalid hero GLB length');
          }
        }
        if (total) {
          if (loaded > total) throw new Error('Hero GLB exceeds its declared length');
          const percent = Math.max(0, Math.min(99, Math.floor(loaded / total * 100)));
          status.textContent = `Loading the hero… ${percent}%`;
        }
      }
    } finally {
      reader.releaseLock();
    }
    if (!total || loaded !== total) throw new Error('Hero GLB download is incomplete');
    bytes = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  } else {
    bytes = new Uint8Array(await response.arrayBuffer());
  }
  status.textContent = 'Preparing the models…';
  return new GLTFLoader().parseAsync(bytes.buffer, new URL('.', url).href);
}

async function loadModels() {
  try {
    status.textContent = 'Loading the hero, snails, and Spanish slugs…';
    const [gltf] = await Promise.all([
      loadHero(),
      loadEnemyModels(),
    ]);
    player.rig = createHero(gltf.scene);
    player.model = player.rig.mesh;
    player.model.scale.setScalar(HERO_SCALE);
    player.body.add(player.model);
    status.classList.add('hidden');
    startButton.disabled = false;
    startButton.textContent = 'PLAY';
    for (const button of document.querySelectorAll('[data-debug-map]')) button.disabled = false;
    const initialButton = debugMaps ? startScreen.querySelector('[data-debug-map]') : startButton;
    if (!controlsDialog.open && [document.body, canvas].includes(document.activeElement)) initialButton.focus({ preventScroll: true });
    window.dispatchEvent(new Event('game:ready'));
  } catch (error) {
    console.error('Could not load game models:', error);
    status.textContent = 'Could not load the models. Start the local server, then refresh the page.';
    window.dispatchEvent(new CustomEvent('game:load-error', { detail: error }));
  }
}

function makeEnemy(x, z, level, kind) {
  const enemy = createEnemy(kind, level);
  enemy.x = x;
  enemy.z = z;
  enemy.root.position.set(x, 0, z);
  scene.add(enemy.root);
  enemies.push(enemy);
}

function spawnEnemies(count, level) {
  world.routeTo(player.x, player.z);
  for (let i = 0; i < count; i++) {
    const point = world.spawnPoint(player, i, count);
    if (point) makeEnemy(point.x, point.z, level, i % 3 === 0 ? 'slug' : 'snail');
  }
}

function spawnWave(plan) {
  const changedMap = world.activate(plan.mapId);
  if (changedMap || plan.number === 1) {
    // Preserve score and health between maps; no old attacks or pickups travel
    // with the player. Reset also rebuilds navigation before placing pickups.
    clearArena();
    world.reset();
    placePlayerAtSpawn();
    medkits.reset(player);
    batteries.reset(player);
  }
  waveLabel.textContent = String(plan.number).padStart(2, '0');
  spawnEnemies(plan.enemyCount, plan.number);
  if (plan.number > 1) showToast(changedMap ? `WAVE ${plan.number} · ${world.name.toUpperCase()}` : `WAVE ${plan.number}`);
}

function removeEnemy(enemy, pop = false) {
  if (!enemy.alive) return;
  enemy.alive = false;
  disposeEnemy(enemy);
  if (pop) {
    score += 150;
    waves.onKill();
    scoreLabel.textContent = String(score).padStart(4, '0');
    burst(enemy.x, enemy.hitHeight, enemy.z, 0xffd34e, 10);
    blip(440 + Math.random() * 280, 0.045);
  }
}

function burst(x, y, z, color, count = 8, forward = null) {
  for (let i = 0; i < count; i++) {
    const radius = 0.025 + Math.random() * 0.045;
    const object = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 7, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
    );
    object.position.set(x, y, z);
    scene.add(object);
    const spread = forward ? new THREE.Vector3(forward.x * (1.8 + Math.random() * 2) + (Math.random() - 0.5) * 1.5, Math.random() * 1.2, forward.z * (1.8 + Math.random() * 2) + (Math.random() - 0.5) * 1.5) : new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.8, (Math.random() - 0.5) * 2);
    effects.push({ object, velocity: spread, life: 0.32 + Math.random() * 0.28, maxLife: 0.6, gravity: 2.5 });
  }
}

function showBite(enemy) {
  const attacker = new THREE.Vector3(enemy.x, THREE.MathUtils.clamp(enemy.hitHeight, .18, .48), enemy.z);
  const contact = new THREE.Vector3();
  let nearest = Infinity;
  // Use the animated shin closest to the attacker, including during a stride.
  for (const leg of player.rig.legs) {
    const ankle = leg.ankle.getWorldPosition(new THREE.Vector3());
    const knee = leg.knee.getWorldPosition(new THREE.Vector3());
    const height = knee.y - ankle.y;
    const t = Math.abs(height) > .001 ? THREE.MathUtils.clamp((attacker.y - ankle.y) / height, 0, 1) : 0;
    const point = ankle.lerp(knee, t);
    const distance = point.distanceToSquared(attacker);
    if (distance < nearest) { nearest = distance; contact.copy(point); }
  }
  const outward = new THREE.Vector3(attacker.x - contact.x, 0, attacker.z - contact.z);
  if (outward.lengthSq() < .0001) outward.set(-player.dx, 0, -player.dz);
  outward.normalize();
  contact.addScaledVector(outward, .055 * HERO_SCALE);
  biteEffects.burst(contact, outward, HERO_SCALE);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('visible'), 1000);
}

function blip(frequency, duration) {
  if (!soundEnabled) return;
  audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') audioContext.resume();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.035, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function updateMovement(dt, firing) {
  if (keyboardSteering() || touchControls.input.x || touchControls.input.z) mouseAim.resetAim();
  const mode = usingTouchControls ? 'direct' : controlMode;
  const assisted = mode === 'direct' && aimAssistEnabled && firing && !mouseAim.aiming && !keys.has('ShiftLeft') && !keys.has('ShiftRight');
  if (!assisted) resetAimAssist();
  return movePlayer(player, world, {
    keys, touch: touchControls.input, mode, dt, firing, height: HERO_HEIGHT,
    resolveAim: assisted ? resolveAssistedHeading : null,
    aimHeading: mouseHeading()
  });
}

function keyboardSteering() {
  return keys.has('ArrowLeft') || keys.has('ArrowRight') || keys.has('KeyA') || keys.has('KeyD')
    || keys.has('ShiftLeft') || keys.has('ShiftRight')
    || (controlMode === 'direct' && (keys.has('ArrowUp') || keys.has('ArrowDown') || keys.has('KeyW') || keys.has('KeyS')));
}

function aimCursorPosition() {
  aimPoint.set(player.x + Math.sin(player.heading) * 4, 0, player.z + Math.cos(player.heading) * 4).project(camera);
  return { x: (aimPoint.x + 1) * canvas.clientWidth / 2, y: (1 - aimPoint.y) * canvas.clientHeight / 2 };
}

function mouseHeading() {
  if (!mouseAim.aiming) return null;
  aimScreen.set(mouseAim.position.x / canvas.clientWidth * 2 - 1, 1 - mouseAim.position.y / canvas.clientHeight * 2);
  aimRay.setFromCamera(aimScreen, camera);
  if (!aimRay.ray.intersectPlane(aimGround, aimPoint)) return player.heading;
  const dx = aimPoint.x - player.x, dz = aimPoint.z - player.z;
  return dx * dx + dz * dz > .01 ? Math.atan2(dx, dz) : player.heading;
}

function syncMouseAim() {
  mouseAim.setEnabled(mouseSupported && mouseAimEnabled && !usingTouchControls && playing && !controlsDialog.open);
}

function requestMouseAim() {
  syncMouseAim();
  if (!mouseCaptureFailed) mouseAim.request();
}

function resolveAssistedHeading(heading, dt) {
  const target = aimAssist.update(player, heading, enemies, dt);
  return target ? Math.atan2(target.x - player.x, target.z - player.z) : null;
}

function resetAimAssist() {
  aimAssist.reset();
  assistMarker.visible = false;
}

function update(dt) {
  if (controlsDialog.open) return;
  gameTime += dt;
  // Finish the final bite's splash even after the round ends.
  biteEffects.update(dt);
  if (!playing) return;
  const announcement = world.update(dt, [player, ...enemies]);
  if (announcement) showToast(announcement);

  const firing = keys.has('Space') || keys.has('Fire') || touchControls.input.firing || player.tapTimer > 0;
  const moving = updateMovement(dt, firing);
  if (mouseAim.locked && !mouseAim.aiming) {
    const cursor = aimCursorPosition();
    mouseAim.setPosition(cursor.x, cursor.y);
  }

  player.root.position.set(player.x, 0, player.z);
  player.runBlend = THREE.MathUtils.damp(player.runBlend, moving ? 1 : 0, 18, dt);
  player.body.position.y = (Math.abs(Math.sin(player.runTime)) * 0.035 * player.runBlend + Math.sin(gameTime * 1.5) * 0.008 * (1 - player.runBlend)) * HERO_SCALE;
  player.body.rotation.z = Math.cos(player.runTime) * 0.025 * player.runBlend;
  player.body.rotation.x = 0.07 * player.runBlend * THREE.MathUtils.clamp(player.moveSpeed / player.speed, -1, 1);
  animateHero(player.rig, player.runTime, player.runBlend);
  medkits.update(dt, player, collectMedkit);
  batteries.update(dt, player, collectBattery);

  player.tapTimer = Math.max(0, player.tapTimer - dt);
  // Each parcel starts at the hands, then follows its own ballistic trajectory.
  const spray = stream.update(dt, firing, player.rig.emitter, player, enemies);
  player.powerTimer = Math.max(0, player.powerTimer - dt);
  updateSpread(dt, firing);
  pressureFill.style.transform = `scaleX(${spray.charge})`;
  sprayRange.textContent = spray.blocked ? '×' : `${spray.range.toFixed(1)} m`;
  rangeHud.setAttribute('aria-label', spray.blocked ? 'Spray blocked' : `Spray range ${spray.range.toFixed(1)} metres`);
  player.fireTimer -= dt;
  if (firing && player.fireTimer <= 0) {
    blip(180 + Math.random() * 35, 0.035);
    player.fireTimer = 0.1;
  }

  world.routeTo(player.x, player.z);
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.attack -= dt;
    enemy.hit = Math.max(0, enemy.hit - dt);
    const vx = player.x - enemy.x;
    const vz = player.z - enemy.z;
    const dist = Math.hypot(vx, vz) || 0.001;
    const attacking = dist <= enemy.size + player.radius + 0.06 && world.lineClear(enemy.x, enemy.z, player.x, player.z, 0.1);
    enemy.root.rotation.y = Math.atan2(vx, vz);
    if (!attacking) {
      const direction = world.chase(enemy.x, enemy.z, player.x, player.z);
      // Soft separation keeps a pack from collapsing into one blob.
      for (const other of enemies) {
        if (other === enemy || !other.alive) continue;
        const sx = enemy.x - other.x, sz = enemy.z - other.z;
        const distance = Math.hypot(sx, sz);
        const spacing = (enemy.size + other.size) * 0.88;
        if (distance > 0.001 && distance < spacing) {
          direction.x += sx / distance * (spacing - distance) * 1.8;
          direction.z += sz / distance * (spacing - distance) * 1.8;
        }
      }
      const step = Math.hypot(direction.x, direction.z);
      if (step > 0.01) {
        world.move(enemy, direction.x / step * enemy.speed * dt, direction.z / step * enemy.speed * dt, enemy.size);
        enemy.root.rotation.y = Math.atan2(direction.x, direction.z);
      }
      enemy.root.position.set(enemy.x, 0, enemy.z);
    } else if (enemy.attack <= 0 && player.invulnerable <= 0) {
      player.hp--;
      player.invulnerable = 0.85;
      enemy.attack = 1.2;
      updateHealth();
      showBite(enemy);
      blip(115, 0.12);
      if (player.hp <= 0) endGame();
    }
    animateEnemy(enemy, dt, gameTime, attacking);
  }

  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.model.material.opacity = player.invulnerable > 0 && Math.floor(gameTime * 18) % 2 === 0 ? 0.45 : 1;
  player.model.material.transparent = player.invulnerable > 0;

  for (let i = effects.length - 1; i >= 0; i--) {
    const effect = effects[i];
    effect.life -= dt;
    effect.object.position.addScaledVector(effect.velocity, dt);
    effect.velocity.y -= (effect.gravity || 0) * dt;
    effect.object.material.opacity = Math.max(0, effect.life / effect.maxLife);
    effect.object.scale.setScalar(Math.max(0.01, effect.life / effect.maxLife));
    if (effect.life <= 0) {
      scene.remove(effect.object);
      effect.object.geometry.dispose();
      effect.object.material.dispose();
      effects.splice(i, 1);
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    if (!enemies[i].alive) enemies.splice(i, 1);
  }
  if (playing) waves.update(dt, enemies.length);

  const assistedTarget = aimAssist.target;
  assistMarker.visible = !!assistedTarget?.alive;
  if (assistMarker.visible) {
    assistMarker.position.set(assistedTarget.x, .025, assistedTarget.z);
    assistMarker.scale.setScalar(assistedTarget.size + .18);
  }
  // Pan with a fixed viewing angle so movement does not swing the aiming view.
  cameraRig.frame(player.x, player.z, dt);
}

function updateHealth() {
  const ratio = Math.max(0, player.hp / player.maxHp);
  heroHpFill.style.width = `${ratio * 100}%`;
  heroHpFill.style.background = ratio < 0.4 ? 'linear-gradient(90deg, #f04559, #ff7952)' : 'linear-gradient(90deg, #ff8b54, #ffd34e)';
  heroHpFill.parentElement.setAttribute('aria-valuenow', String(player.hp));
}

// Keeps the hero's HP bar above his head on screen. Hidden when he is off screen.
function updateHeroHp() {
  const powered = player.powerTimer > 0;
  const label = powered ? `BATTERY ${Math.ceil(player.powerTimer)}s` : '';
  if (heroPower.textContent !== label) heroPower.textContent = label;
  heroPower.hidden = !powered;
  heroHeadPosition.set(player.x, HERO_HEIGHT + 0.5, player.z).project(camera);
  const onScreen = playing && heroHeadPosition.z < 1;
  heroHud.hidden = !onScreen;
  if (!onScreen) return;
  const shell = heroHud.offsetParent.getBoundingClientRect();
  const rect = canvas.getBoundingClientRect();
  const x = rect.left - shell.left + (heroHeadPosition.x * 0.5 + 0.5) * rect.width;
  const y = rect.top - shell.top + (-heroHeadPosition.y * 0.5 + 0.5) * rect.height;
  heroHud.style.transform = `translate(${x - 32}px, ${y}px)`;
}

function collectBattery() {
  player.powerTimer += POWER_TIME;
  showToast('BATTERY POWER!');
  blip(880, .15);
}

function updateSpread(dt, firing) {
  const powered = player.powerTimer > 0;
  if (powered !== spreadOn) {
    spreadOn = powered;
    for (const s of [stream, ...sideStreams]) s.setTint(powered ? POWER_COLOR : STREAM_COLOR, powered ? POWER_COLOR : undefined);
    if (!powered) for (const side of sideStreams) side.clear();
  }
  if (!powered) return;
  sideStreams.forEach((side, i) => {
    const angle = (i ? 1 : -1) * SPREAD_ANGLE;
    const c = Math.cos(angle), s = Math.sin(angle);
    spreadFacing.dx = player.dx * c - player.dz * s;
    spreadFacing.dz = player.dx * s + player.dz * c;
    side.update(dt, firing, player.rig.emitter, spreadFacing, enemies);
  });
}

function collectMedkit(amount) {
  player.hp = Math.min(player.maxHp, player.hp + amount);
  updateHealth();
  showToast(`HEALTH +${amount}`);
  blip(740, .12);
}

function placePlayerAtSpawn() {
  player.x = world.spawn.x;
  player.z = world.spawn.z;
  player.heading = world.spawn.heading ?? Math.PI;
  player.dx = Math.sin(player.heading);
  player.dz = Math.cos(player.heading);
  player.targetHeading = player.heading;
  player.moveX = player.dx;
  player.moveZ = player.dz;
  player.moveSpeed = 0;
  player.turnSpeed = 0;
  player.runTime = 0;
  player.runBlend = 0;
  player.fireTimer = 0;
  player.root.rotation.y = player.heading;
  player.root.position.set(player.x, 0, player.z);
  player.body.position.set(0, 0, 0);
  player.body.rotation.set(0, 0, 0);
  cameraRig.frame(player.x, player.z, 0, true);
  animateHero(player.rig, 0, 0);
}

function startGame() {
  if (!player.model) return;
  mouseCaptureFailed = false;
  score = 0;
  player.hp = player.maxHp;
  player.invulnerable = 0;
  player.model.material.opacity = 1;
  player.model.material.transparent = false;
  scoreLabel.textContent = '0000';
  updateHealth();
  waves.start();
  playing = true;
  rangeHud.hidden = false;
  touchControls.setEnabled(true);
  startScreen.classList.add('hidden');
  endScreen.classList.add('hidden');
  keys.clear();
  canvas.focus({ preventScroll: true });
  syncMouseAim();
}

function clearArena() {
  resetInput();
  stream.clear();
  biteEffects.clear();
  medkits.clear();
  player.tapTimer = 0;
  player.powerTimer = 0;
  for (const side of sideStreams) side.clear();
  batteries.clear();
  for (const enemy of enemies) disposeEnemy(enemy);
  for (const effect of effects) {
    scene.remove(effect.object);
    effect.object.geometry.dispose();
    effect.object.material.dispose();
  }
  enemies.length = 0;
  effects.length = 0;
}

function endGame() {
  playing = false;
  syncMouseAim();
  resetAimAssist();
  rangeHud.hidden = true;
  touchControls.setEnabled(false);
  stream.clear();
  player.tapTimer = 0;
  player.moveSpeed = 0;
  player.turnSpeed = 0;
  endScreen.classList.remove('hidden');
  blip(80, 0.25);
  keys.clear();
}

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  cameraRig.resize(width, height, window.matchMedia('(pointer: coarse)').matches);
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, frameTime ? (now - frameTime) / 1000 : 0);
  frameTime = now;
  update(dt);
  if (player.model) world.updateVisibility(camera, player.root, HERO_HEIGHT, dt);
  renderer.render(scene, camera);
  updateHeroHp();
}

function beginSpray() {
  player.tapTimer = 0.075;
  stream.resetPressure();
}

function resetInput() {
  resetAimAssist();
  mouseAim.resetAim();
  keys.clear();
  touchControls.reset();
  player.tapTimer = 0;
  player.moveSpeed = 0;
  player.turnSpeed = 0;
  player.targetHeading = player.heading;
  player.moveX = Math.sin(player.heading);
  player.moveZ = Math.cos(player.heading);
}

function syncControlMode() {
  const direct = usingTouchControls || controlMode === 'direct';
  for (const radio of document.querySelectorAll('[data-control-mode]')) radio.checked = radio.value === controlMode;
  for (const checkbox of document.querySelectorAll('[data-aim-assist]')) {
    checkbox.checked = aimAssistEnabled;
    checkbox.disabled = !direct;
  }
  for (const checkbox of document.querySelectorAll('[data-mouse-aim]')) {
    checkbox.closest('label').hidden = !mouseSupported;
    checkbox.checked = mouseAimEnabled;
    checkbox.disabled = false;
  }
  syncMouseAim();
}

for (const checkbox of document.querySelectorAll('[data-mouse-aim]')) {
  checkbox.addEventListener('change', () => {
    mouseAimEnabled = checkbox.checked;
    mouseCaptureFailed = false;
    try { localStorage.setItem('golden-blast-mouse-aim', String(mouseAimEnabled)); } catch { /* Storage is optional. */ }
    resetInput();
    syncControlMode();
  });
}

for (const checkbox of document.querySelectorAll('[data-aim-assist]')) {
  checkbox.addEventListener('change', () => {
    aimAssistEnabled = checkbox.checked;
    try { localStorage.setItem('golden-blast-aim-assist', String(aimAssistEnabled)); } catch { /* Storage is optional. */ }
    resetInput();
    syncControlMode();
  });
}

for (const radio of document.querySelectorAll('[data-control-mode]')) {
  radio.addEventListener('change', () => {
    if (!radio.checked) return;
    controlMode = radio.value === 'tank' ? 'tank' : 'direct';
    try { localStorage.setItem('golden-blast-controls', controlMode); } catch { /* Storage is optional. */ }
    resetInput();
    syncControlMode();
  });
}
function openSettings() {
  resetInput();
  settingsDone.textContent = playing ? 'RESUME' : 'DONE';
  if (!controlsDialog.open) controlsDialog.showModal();
  syncMouseAim();
}
settingsButton.addEventListener('click', openSettings);
controlsDialog.addEventListener('close', () => {
  resetInput();
  (playing ? canvas : settingsButton).focus({ preventScroll: true });
  syncMouseAim();
});
controlsDialog.querySelector('form').addEventListener('submit', event => {
  event.preventDefault();
  controlsDialog.close();
  resetInput();
  if (playing) {
    canvas.focus({ preventScroll: true });
    requestMouseAim();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && playing) {
    event.preventDefault();
    if (performance.now() - lastMouseUnlock < 200) return;
    if (!event.repeat) {
      if (controlsDialog.open) controlsDialog.close();
      else openSettings();
    }
    return;
  }
  if (controlsDialog.open) return;
  if (!mouseAim.locked && event.target instanceof Element && event.target.closest('select, input')) return;
  if (!playing && event.target instanceof Element && event.target.closest('button, a')) return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  if (usingTouchControls && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
    usingTouchControls = false;
    syncControlMode();
  }
  keys.add(event.code);
  if (event.code === 'Space' && !event.repeat && playing) beginSpray();
  if (event.code === 'Enter' && !playing && !startScreen.classList.contains('hidden') && player.model) { startGame(); requestMouseAim(); }
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => { resetInput(); if (mouseAim.locked && playing) openSettings(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { resetInput(); if (mouseAim.locked && playing) openSettings(); }
});
window.addEventListener('resize', resize);
bindGameInput({
  canvas,
  movementZone: document.querySelector('#joystick-zone'),
  movementHandle: document.querySelector('.joystick-hint'),
  canInteract: () => playing && !controlsDialog.open,
  setFiring: firing => firing ? keys.add('Fire') : keys.delete('Fire'),
  beginSpray,
  requestMouseAim,
});
startButton.addEventListener('click', () => { startGame(); requestMouseAim(); });
restartButton.addEventListener('click', () => { startGame(); requestMouseAim(); });
soundSetting.checked = soundEnabled;
soundSetting.addEventListener('change', () => {
  soundEnabled = soundSetting.checked;
  try { localStorage.setItem('golden-blast-sound', String(soundEnabled)); } catch { /* Storage is optional. */ }
  if (soundEnabled) blip(520, 0.05);
});

syncControlMode();
resize();
loadModels();
requestAnimationFrame(animate);

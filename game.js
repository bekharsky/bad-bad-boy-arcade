import * as THREE from 'three';
import { createHero, animateHero, animateSkating, HERO_BASE_HEIGHT } from './hero.js';
import { loadHero } from './models/hero-loader.js';
import { maps, mapOrder } from './maps/index.js';
import { createArenaCombat } from './arena-combat.js';
import { createArenaCameos } from './arena-cameos.js';
import { createFrameClock } from './world/frame-clock.js';
import { prepareScene } from './world/render-preparation.js';
import { createMapManager } from './world/map-manager.js';
import { createGameCamera } from './world/game-camera.js';
import { chooseWeather, createWeather } from './world/weather.js';
import { createMapTransition } from './world/map-transition.js';
import { createTransitionRenderer } from './world/transition-renderer.js';
import { createSleighParts } from './models/sleigh.js';
import { createSleighAssembly } from './sleigh-assembly.js';
import { createSleighIntro } from './sleigh-intro.js';
import { createSleighCache, sleighGuardPosts } from './sleigh-search.js';
import { createArenaBoosts } from './arena-boosts.js';
import { loadEnemyModels, createEnemy, animateEnemy, disposeEnemy } from './enemies.js';
import { createSpraySystem } from './spray-system.js';
import { createBiteEffects } from './bites.js';
import { createBurstEffects } from './burst-effects.js';
import { createMedkits } from './medkits.js';
import { createTouchControls } from './touch-controls.js';
import { movePlayer } from './movement.js';
import { createMouseAim } from './mouse-aim.js';
import { bindGameInput } from './game-input.js';
import { preventGameZoom } from './gesture-guard.js';
import { bindRunnerInput } from './runner/runner-input.js';
import { createRunnerSession } from './runner/session.js';
import { createRunnerFinishReward } from './runner/finish-reward.js';
import { CAMEO_KINDS, isCameo } from './runner/cameo-roster.js';
import { createSeagulls } from './seagulls.js';
import { aimingUp, createSprayAim } from './spray-aim.js';
import { createSprayTutorial } from './spray-tutorial.js';
import { createLeaderboard } from './leaderboard.js';
import { calculateDistrictScore, districtPaceSeconds } from './campaign-score.js';
import { mountHolidayScreens } from './screen-ui.js';

// World metres; the hero keeps the same physical size across every map.
const HERO_HEIGHT = 3.45;
const HERO_SCALE = HERO_HEIGHT / HERO_BASE_HEIGHT;
const TURN_KEYS = ['ArrowLeft', 'ArrowRight'];
const RUNNER_DODGE_KEYS = [...TURN_KEYS, 'KeyA', 'KeyD'];
const MOVE_KEYS = [...RUNNER_DODGE_KEYS, 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'];
const keys = new Set();
const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
let usingTouchControls = coarsePointer;
let soundEnabled = false;
try {
  soundEnabled = localStorage.getItem('golden-blast-sound') === 'true';
} catch { /* Settings still work when browser storage is unavailable. */ }

const canvas = document.querySelector('#game');
mountHolidayScreens(document);
const gameShell = document.querySelector('.game-shell');
preventGameZoom(document);
const status = document.querySelector('#load-status');
const startScreen = document.querySelector('#start-screen');
const endScreen = document.querySelector('#end-screen');
const startButton = document.querySelector('#start');
const restartButton = document.querySelector('#restart');
const leaderboard = createLeaderboard({
  nameInput: document.querySelector('#player-name'),
  list: document.querySelector('#end-leaderboard-list'),
  listStatus: document.querySelector('#end-leaderboard-status'),
  submitStatus: document.querySelector('#score-submit-status'),
  retryButton: document.querySelector('#retry-score'),
});
const heroHud = document.querySelector('#hero-hud');
const boostHud = ['battery', 'skates'].map(kind => {
  const icon = document.querySelector(`#${kind}-boost`);
  return { icon, ring: icon.querySelector('.boost-time'), percent: 0 };
});
const heroHeadPosition = new THREE.Vector3();
const scoreLabel = document.querySelector('#score');
const levelDial = document.querySelector('#level-dial');
const levelProgressArc = document.querySelector('#level-progress-arc');
const healthProgressArc = document.querySelector('#health-progress-arc');
const sleighProgress = document.querySelector('#sleigh-progress');
const sleighSegments = document.querySelector('#sleigh-segments');
const sleighFill = document.querySelector('#sleigh-fill');
const introOverlay = document.querySelector('#sleigh-intro');
const skipIntro = document.querySelector('#skip-intro');
const missionScreen = document.querySelector('#mission-screen');
const beginSearch = document.querySelector('#begin-search');
const passerbyCard = document.querySelector('.passerby');
const cameoSpeechTemplate = document.querySelector('#cameo-speech');
const cameoSpeeches = new Map();
const cameoSpeechPoint = new THREE.Vector3();
const CAMEO_LINES = [
  'We’re deeply concerned',
  'We’re monitoring the situation',
  'We take this very seriously',
  'We call for restraint',
  'All options are on the table',
  'We remain committed to dialogue',
  'We’ll review the matter in due course',
  'We’ll consider the appropriate steps',
];
let shownCameo = null;
let nextLine = 0;
const toast = document.querySelector('#toast');
const encounterHint = document.querySelector('#encounter-hint');
const sprayTutorial = createSprayTutorial(encounterHint);
const sprayButton = document.querySelector('#mobile-fire');
const sprayZone = document.querySelector('#spray-zone');
const pauseDialog = document.querySelector('#pause-dialog');
const startOver = document.querySelector('#start-over');
const soundButtons = document.querySelectorAll('[data-toggle-sound]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const query = new URLSearchParams(window.location.search);
const debugMaps = query.get('debug') === 'maps';
const mouseSupported = window.matchMedia('(any-pointer: fine)').matches;
const aimRay = new THREE.Raycaster();
const aimScreen = new THREE.Vector2();
const aimPoint = new THREE.Vector3();
const aimOffset = new THREE.Vector3();
const reticlePoint = new THREE.Vector3();
const reticleOrigin = new THREE.Vector3();
const reticlePosition = { x: 0, y: 0 };
const mouseReticle = document.querySelector('#mouse-reticle');
const reticleInset = mouseReticle.width.baseVal.value + 4;
let reticleCharge = 0;
const aimGround = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const aimTargetBounds = new THREE.Sphere();
const aimTargetHit = new THREE.Vector3();
const enemyPoint = new THREE.Vector3();
const enemyScreen = new THREE.Vector3();
const mouseAim = createMouseAim({ canvas, onAim: updateMouseAim, projectAim: projectMouseAim });
const touchControls = createTouchControls({
  zone: document.querySelector('#joystick-zone'),
  stick: document.querySelector('#joystick'),
  thumb: document.querySelector('#joystick-thumb'),
  home: document.querySelector('.joystick-hint'),
  fireZone: sprayZone,
  fireButton: sprayButton,
  fireHome: document.querySelector('#spray-home'),
  getAimHeading: previous => usingTouchControls ? previous ?? player.heading : player.heading,
  onRunnerDodge(direction) {
    if (!playing || !isRunner() || pauseDialog.open || gameInterlude()) return false;
    runnerSession.dodge(direction);
    return true;
  },
  onFireCancel() {
    player.tapTimer = 0;
    player.upwardTap = false;
    player.touchTapHeading = null;
  },
  onFireStart: (airborne, heading, fresh) => beginSpray(false, airborne, heading, fresh),
  onInput() {
    canvas.focus({ preventScroll: true });
    if (!usingTouchControls) { usingTouchControls = true; syncMouseAim(); }
  }
});

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.debug.checkShaderErrors = import.meta.env.DEV;
// High-density touch screens need fewer shaded pixels and a smaller shadow
// atlas; desktop keeps the full detail tier.
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#7c929f');
scene.fog = new THREE.Fog('#7c929f', 40, 100);
let itinerary = mapOrder(query.get('map'));
const world = createMapManager(scene, maps, .32 * HERO_SCALE);
const showSenatePreview = !query.has('map');
world.activate(showSenatePreview ? 'senate-square' : itinerary[0].id);
const sleighParts = createSleighParts();
if (sleighParts.length !== maps.length) throw new Error('Each district needs one sleigh part');
const sleighCache = createSleighCache(scene, world, sleighParts);
const runnerReward = createRunnerFinishReward(scene, sleighParts);
const sleighAssembly = createSleighAssembly(sleighParts, document.querySelector('#sleigh-assembly'));
sleighSegments.replaceChildren(...sleighParts.map((_, index) => {
  const segment = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  for (const [attribute, value] of Object.entries({ cx: 46, cy: 46, r: 41, pathLength: 100,
    'stroke-dasharray': `${100 / sleighParts.length - 3.6} 100`, transform: `rotate(${-84 + 360 * index / sleighParts.length} 46 46)`,
  })) segment.setAttribute(attribute, value);
  return segment;
}));

const cameraRig = createGameCamera();
const { camera } = cameraRig;
cameraRig.frame(world.spawn.x, world.spawn.z, 0, true);

const skyLight = new THREE.HemisphereLight();
scene.add(skyLight);
const keyLight = new THREE.DirectionalLight(0xffdfad, 2.6);
keyLight.position.set(-12, 25, 10);
keyLight.castShadow = true;
const shadowSize = coarsePointer ? 1024 : 2048;
keyLight.shadow.mapSize.set(shadowSize, shadowSize);
keyLight.shadow.camera.left = -38;
keyLight.shadow.camera.right = 38;
keyLight.shadow.camera.top = 38;
keyLight.shadow.camera.bottom = -38;
keyLight.shadow.normalBias = 0.035;
keyLight.shadow.intensity = .85;
keyLight.shadow.camera.far = 100;
scene.add(keyLight);
const weather = createWeather(scene, skyLight, keyLight, { compact: coarsePointer || reducedMotion.matches });
const previewWeather = query.get('weather');
function setDistrictWeather() {
  const kind = ['clear', 'rain', 'snow'].includes(previewWeather) ? previewWeather : chooseWeather(Math.random());
  weather.enter(kind, world.root);
}
setDistrictWeather();
let firstRound = true;

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
  skateTimer: 0,
  skateBlend: 0,
  fireTimer: 0,
  tapTimer: 0,
  mouseTap: false,
  upwardTap: false,
  touchTapHeading: null,
  runTime: 0,
  runBlend: 0,
  runAngle: 0,
};
player.root.add(player.body);
player.root.position.set(player.x, 0, player.z);
scene.add(player.root);

function hitEnemy(enemy, direction, impact) {
  if (enemy.kind === 'gull') { seagulls.repel(enemy); return; }
  if (enemy.civilian) { arenaCameos.splash(enemy, direction); return; }
  if (isRunner()) {
    if (runnerSession.sprayHit(enemy.id, impact)) {
      burst(enemy.x, enemy.hitHeight, enemy.z, 0xffd34e, 20, null, 3);
      blip(440 + Math.random() * 280, .045);
    }
    return;
  }
  enemy.hp -= impact.damage;
  enemy.hit = 0.18;
  world.move(enemy, direction.x * impact.knockback, direction.z * impact.knockback, enemy.size);
  enemy.root.position.set(enemy.x, 0, enemy.z);
  if (enemy.hp <= 0) removeEnemy(enemy, true);
}
// The glossy, translucent jet can draw directly over the city in one pass.
const streamOptions = { scale: HERO_HEIGHT / 2.25, refraction: false, getHitTime: () => gameTime };
const stream = createSpraySystem(scene, world, hitEnemy, streamOptions);

const enemies = [];
const arenaCameos = createArenaCameos(scene, world);
const arenaCombat = createArenaCombat({
  world, player, enemies, animateEnemy,
  onBite(enemy) {
    recordHealthLost(1); showBite(enemy); blip(115, .12);
    if (player.hp <= 0) { endGame(); return false; }
    return true;
  },
});
const effects = createBurstEffects(scene);
const biteEffects = createBiteEffects(scene);
const medkits = createMedkits(scene, world);
const arenaBoosts = createArenaBoosts(scene, world);
const sprayAim = createSprayAim();
const sprayTargets = [];
const seagulls = createSeagulls(scene, world, {
  onRepel(bird) { burst(bird.x, bird.hitHeight, bird.z, '#f4f1df', 8); blip(620, .05); },
  onImpact(impact) {
    if (impact.type === 'drop' || impact.hit) burst(impact.x, impact.y, impact.z, impact.type === 'drop' ? '#eee9cf' : '#e85e55', 12, null, 2);
    if (!impact.hit || player.invulnerable > 0 || !playing) return;
    player.hp = Math.max(0, player.hp - 1); player.invulnerable = .9;
    if (isRunner()) runnerSession.state.invulnerable = Math.max(runnerSession.state.invulnerable, .9);
    recordHealthLost(1); blip(105, .12);
    if (player.hp === 0) endGame();
  },
});
// Battery cans are hidden in back courtyards. Exploration powers up the spray.
const POWER_TIME = 8;
const SKATE_TIME = 8;
const SKATE_SPEED_MULTIPLIER = 1.35;
let playing = false;
let gameTime = 0;
let score = 0;
let bankedScore = 0;
let searchTime = 0;
let geeseDefeated = 0;
let healthLost = 0;
let levelProgress = 0;
let levelIndex = 0;
let foundParts = 0;
let intro = null;
let introSeen = false;
const FINISH_HOLD = .85;
const CRASH_HOLD = .45;
let runnerArrival = 0;
let runnerCrash = 0;
let audioContext = null;
let renderingReady = false;
let preparedDistrict = null;
const frameClock = createFrameClock();
const isRunner = () => world.mode === 'runner';
const runnerSession = createRunnerSession({
  world, player, cameraRig, seagulls, medkits, touchControls, keys,
  heroHeight: HERO_HEIGHT, heroScale: HERO_SCALE,
  isPlaying: () => playing,
  onImpact({ x, z }, fatal) {
    burst(x, HERO_HEIGHT * (fatal ? .32 : .42), z, 0xff343e, fatal ? 42 : 22, null, fatal ? 2.7 : 1.8);
  },
  onCrash() {
    runnerCrash = CRASH_HOLD;
    resetInput();
    stream.clear();
    touchControls.setEnabled(false);
  },
  onDamage(hits) {
    const lost = Math.min(player.hp, hits);
    player.hp -= lost;
    recordHealthLost(lost); blip(110, .12);
    if (player.hp === 0) { endGame(); return false; }
    return true;
  },
  onSpray(dt, firing, traffic) { updateSprayFeedback(updateSpray(dt, firing, traffic)); },
  onCollect: collectMedkit,
  onProgress(fraction, traffic) {
    setLevelProgress(fraction);
    updateScore();
    const { distance, elapsed, crossings } = runnerSession.state;
    runnerReward.update(distance, elapsed, reducedMotion.matches);
    const crossingWarning = crossings.some(crossing => crossing.phase === 'warning' || crossing.phase === 'crossing');
    const passerby = traffic.find(agent => isCameo(agent.kind) && agent.age >= .3 && !agent.passed && agent.panicSide === undefined);
    showCameo(crossingWarning ? null : passerby);
  },
  onFinish() {
    runnerArrival = FINISH_HOLD;
    resetInput();
    stream.clear();
    touchControls.setEnabled(false);
  },
});
const runnerInput = bindRunnerInput({
  canvas,
  canInteract: () => playing && isRunner() && !pauseDialog.open && !gameInterlude(),
  dodge: direction => runnerSession.dodge(direction),
});

const transitionRenderer = createTransitionRenderer(renderer);
const mapTransition = createMapTransition({ onSwap: enterDistrict, onFinish: finishMapTransition });

function gameInterlude() { return intro !== null || mapTransition.active || sleighAssembly.active || runnerArrival > 0 || runnerCrash > 0; }

function finishMapTransition() {
  gameShell.classList.remove('map-changing');
  resetInput();
  touchControls.setEnabled(playing);
  syncMouseAim();
}

function transitionToDistrict(index) {
  if (!mapTransition.start({ index }, reducedMotion.matches ? .5 : 1.2)) return;
  gameShell.classList.add('map-changing');
  touchControls.setEnabled(false);
  syncMouseAim();
}

async function prepareGraphics(root = scene) {
  renderingReady = false;
  startOver.disabled = true;
  try {
    await prepareScene(renderer, scene, camera, () => {
      if (mapTransition.active) transitionRenderer.render(scene, camera, mapTransition.progress, reducedMotion.matches);
      else renderer.render(scene, camera);
    }, { root, fadeMaterials: [player.model.material] });
  } finally {
    frameClock.reset();
    startOver.disabled = false;
  }
  renderingReady = true;
}

function showCameo(actor) {
  const kind = actor?.kind ?? null;
  if (kind === shownCameo) return;
  shownCameo = kind;
  passerbyCard.hidden = !kind;
  if (kind) {
    // The portrait strip follows the roster, one square frame per model.
    passerbyCard.style.setProperty('--portrait-x', `${CAMEO_KINDS.indexOf(kind) * 100 / (CAMEO_KINDS.length - 1)}%`);
  }
}

function updateCameoSpeech() {
  if (!playing || pauseDialog.open || gameInterlude()) {
    for (const { bubble } of cameoSpeeches.values()) bubble.hidden = true;
    return;
  }
  const runner = isRunner();
  const runnerGuest = runner && runnerSession.state.traffic.find(actor =>
    isCameo(actor.kind) && actor.alive && !actor.passed && actor.z >= -30
      && actor.stumbleTime === undefined && actor.panicSide === undefined);
  const inEncounter = actor => actor.approaches > 0
    && (actor.phase === 'approach' || actor.phase === 'watch' || actor.phase === 'retreat');

  for (const [actor, speech] of cameoSpeeches) {
    if (!actor.alive || (runner ? actor !== runnerGuest : actor.approaches === 0)) {
      speech.bubble.remove();
      cameoSpeeches.delete(actor);
    }
  }
  const candidates = runner ? (runnerGuest ? [runnerGuest] : []) : arenaCameos.actors;
  for (const actor of candidates) {
    const previous = cameoSpeeches.get(actor);
    if (previous && previous.approach === actor.approaches) continue;
    if (!runner && (!inEncounter(actor) || actor.fleeing || gameTime < actor.nextSpeechAt)) continue;
    previous?.bubble.remove();
    const bubble = cameoSpeechTemplate.content.firstElementChild.cloneNode(true);
    const line = CAMEO_LINES[nextLine];
    nextLine = (nextLine + 1) % CAMEO_LINES.length;
    bubble.dataset.line = line;
    bubble.setAttribute('aria-label', line);
    cameoSpeechTemplate.before(bubble);
    cameoSpeeches.set(actor, { bubble, line, approach: actor.approaches, start: null, letters: 0 });
  }
  if (!cameoSpeeches.size) return;
  const w = viewWidth, h = viewHeight;
  for (const [actor, speech] of cameoSpeeches) {
    const { bubble, line } = speech;
    const canFinishLine = speech.start !== null && actor.phase === 'lookout';
    if ((!runner && (actor.fleeing || (!inEncounter(actor) && !canFinishLine)))
      || (speech.start !== null && gameTime - speech.start >= 4)) {
      bubble.hidden = true;
      continue;
    }
    cameoSpeechPoint.set(actor.x, 3.3, actor.z);
    if (!runner && !world.lineClear3D(camera.position, cameoSpeechPoint, .05, { allowOutsideOrigin: true })) {
      bubble.hidden = true;
      continue;
    }
    cameoSpeechPoint.project(camera);
    const { x, y, z } = cameoSpeechPoint;
    if (Math.abs(x) >= 1 || Math.abs(y) >= 1 || Math.abs(z) >= 1) { bubble.hidden = true; continue; }

    // Off-screen time shouldn't use up a line before the player sees it.
    if (speech.start === null) {
      speech.start = gameTime;
      if (!runner) actor.nextSpeechAt = gameTime + 6 + 2 * CAMEO_KINDS.indexOf(actor.kind) / (CAMEO_KINDS.length - 1);
    }
    const letters = reducedMotion.matches ? line.length : Math.min(line.length, 1 + Math.floor((gameTime - speech.start) * 24));
    if (letters !== speech.letters) {
      speech.letters = letters;
      const text = bubble.firstElementChild;
      text.textContent = line.slice(0, letters);
      text.dataset.rest = line.slice(letters);
    }
    bubble.hidden = false;
    // The hidden full line sets the size independently of the typing.
    if (speech.viewWidth !== w) {
      speech.viewWidth = w;
      speech.halfWidth = bubble.getBoundingClientRect().width / 2;
    }
    const screenX = (x + 1) * w / 2, screenY = (1 - y) * h / 2;
    const inset = speech.halfWidth + 8;
    const bubbleX = THREE.MathUtils.clamp(screenX, inset, w - inset);
    bubble.style.transform = `translate3d(${bubbleX}px, ${screenY - 10}px, 0) translate(-50%, -100%)`;
    bubble.style.setProperty('--speech-tail-x', `${screenX - bubbleX}px`);
  }
}

function syncLevelUI() {
  const runner = isRunner();
  showCameo(null);
  for (const { bubble } of cameoSpeeches.values()) bubble.remove();
  cameoSpeeches.clear();
  toast.hidden = runner;
  gameShell.classList.toggle('runner-mode', runner);
  document.querySelector('#joystick-zone').setAttribute('aria-label', runner ? 'Left/right to dodge; up to accelerate, down to brake' : 'Drag to move');
}

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
        if (!renderingReady) return;
        itinerary = mapOrder(map.id);
        if (pauseDialog.open) pauseDialog.close();
        startGame();
      });
      picker.append(button);
    }
  }
}

async function loadModels() {
  try {
    status.textContent = 'Loading the hero and barnacle geese…';
    loadEnemyModels();
    const gltf = await loadHero(message => { status.textContent = message; });
    player.rig = createHero(gltf.scene);
    player.model = player.rig.mesh;
    player.model.scale.setScalar(HERO_SCALE);
    player.body.add(player.model);
    placePlayerAtSpawn(showSenatePreview);
    frameMenuPreview();
    // These hidden representatives retain enemy programs across districts,
    // including runs that start on a track without any arena enemies.
    const enemyPrograms = new THREE.Group();
    enemyPrograms.name = 'Prepared enemy programs';
    enemyPrograms.visible = false;
    enemyPrograms.add(createEnemy('goose', 1).root);
    scene.add(enemyPrograms);
    status.textContent = 'Preparing the graphics…';
    await sleighAssembly.prepare(renderer);
    await prepareGraphics();
    // Keep one district ready ahead of the first pickup, while the loading
    // screen is still up. Leave the preview scene in place until Play.
    try {
      const next = world.prepare(itinerary[1].id);
      weather.prepareSurfaces(next);
      await prepareScene(renderer, scene, camera, () => {}, { root: next });
      preparedDistrict = next;
    } catch (error) {
      console.warn('Could not prepare the next district:', error);
    }
    status.classList.add('hidden');
    startButton.disabled = false;
    startButton.textContent = 'PLAY';
    for (const button of document.querySelectorAll('[data-debug-map]')) button.disabled = false;
    const initialButton = debugMaps ? startScreen.querySelector('[data-debug-map]') : startButton;
    if (!pauseDialog.open && [document.body, canvas].includes(document.activeElement)) initialButton.focus({ preventScroll: true });
    window.dispatchEvent(new Event('game:ready'));
  } catch (error) {
    console.error('Could not load game models:', error);
    status.textContent = 'Could not load the models. Check the connection, then refresh the page.';
    window.dispatchEvent(new CustomEvent('game:load-error', { detail: error }));
  }
}

function makeEnemy(x, z, level, guardPost = null) {
  const enemy = createEnemy('goose', level);
  enemy.onTramHit = removeEnemyByTram;
  enemy.guardPost = guardPost;
  enemy.x = x;
  enemy.z = z;
  enemy.root.position.set(x, 0, z);
  scene.add(enemy.root);
  enemies.push(enemy);
  return enemy;
}

function removeEnemyByTram(enemy) {
  removeEnemy(enemy, true);
}

function spawnEnemies(around, count, level, { minPlayerDistance = 0, ringStart = 7 } = {}) {
  for (let i = 0; i < count; i++) {
    const point = world.spawnPoint(around, i, count, ringStart);
    if (!point || Math.hypot(point.x - player.x, point.z - player.z) < minPlayerDistance) continue;
    if (enemies.every(enemy => Math.hypot(enemy.x - point.x, enemy.z - point.z) > 1.25)) {
      makeEnemy(point.x, point.z, level);
    }
  }
}

function collectSleighPart() {
  if (!playing || gameInterlude() || foundParts !== levelIndex) return;
  const award = currentDistrictScore(true);
  bankedScore += award.total;
  foundParts++;
  updateSleighProgress();
  updateScore();
  setLevelProgress(1);
  sprayTutorial.reset();
  sleighAssembly.start(levelIndex, reducedMotion.matches, award);
  gameShell.classList.add('sleigh-assembling');
  resetInput();
  stream.clear();
  syncMouseAim();
  touchControls.setEnabled(false);
  blip(880, .16);
}

function finishSleighAssembly() {
  gameShell.classList.remove('sleigh-assembling');
  if (foundParts === itinerary.length) { endGame(true); return; }
  transitionToDistrict(levelIndex + 1);
}

function enterDistrict({ index }) {
  const district = itinerary[index];
  const openingHarbor = index === 0 && district.id === 'harbor';
  const changedMap = world.activate(district.id);
  levelIndex = index;
  searchTime = geeseDefeated = healthLost = 0;
  setLevelProgress(0);
  if (changedMap || !firstRound) setDistrictWeather();
  firstRound = false;
  // Keep score and parts while resetting health, attacks, and map navigation.
  clearArena();
  player.hp = player.maxHp; player.invulnerable = 0;
  player.model.material.opacity = 1; player.model.material.transparent = false;
  updateHealth();
  world.reset();
  placePlayerAtSpawn();
  sprayTutorial.reset(openingHarbor);
  arenaCameos.reset();
  seagulls.reset(player, isRunner(), { attackDelay: openingHarbor ? 6 : 0 });
  medkits.reset(player);
  syncLevelUI();
  if (isRunner()) {
    runnerReward.place(index, world.runner.length);
    runnerSession.start(world.runner);
  } else {
    arenaBoosts.reset(player);
    const [cache] = world.pickupPoints('sleigh', .85);
    if (!cache) throw new Error(`Missing reachable sleigh part in ${district.id}`);
    sleighCache.place(cache, index);
    const strength = itinerary.slice(0, index + 1).filter(map => map.mode !== 'runner').length;
    const posts = sleighGuardPosts(world, cache);
    for (const post of openingHarbor ? posts.slice(0, 6) : posts) makeEnemy(post.x, post.z, strength, post);
    if (openingHarbor) {
      const harborPosts = [
        [0, 4.5, 6], [6, 8, 6.5], [16, 11, 7], // Plaza and eastbound route
        [-20, 10.3, 6.5], // Behind Verkkopaukka
        [-5.5, 26.5, 6.5], // Behind the southern apartment building
        [-22, -24, 6.5], // Behind the west warehouse
        [18.5, 22.5, 6.5], // Behind Cafe Helmi
        [6, 15, 6], // South of the plaza
        [14.5, -24, 6.5], // By the terminal
      ];
      for (const [x, z, range] of harborPosts) {
        const post = world.pickupPoint({ x, z }, .65);
        if (!post) continue;
        const goose = makeEnemy(post.x, post.z, strength, post);
        goose.guardRange = range;
        if (x === 0) {
          goose.hp = 1;
          goose.speed *= .8;
        }
      }
    } else {
      const openingArena = strength === 1;
      const openingRing = openingArena ? 7.5 : 5.5;
      spawnEnemies(player, openingArena ? 4 : 5 + strength, strength, { minPlayerDistance: openingRing, ringStart: openingRing });
      spawnEnemies(cache, openingArena ? 3 : 6, strength, { minPlayerDistance: openingArena ? 11 : 8 });
    }
  }
  if (changedMap && world.root === preparedDistrict) preparedDistrict = null;
  else if (changedMap && renderingReady) {
    prepareGraphics(world.root).catch(error => {
      console.warn('Could not prepare district graphics:', error);
      renderingReady = true;
    });
  }
}

function removeEnemy(enemy, pop = false) {
  if (!enemy.alive) return;
  enemy.alive = false;
  disposeEnemy(enemy);
  if (pop) {
    geeseDefeated++;
    updateScore();
    burst(enemy.x, enemy.hitHeight, enemy.z, 0xffd34e, 10);
    blip(440 + Math.random() * 280, 0.045);
  }
}

function burst(x, y, z, color, count = 8, forward = null, scale = 1) {
  effects.burst(x, y, z, color, count, forward, scale);
}

function showBite(enemy) {
  const attacker = enemy.goose.beak.getWorldPosition(new THREE.Vector3());
  const contact = new THREE.Vector3();
  let nearest = Infinity;
  // Use the nearest animated leg segment, including nips above the shin.
  for (const leg of player.rig.legs) {
    const ankle = leg.ankle.getWorldPosition(new THREE.Vector3());
    const knee = leg.knee.getWorldPosition(new THREE.Vector3());
    const joints = [ankle, knee, leg.hip.getWorldPosition(new THREE.Vector3())];
    for (let i = 1; i < joints.length; i++) {
      const start = joints[i - 1], end = joints[i], segment = end.clone().sub(start);
      const lengthSq = segment.lengthSq();
      const t = lengthSq ? THREE.MathUtils.clamp(attacker.clone().sub(start).dot(segment) / lengthSq, 0, 1) : 0;
      const point = start.clone().addScaledVector(segment, t);
      const distance = point.distanceToSquared(attacker);
      if (distance < nearest) { nearest = distance; contact.copy(point); }
    }
  }
  const outward = new THREE.Vector3(attacker.x - contact.x, 0, attacker.z - contact.z);
  if (outward.lengthSq() < .0001) outward.set(-player.dx, 0, -player.dz);
  outward.normalize();
  contact.addScaledVector(outward, .055 * HERO_SCALE);
  biteEffects.burst(contact, outward, HERO_SCALE);
}

function showToast(message) {
  if (isRunner()) return;
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
  const mouseFiring = isMouseFiring();
  const heading = mouseAim.aiming && (mouseFiring || mouseAim.following) ? Math.atan2(aimOffset.x, aimOffset.z) : null;
  return movePlayer(player, world, {
    keys, touch: touchControls.input, dt, firing, height: HERO_HEIGHT,
    speedMultiplier: player.skateTimer > 0 ? SKATE_SPEED_MULTIPLIER : 1,
    cursorHeading: heading,
    shotHeading: mouseFiring ? heading : null,
    touchHeading: (usingTouchControls ? touchControls.aimHeading : null)
      ?? (player.tapTimer > 0 ? player.touchTapHeading : null),
    steerWithMouse: mouseAim.following,
  });
}

function isMouseFiring() {
  return keys.has('Fire') || (player.mouseTap && player.tapTimer > 0);
}

function updateMouseAim({ x, y }) {
  camera.updateMatrixWorld();
  aimScreen.set(x * 2 - 1, 1 - y * 2);
  aimRay.setFromCamera(aimScreen, camera);
  const { ray } = aimRay;
  const ground = ray.intersectPlane(aimGround, aimPoint);
  const groundDistance = ground ? ray.origin.distanceToSquared(ground) : Infinity;
  let closest = groundDistance < camera.far ** 2 ? groundDistance : Infinity;
  // A goose under the crosshair is above the ground plane. Use its hitbox
  // so the cursor over its body aims at the goose instead of the pavement.
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    aimTargetBounds.center.set(enemy.x, enemy.hitHeight, enemy.z);
    aimTargetBounds.radius = enemy.size;
    if (!ray.intersectSphere(aimTargetBounds, aimTargetHit)) continue;
    const distance = ray.origin.distanceToSquared(aimTargetHit);
    if (distance >= closest || !world.lineClear3D(ray.origin, aimTargetHit, .04)) continue;
    closest = distance;
    aimPoint.copy(aimTargetHit);
  }
  if (closest === Infinity) ray.at(camera.far * .85, aimPoint);
  const dx = aimPoint.x - player.x, dz = aimPoint.z - player.z;
  if (dx * dx + dz * dz > .01) aimOffset.set(dx, aimPoint.y, dz);
  else aimOffset.set(player.dx * .1, 0, player.dz * .1);
}

function projectMouseAim() {
  camera.updateMatrixWorld();
  reticleOrigin.set(player.x, 0, player.z).project(camera);
  reticlePoint.set(player.x + aimOffset.x, aimOffset.y, player.z + aimOffset.z).project(camera);
  if (reticlePoint.z < -1 || reticlePoint.z > 1) return null;
  const dx = reticlePoint.x - reticleOrigin.x, dy = reticlePoint.y - reticleOrigin.y;
  const xLimit = 1 - reticleInset / viewWidth, yLimit = 1 - reticleInset / viewHeight;
  // Keep the whole reticle in view along the projected aim line.
  const edge = Math.min(1,
    dx > 0 ? (xLimit - reticleOrigin.x) / dx : dx < 0 ? (-xLimit - reticleOrigin.x) / dx : 1,
    dy > 0 ? (yLimit - reticleOrigin.y) / dy : dy < 0 ? (-yLimit - reticleOrigin.y) / dy : 1);
  reticlePosition.x = .5 + (reticleOrigin.x + dx * edge) * .5;
  reticlePosition.y = .5 - (reticleOrigin.y + dy * edge) * .5;
  return reticlePosition;
}

function drawMouseReticle() {
  const point = mouseAim.aiming && (mouseAim.following || isMouseFiring()) ? projectMouseAim() : null;
  mouseReticle.toggleAttribute('hidden', !point);
  gameShell.classList.toggle('mouse-reticle-active', !!point);
  if (!point) return;
  mouseReticle.style.left = `${point.x * 100}%`;
  mouseReticle.style.top = `${point.y * 100}%`;
}

function syncMouseAim() {
  const enabled = mouseSupported && !usingTouchControls && playing && !pauseDialog.open && !isRunner() && !gameInterlude();
  mouseAim.setEnabled(enabled);
  drawMouseReticle();
}

function update(dt) {
  if (pauseDialog.open) return;
  if (intro) {
    if (intro.update(dt)) finishIntro();
    return;
  }
  if (sleighAssembly.active) {
    if (sleighAssembly.update(dt)) finishSleighAssembly();
    return;
  }
  if (mapTransition.active) { mapTransition.update(dt); return; }
  if (runnerArrival > 0) {
    runnerArrival = Math.max(0, runnerArrival - dt);
    const { distance, elapsed } = runnerSession.state;
    runnerReward.update(distance, elapsed + FINISH_HOLD - runnerArrival, reducedMotion.matches);
    if (runnerArrival === 0) collectSleighPart();
    return;
  }
  gameTime += dt;
  // Finish the final bite's splash even after the round ends.
  biteEffects.update(dt);
  effects.update(dt, playing && isRunner() && !runnerCrash ? player.moveSpeed : 0);
  if (runnerCrash > 0) {
    runnerCrash = Math.max(0, runnerCrash - dt);
    if (runnerCrash === 0) endGame(false, { crashed: true });
    return;
  }
  if (!playing) return;
  if (isRunner()) { runnerSession.update(dt); return; }
  searchTime += dt;
  world.update(dt, [player, ...enemies, ...arenaCameos.actors]);

  const firing = keys.has('Space') || keys.has('Fire') || touchControls.input.firing || player.tapTimer > 0;
  const oldX = player.x, oldZ = player.z;
  const moving = updateMovement(dt, firing);

  player.root.position.set(player.x, 0, player.z);
  arenaCameos.update(dt, player, camera.position);
  const follower = arenaCameos.actors.find(actor => (actor.phase === 'approach' || actor.phase === 'watch')
    && !actor.fleeing && Math.hypot(actor.x - player.x, actor.z - player.z) < 4.2);
  showCameo(follower);
  if (sleighCache.update(gameTime, player, reducedMotion.matches)) { collectSleighPart(); return; }
  if (moving) player.runAngle = Math.atan2(player.x - oldX, player.z - oldZ) - player.heading;
  player.runBlend = THREE.MathUtils.damp(player.runBlend, moving ? 1 : 0, 18, dt);
  player.body.position.y = (Math.abs(Math.sin(player.runTime)) * 0.035 * player.runBlend + Math.sin(gameTime * 1.5) * 0.008 * (1 - player.runBlend)) * HERO_SCALE;
  const stride = player.runBlend * THREE.MathUtils.clamp(player.moveSpeed / player.speed, -1, player.skateTimer > 0 ? SKATE_SPEED_MULTIPLIER : 1);
  player.body.rotation.z = Math.cos(player.runTime) * 0.025 * player.runBlend - Math.sin(player.runAngle) * .06 * stride;
  player.body.rotation.x = 0.07 * Math.cos(player.runAngle) * stride;
  animateHero(player.rig, player.runTime, player.runBlend, player.runAngle);
  player.skateBlend = THREE.MathUtils.damp(player.skateBlend, Number(player.skateTimer > 0), 20, dt);
  if (player.skateBlend > .005) {
    animateSkating(player.rig, player.body, player.runTime * .32, Math.min(1, stride), player.runAngle, player.skateBlend);
  }
  medkits.update(dt, player, collectMedkit);
  arenaBoosts.update(dt, player, collectBoost);

  // Each parcel starts at the hands, then follows its own ballistic trajectory.
  seagulls.update(dt, player);
  if (!playing) return;
  sprayTutorial.update(dt, {
    touch: usingTouchControls, mouse: mouseAim.enabled, firing, airborne: sprayAimingUp(),
    gooseVisible: nearbyGooseVisible, gullVisible: nearbyGullVisible,
  });
  const spray = updateSpray(dt, firing, enemies, player.powerTimer > 0);
  player.tapTimer = Math.max(0, player.tapTimer - dt);
  player.powerTimer = Math.max(0, player.powerTimer - dt);
  player.skateTimer = Math.max(0, player.skateTimer - dt);
  updateSprayFeedback(spray);
  player.fireTimer -= dt;
  if (firing && player.fireTimer <= 0) {
    blip(180 + Math.random() * 35, 0.035);
    player.fireTimer = 0.1;
  }

  if (!arenaCombat.update(dt, gameTime, player.x - oldX, player.z - oldZ)) return;

  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.model.material.opacity = player.invulnerable > 0 && Math.floor(gameTime * 18) % 2 === 0 ? 0.45 : 1;
  player.model.material.transparent = player.invulnerable > 0;

  for (let i = enemies.length - 1; i >= 0; i--) {
    if (!enemies[i].alive) enemies.splice(i, 1);
  }
  cameraRig.frameArena(player.x, player.z, dt, { dx: player.x - oldX, dz: player.z - oldZ });
}

function enemyVisible(enemy) {
  if (!enemy.alive || Math.hypot(enemy.x - player.x, enemy.z - player.z) > 18) return false;
  enemyPoint.set(enemy.x, enemy.hitHeight, enemy.z);
  enemyScreen.copy(enemyPoint).project(camera);
  return Math.abs(enemyScreen.x) < 1 && Math.abs(enemyScreen.y) < 1 && Math.abs(enemyScreen.z) < 1
    && world.lineClear3D(camera.position, enemyPoint, .1);
}

function nearbyGooseVisible() { return enemies.some(enemyVisible); }
function nearbyGullVisible() { return seagulls.birds.some(enemyVisible); }

function sprayAimingUp() {
  const upwardTap = player.tapTimer > 0 && player.upwardTap && (player.touchTapHeading === null || !touchControls.input.firing);
  return aimingUp(keys, touchControls.input, upwardTap);
}

function updateSpray(dt, firing, groundTargets, powered = false) {
  sprayTargets.length = 0;
  for (const target of groundTargets) if ((target.age ?? 1) >= .24) sprayTargets.push(target);
  sprayTargets.push(...seagulls.birds);
  if (!isRunner()) for (const actor of arenaCameos.actors) {
    if (actor.age >= .24) sprayTargets.push(actor);
  }
  const direction = sprayAim(player, seagulls.birds, sprayAimingUp());
  const spray = stream.update(dt, firing, player.rig.emitter, direction, sprayTargets, powered);
  // The tap buffer only covers a press that starts and ends between ticks.
  if (touchControls.input.firing && player.touchTapHeading !== null) player.tapTimer = 0;
  return spray;
}

function updateSprayFeedback(spray) {
  updateReticleCharge(mouseAim.enabled ? spray.charge : 0);
  const range = spray.range.toFixed(1);
  const mode = spray.airborne ? 'Spraying upward; flick down to lower' : `Tap to spray, hold for range, drag to aim. Range ${range} metres. Flick up to spray at birds`;
  const label = `${mode}${spray.blocked ? ', blocked' : ''}`;
  sprayButton.dataset.blocked = String(spray.blocked);
  if (sprayZone.getAttribute('aria-label') !== label) sprayZone.setAttribute('aria-label', label);
}

function updateReticleCharge(charge) {
  const percent = Math.round(charge * 100);
  if (percent === reticleCharge) return;
  reticleCharge = percent;
  mouseReticle.style.setProperty('--reticle-charge', String(percent));
}

function updateHealth() {
  const ratio = Math.max(0, player.hp / player.maxHp);
  healthProgressArc.setAttribute('stroke-dasharray', `${ratio * 100} 100`);
  updateDialLabel();
}

function setLevelProgress(fraction) {
  levelProgress = THREE.MathUtils.clamp(fraction, 0, 1);
  levelProgressArc.setAttribute('stroke-dasharray', `${levelProgress * 100} 100`);
  updateDialLabel();
}

function updateSleighProgress() {
  sleighProgress.setAttribute('aria-valuemax', sleighParts.length);
  sleighProgress.setAttribute('aria-valuenow', foundParts);
  sleighProgress.setAttribute('aria-valuetext', `${foundParts} of ${sleighParts.length} parts found`);
  sleighFill.setAttribute('width', 48 * foundParts / sleighParts.length);
  Array.from(sleighSegments.children).forEach((segment, index) => {
    segment.classList.toggle('collected', index < foundParts);
  });
}

function currentDistrictScore(completed = false) {
  const district = itinerary[levelIndex];
  const run = isRunner() ? runnerSession.state : null;
  return calculateDistrictScore({
    paceSeconds: districtPaceSeconds(district),
    seconds: run?.elapsed ?? searchTime,
    defeated: run?.cleared ?? geeseDefeated,
    healthLost,
    trafficPassed: run?.passed,
    progress: run ? run.distance / world.runner.length : 0,
    completed,
  });
}

function recordHealthLost(amount) {
  healthLost += amount;
  updateHealth();
  updateScore();
}

function updateScore() {
  const inProgress = playing && foundParts === levelIndex;
  score = bankedScore + (inProgress ? currentDistrictScore().total : 0);
  const text = String(score).padStart(4, '0');
  if (scoreLabel.textContent !== text) scoreLabel.textContent = text;
  const fontSize = `${Math.max(9, Math.min(18, 58 / (text.length * 0.5)))}px`;
  if (scoreLabel.style.fontSize !== fontSize) scoreLabel.style.fontSize = fontSize;
  updateDialLabel();
}

function updateDialLabel() {
  const label = `Score ${score.toLocaleString()}, level progress ${Math.round(levelProgress * 100)} percent, health ${player.hp} of ${player.maxHp}`;
  if (levelDial.getAttribute('aria-label') !== label) levelDial.setAttribute('aria-label', label);
}

function updateBoostHud() {
  const show = playing && !gameInterlude();
  const remaining = [player.powerTimer / POWER_TIME, player.skateTimer / SKATE_TIME];
  for (const [index, boost] of boostHud.entries()) {
    const fraction = show ? remaining[index] : 0;
    const hidden = fraction <= 0;
    if (boost.icon.hasAttribute('hidden') !== hidden) boost.icon.toggleAttribute('hidden', hidden);
    const percent = Math.min(100, Math.ceil(fraction * 100));
    if (!hidden && boost.percent !== percent) {
      boost.percent = percent;
      boost.ring.setAttribute('stroke-dasharray', `${percent} 100`);
    }
  }
}

// Anchors encounter hints above the hero using the current viewport dimensions.
function updateHeroOverlay() {
  if (!playing || encounterHint.hidden || gameInterlude()) { heroHud.hidden = true; return; }
  heroHeadPosition.set(player.x, HERO_HEIGHT + 0.5, player.z).project(camera);
  const onScreen = heroHeadPosition.z < 1;
  heroHud.hidden = !onScreen;
  if (!onScreen) return;
  const x = (heroHeadPosition.x * 0.5 + 0.5) * viewWidth;
  const y = (-heroHeadPosition.y * 0.5 + 0.5) * viewHeight;
  heroHud.style.transform = `translate(${x - 32}px, ${y}px)`;
}

function collectBoost(kind) {
  if (kind === 'skates') {
    player.skateTimer += SKATE_TIME;
    showToast('SPEED SKATES!');
    blip(990, .15);
    return;
  }
  player.powerTimer += POWER_TIME;
  showToast('BATTERY POWER!');
  blip(880, .15);
}

function collectMedkit(amount) {
  player.hp = Math.min(player.maxHp, player.hp + amount);
  updateHealth();
  showToast(`HEALTH +${amount}`);
  blip(740, .12);
}

function placePlayerAtSpawn(menuPreview = false) {
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
  player.runAngle = 0;
  player.fireTimer = 0;
  player.root.rotation.y = player.heading;
  player.root.position.set(player.x, 0, player.z);
  player.body.position.set(0, 0, 0);
  player.body.rotation.set(0, 0, 0);
  if (menuPreview) cameraRig.frameMenu(player.x, player.z);
  else if (isRunner()) cameraRig.frameRunner(0, 0, true);
  else cameraRig.frameArena(player.x, player.z, 0, { instant: true });
  animateHero(player.rig, 0, 0);
}

function frameMenuPreview() {
  if (!showSenatePreview || world.id !== 'senate-square') return;
  const wide = canvas.clientWidth >= 900;
  const portrait = canvas.clientHeight > canvas.clientWidth;
  camera.position.set(wide ? -22 : -9, 18, 35);
  camera.lookAt(wide ? -20 : -2, portrait ? -6 : 7, -27);
}

function playFromMenu() {
  if (!player.model || !renderingReady || intro || !missionScreen.hidden) return;
  if (introSeen || debugMaps || query.has('map')) {
    startGame();
    return;
  }
  introSeen = true;
  try {
    intro = createSleighIntro(introOverlay, { reducedMotion: reducedMotion.matches, onImpact: () => blip(133, .32) });
    intro.resize(canvas.clientWidth, canvas.clientHeight);
    intro.update(0);
    startScreen.classList.add('hidden');
    introOverlay.hidden = false;
    gameShell.classList.add('intro-playing');
    skipIntro.focus({ preventScroll: true });
    frameClock.reset();
  } catch (error) {
    console.warn('Could not start the sleigh intro:', error);
    finishIntro();
  }
}

function finishIntro() {
  intro?.dispose();
  intro = null;
  introOverlay.hidden = true;
  gameShell.classList.remove('intro-playing');
  startScreen.classList.add('hidden');
  missionScreen.hidden = false;
  beginSearch.focus({ preventScroll: true });
}

function startGame({ transition = false } = {}) {
  if (!player.model || !renderingReady) return;
  playing = false;
  runnerArrival = 0;
  runnerCrash = 0;
  sleighAssembly.clear();
  gameShell.classList.remove('sleigh-assembling');
  mapTransition.cancel(); finishMapTransition();
  bankedScore = 0;
  updateScore();
  foundParts = 0;
  updateSleighProgress();
  if (transition) transitionToDistrict(0);
  else enterDistrict({ index: 0 });
  playing = true;
  touchControls.setEnabled(!mapTransition.active);
  startScreen.classList.add('hidden');
  missionScreen.hidden = true;
  endScreen.classList.add('hidden');
  keys.clear();
  canvas.focus({ preventScroll: true });
  syncMouseAim();
}

function clearArena() {
  resetInput();
  sprayTutorial.reset();
  clearTimeout(showToast.timer);
  toast.classList.remove('visible');
  stream.clear();
  seagulls.clear();
  biteEffects.clear();
  medkits.clear();
  player.tapTimer = 0;
  player.powerTimer = 0;
  player.skateTimer = 0;
  player.skateBlend = 0;
  arenaBoosts.clear();
  sleighCache.clear();
  runnerReward.clear();
  arenaCameos.clear();
  for (const enemy of enemies) if (enemy.alive) disposeEnemy(enemy);
  effects.clear();
  enemies.length = 0;
}

function endGame(won = false, { crashed = false } = {}) {
  showCameo(null);
  sprayTutorial.reset();
  updateScore();
  playing = false;
  syncMouseAim();
  touchControls.setEnabled(false);
  stream.clear();
  seagulls.clear();
  player.tapTimer = 0;
  player.moveSpeed = 0;
  player.turnSpeed = 0;
  endScreen.classList.remove('hidden');
  document.querySelector('#end-title').textContent = won ? 'SLEIGH COMPLETE' : crashed ? 'CRASHED' : 'WASTED';
  document.querySelector('#end-score').textContent = score.toLocaleString();
  restartButton.textContent = 'PLAY AGAIN';
  leaderboard.submit(score, levelIndex + 1);
  player.model.material.opacity = 1;
  player.model.material.transparent = false;
  blip(won ? 1046 : 80, 0.25);
  keys.clear();
}

let viewWidth = 0, viewHeight = 0;
function resize() {
  const width = viewWidth = canvas.clientWidth;
  const height = viewHeight = canvas.clientHeight;
  renderer.setSize(width, height, false);
  cameraRig.resize(width, height, window.matchMedia('(pointer: coarse)').matches);
  if (!playing && (!startScreen.classList.contains('hidden') || !missionScreen.hidden)) frameMenuPreview();
  sleighAssembly.resize(width, height);
  intro?.resize(width, height);
}

function animate(now) {
  requestAnimationFrame(animate);
  if (document.hidden || !renderingReady) { frameClock.reset(); return; }
  const dt = frameClock.advance(now, step => {
    update(step);
    return !pauseDialog.open && renderingReady;
  });
  if (!renderingReady) return;
  if (isRunner()) runnerSession.present();
  if (!pauseDialog.open && !gameInterlude()) weather.update(dt, isRunner() ? runnerSession.state.distance : 0);
  if (player.model && !sleighAssembly.active && !intro) world.updateVisibility(camera, player.root, HERO_HEIGHT, dt);
  if (intro) intro.render(renderer);
  else if (sleighAssembly.active) sleighAssembly.render(renderer);
  else if (mapTransition.active) {
    transitionRenderer.render(scene, camera, mapTransition.progress, reducedMotion.matches);
  } else renderer.render(scene, camera);
  updateHeroOverlay();
  updateBoostHud();
  updateCameoSpeech();
  drawMouseReticle();
}

function beginSpray(mouse = false, upward = false, touchHeading = null, fresh = true) {
  if (gameInterlude()) return;
  player.tapTimer = 0.075;
  player.mouseTap = mouse;
  player.upwardTap = upward;
  player.touchTapHeading = touchHeading;
  if (fresh) stream.resetPressure();
}

function resetInput() {
  mouseInput.reset();
  runnerInput.reset();
  runnerSession.resetInput();
  mouseAim.resetSteering();
  keys.clear();
  touchControls.reset();
  updateReticleCharge(0);
  player.tapTimer = 0;
  player.mouseTap = false;
  player.upwardTap = false;
  player.touchTapHeading = null;
  player.moveSpeed = 0;
  player.turnSpeed = 0;
  player.targetHeading = player.heading;
  player.moveX = Math.sin(player.heading);
  player.moveZ = Math.cos(player.heading);
}

function pauseGame() {
  if (!playing || pauseDialog.open || runnerCrash > 0) return;
  resetInput();
  pauseDialog.showModal();
  syncMouseAim();
}
document.querySelector('#pause-game').addEventListener('click', pauseGame);
pauseDialog.addEventListener('close', () => {
  frameClock.reset();
  resetInput();
  (playing ? canvas : startButton).focus({ preventScroll: true });
  syncMouseAim();
});
pauseDialog.querySelector('form').addEventListener('submit', event => {
  event.preventDefault();
  pauseDialog.close();
});

window.addEventListener('keydown', (event) => {
  if (intro) {
    if (event.code === 'Escape') {
      event.preventDefault();
      finishIntro();
    }
    return;
  }
  if (!missionScreen.hidden) {
    if (event.code === 'Enter' && !event.repeat) {
      event.preventDefault();
      beginSearch.click();
    }
    return;
  }
  if (event.code === 'Escape' && playing) {
    event.preventDefault();
    if (!event.repeat) {
      if (pauseDialog.open) pauseDialog.close();
      else pauseGame();
    }
    return;
  }
  if (pauseDialog.open) return;
  if (gameInterlude()) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    return;
  }
  if (playing && isRunner() && RUNNER_DODGE_KEYS.includes(event.code)) {
    event.preventDefault();
    if (!event.repeat) runnerSession.dodge(event.code === 'ArrowLeft' || event.code === 'KeyA' ? -1 : 1);
    return;
  }
  if (event.target instanceof Element && event.target.closest('select, input')) return;
  if (!playing && event.target instanceof Element && event.target.closest('button, a')) return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  const movementKey = MOVE_KEYS.includes(event.code);
  if (TURN_KEYS.includes(event.code) && !event.repeat) mouseAim.yieldToKeyboard();
  if (usingTouchControls && (movementKey || event.code === 'KeyE')) {
    usingTouchControls = false;
    syncMouseAim();
  }
  keys.add(event.code);
  if (event.code === 'Space' && !event.repeat && playing) beginSpray();
  if (event.code === 'Enter' && !playing && !startScreen.classList.contains('hidden')) playFromMenu();
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => { resetInput(); if (playing) pauseGame(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { resetInput(); if (playing) pauseGame(); }
});
window.addEventListener('resize', resize);
const mouseInput = bindGameInput({
  canvas,
  movementZone: document.querySelector('#joystick-zone'),
  movementHandle: document.querySelector('.joystick-hint'),
  sprayZone,
  canInteract: () => playing && !pauseDialog.open && !gameInterlude(),
  setFiring(firing, airborne) {
    if (firing) keys.add('Fire');
    else keys.delete('Fire');
    if (airborne) keys.add('FireUp');
    else keys.delete('FireUp');
    if (firing && !airborne) player.upwardTap = false;
  },
  beginSpray,
  pointMouseAim: mouseAim.point,
});
startButton.addEventListener('click', playFromMenu);
skipIntro.addEventListener('click', () => {
  if (intro) finishIntro();
});
beginSearch.addEventListener('click', () => { startGame({ transition: true }); });
startOver.addEventListener('click', () => {
  if (!playing || !renderingReady) return;
  pauseDialog.close();
  startGame({ transition: true });
});
restartButton.addEventListener('click', () => {
  startGame();
});
function syncSound() {
  for (const button of soundButtons) {
    button.setAttribute('aria-pressed', String(soundEnabled));
    button.title = soundEnabled ? 'Mute sound' : 'Enable sound';
    button.querySelector('use').setAttribute('href', soundEnabled ? '#speaker-on' : '#speaker-off');
  }
}

for (const button of soundButtons) {
  button.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    try { localStorage.setItem('golden-blast-sound', String(soundEnabled)); } catch { /* Storage is optional. */ }
    syncSound();
    if (soundEnabled) blip(520, 0.05);
  });
}

syncSound();
syncMouseAim();
syncLevelUI();
resize();
loadModels();
requestAnimationFrame(animate);

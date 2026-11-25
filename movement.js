function turnPlayer(player, targetSpeed, dt) {
  if (!targetSpeed) {
    player.turnSpeed = 0;
    return;
  }
  // Respond to a direction change immediately, then ease into the new turn.
  if (player.turnSpeed * targetSpeed < 0) player.turnSpeed = 0;
  const decay = Math.exp(-18 * dt);
  const heading = player.targetHeading + targetSpeed * dt + (player.turnSpeed - targetSpeed) * (1 - decay) / 18;
  player.targetHeading = Math.atan2(Math.sin(heading), Math.cos(heading));
  player.turnSpeed = targetSpeed + (player.turnSpeed - targetSpeed) * decay;
}

function approachHeading(heading, target, dt, turnRate = 14) {
  const angle = Math.atan2(Math.sin(target - heading), Math.cos(target - heading));
  const turnStep = turnRate * dt;
  return Math.abs(angle) <= turnStep ? target : heading + Math.sign(angle) * turnStep;
}

export function smoothTouchHeading(heading, target, dt) {
  const maxRate = 10;
  const response = 20;
  const angle = Math.atan2(Math.sin(target - heading), Math.cos(target - heading));
  const distance = Math.abs(angle);
  // Cap a large turn, then ease into the target at the same rate at any FPS.
  const timeAtMaxRate = Math.min(dt, Math.max(0, (distance - maxRate / response) / maxRate));
  const remaining = (distance - maxRate * timeAtMaxRate) * Math.exp(-response * (dt - timeAtMaxRate));
  const next = heading + Math.sign(angle) * (distance - remaining);
  return Math.atan2(Math.sin(next), Math.cos(next));
}

export function movePlayer(player, city, { keys, touch, dt, firing, height, cursorHeading = null, shotHeading = null, touchHeading = null, steerWithMouse = false }) {
  const touchStrength = Math.hypot(touch.x, touch.z);
  const x = touchStrength ? touch.x : Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  const z = touchStrength ? touch.z : Number(keys.has('KeyS')) - Number(keys.has('KeyW'));
  const turn = touchStrength ? 0 : Number(keys.has('ArrowLeft')) - Number(keys.has('ArrowRight'));
  const throttle = touchStrength ? 0 : Number(keys.has('ArrowUp')) - Number(keys.has('ArrowDown'));
  const directStrength = Math.hypot(x, z);
  const touchAim = touch.aimX || touch.aimZ ? Math.atan2(touch.aimX, touch.aimZ) : touchHeading;
  const mouseSteering = steerWithMouse && !touchStrength;
  const mouseHeading = touchStrength ? null : shotHeading ?? (mouseSteering ? cursorHeading : null);
  player.targetHeading ??= player.heading;
  turnPlayer(player, turn * (firing ? 1.7 : 3.2), dt);
  if (!touchStrength && !turn && !throttle && directStrength && !mouseSteering) player.targetHeading = Math.atan2(x, z);

  if (touchAim !== null) {
    player.heading = player.targetHeading = smoothTouchHeading(player.heading, touchAim, dt);
  } else if (touchStrength) {
    player.targetHeading = player.heading;
  } else if (mouseHeading !== null) {
    player.heading = mouseHeading;
    if (!turn && (mouseSteering || (!throttle && !directStrength))) player.targetHeading = mouseHeading;
  } else if (firing && !directStrength) {
    player.heading = player.targetHeading;
  } else {
    const turnRate = directStrength && !turn && !throttle ? 10 : 14;
    player.heading = approachHeading(player.heading, player.targetHeading, dt, turnRate);
  }

  player.heading = Math.atan2(Math.sin(player.heading), Math.cos(player.heading));
  player.dx = Math.sin(player.heading);
  player.dz = Math.cos(player.heading);
  player.root.rotation.y = player.heading;

  // WASD and touch directions are independent of aim and arrow throttle.
  const directScale = Math.max(1, directStrength);
  const moveX = x / directScale + throttle * Math.sin(player.targetHeading);
  const moveZ = z / directScale + throttle * Math.cos(player.targetHeading);
  const strength = Math.hypot(moveX, moveZ);
  const moving = strength > 1e-6;
  const maxSpeed = player.speed * (firing ? 0.7 : 1);
  const targetSpeed = moving ? Math.min(1, strength) * maxSpeed : 0;
  const oldSpeed = player.moveSpeed;
  const directionX = moving ? moveX / strength : (player.moveX ?? player.dx);
  const directionZ = moving ? moveZ / strength : (player.moveZ ?? player.dz);
  const blendDirect = directStrength > 0 && moving && oldSpeed > 0 && player.moveX !== undefined;
  const redirecting = blendDirect && player.moveX * directionX + player.moveZ * directionZ < .999;
  const damping = moving ? (redirecting ? 8 : 14) : 48;
  const decay = Math.exp(-damping * dt);
  const easingTime = (1 - decay) / damping;
  let travelX, travelZ;
  // Blend screen-relative movement through corners and brake before reversing.
  if (blendDirect) {
    const targetX = directionX * targetSpeed, targetZ = directionZ * targetSpeed;
    const deltaX = player.moveX * oldSpeed - targetX, deltaZ = player.moveZ * oldSpeed - targetZ;
    travelX = targetX * dt + deltaX * easingTime;
    travelZ = targetZ * dt + deltaZ * easingTime;
    const vx = targetX + deltaX * decay, vz = targetZ + deltaZ * decay;
    player.moveSpeed = Math.hypot(vx, vz);
    if (player.moveSpeed) {
      player.moveX = vx / player.moveSpeed;
      player.moveZ = vz / player.moveSpeed;
    }
  } else {
    const distance = targetSpeed * dt + (oldSpeed - targetSpeed) * easingTime;
    travelX = directionX * distance;
    travelZ = directionZ * distance;
    player.moveSpeed = targetSpeed + (oldSpeed - targetSpeed) * decay;
    player.moveX = directionX;
    player.moveZ = directionZ;
  }
  if (!moving && player.moveSpeed < 0.015) player.moveSpeed = 0;
  const oldX = player.x, oldZ = player.z;
  city.move(player, travelX, travelZ, player.radius);
  const travelled = Math.hypot(player.x - oldX, player.z - oldZ);
  const distance = Math.hypot(travelX, travelZ);
  if (distance > 0.0001 && travelled < distance * 0.1) player.moveSpeed = 0;
  player.runTime += travelled * Math.PI * 2 / (height * 0.45);
  return travelled > 0.0001;
}

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

export function movePlayer(player, city, { keys, touch, dt, firing, height, cursorHeading = null, shotHeading = null, steerWithMouse = false }) {
  const touchStrength = Math.hypot(touch.x, touch.z);
  const x = touchStrength ? touch.x : Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  const z = touchStrength ? touch.z : Number(keys.has('KeyS')) - Number(keys.has('KeyW'));
  const turn = touchStrength ? 0 : Number(keys.has('ArrowLeft')) - Number(keys.has('ArrowRight'));
  const throttle = touchStrength ? 0 : Number(keys.has('ArrowUp')) - Number(keys.has('ArrowDown'));
  const directStrength = Math.hypot(x, z);
  const mouseSteering = steerWithMouse && !touchStrength;
  const mouseHeading = touchStrength ? null : shotHeading ?? (mouseSteering ? cursorHeading : null);
  player.targetHeading ??= player.heading;
  turnPlayer(player, turn * (firing ? 1.7 : 3.2), dt);
  if (!turn && !throttle && directStrength && !mouseSteering) player.targetHeading = Math.atan2(x, z);

  if (mouseHeading !== null) {
    player.heading = mouseHeading;
    if (!turn && (mouseSteering || (!throttle && !directStrength))) player.targetHeading = mouseHeading;
  } else if (firing && !touchStrength) {
    player.heading = player.targetHeading;
  } else {
    player.heading = approachHeading(player.heading, player.targetHeading, dt, touchStrength ? 22 : 14);
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
  if (moving) {
    player.moveX = moveX / strength;
    player.moveZ = moveZ / strength;
  }
  const maxSpeed = player.speed * (firing ? 0.7 : 1);
  const targetSpeed = moving ? Math.min(1, strength) * maxSpeed : 0;
  const damping = moving ? 14 : 48;
  const decay = Math.exp(-damping * dt);
  const distance = targetSpeed * dt + (player.moveSpeed - targetSpeed) * (1 - decay) / damping;
  player.moveSpeed = targetSpeed + (player.moveSpeed - targetSpeed) * decay;
  if (!moving && player.moveSpeed < 0.015) player.moveSpeed = 0;
  const oldX = player.x, oldZ = player.z;
  city.move(player, (player.moveX ?? player.dx) * distance, (player.moveZ ?? player.dz) * distance, player.radius);
  const travelled = Math.hypot(player.x - oldX, player.z - oldZ);
  if (distance > 0.0001 && travelled < distance * 0.1) player.moveSpeed = 0;
  player.runTime += travelled * Math.PI * 2 / (height * 0.45);
  return travelled > 0.0001;
}

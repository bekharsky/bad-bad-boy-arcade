// E and the right mouse button change elevation without changing horizontal aim.
export const aimingUp = (keys, touch, upwardTap = false) => keys.has('KeyE') || keys.has('FireUp') || !!touch.airborne || upwardTap;

export function createSprayAim() {
  const facing = { dx: 0, dz: 1, airborne: false, target: null };
  return (player, birds, airborne) => {
    facing.dx = player.dx; facing.dz = player.dz;
    facing.airborne = airborne; facing.target = null;
    if (!airborne) return facing;
    let nearest = Infinity;
    for (const bird of birds) {
      if (!bird.alive) continue;
      const dx = bird.x - player.x, dz = bird.z - player.z;
      const distance = Math.hypot(dx, dz);
      // Help with height, while retaining a forward aiming cone on the ground.
      if (distance > 13 || (distance > 2 && (dx * player.dx + dz * player.dz) / distance < .2)) continue;
      const priority = distance + (bird.target ? -4 : 0);
      if (priority < nearest) { nearest = priority; facing.target = bird; }
    }
    return facing;
  };
}

// Arena owns enemy pursuit, separation and bite timing. Rendering and round
// lifecycle stay with the coordinator; fatal damage stops the current step.
export function createArenaCombat({ world, player, enemies, animateEnemy, onBite }) {
  return {
    update(dt, time, playerDeltaX = 0, playerDeltaZ = 0) {
      const travel = Math.hypot(playerDeltaX, playerDeltaZ);
      const running = travel > 0 ? Math.min(1, Math.max(0, (travel / (dt * player.speed) - .68) / .24)) : 0;
      world.routeTo(player.x, player.z);
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        enemy.attack -= dt;
        enemy.hit = Math.max(0, enemy.hit - dt);
        const vx = player.x - enemy.x, vz = player.z - enemy.z;
        const distance = Math.hypot(vx, vz);
        const post = enemy.guardPost;
        const returning = post && (Math.hypot(player.x - post.x, player.z - post.z) > (enemy.guardRange ?? 10.5)
          || !world.lineClear(post.x, post.z, player.x, player.z, .6));
        const away = running && distance > 0 ? (playerDeltaX * vx + playerDeltaZ * vz) / (travel * distance) : 0;
        // Retain some sprint through sideways movement at a corner. A stop or
        // slow walk immediately brings back the ordinary bite and walk pace.
        const previous = enemy.pursuit ?? 0;
        const target = away > .2 ? running : away < -.55 ? 0 : Math.min(previous, running) * .8;
        const pursuit = running ? target + (previous - target) * Math.exp(-(target > previous ? 11 : 7) * dt) : 0;
        enemy.pursuit = pursuit;
        const biteReach = enemy.size + player.radius + .14;
        const attacking = !returning && distance <= biteReach && world.lineClear(enemy.x, enemy.z, player.x, player.z, .1);
        let heading = Math.atan2(vx, vz);
        let speed = 0;
        if (!attacking) {
          const direction = returning ? { x: post.x - enemy.x, z: post.z - enemy.z }
            : world.chase(enemy.x, enemy.z, player.x, player.z);
          for (const other of enemies) {
            if (other === enemy || !other.alive) continue;
            const sx = enemy.x - other.x, sz = enemy.z - other.z;
            const spacing = (enemy.size + other.size) * .88;
            // Most pairs are far apart. Check a cheap square first, then take
            // the square root only for actors that could actually overlap.
            if (Math.abs(sx) >= spacing || Math.abs(sz) >= spacing) continue;
            const separation = Math.hypot(sx, sz);
            if (separation > .001 && separation < spacing) {
              direction.x += sx / separation * (spacing - separation) * 1.8;
              direction.z += sz / separation * (spacing - separation) * 1.8;
            }
          }
          const length = Math.hypot(direction.x, direction.z);
          if (length > .01) {
            let step = enemy.speed * dt;
            if (returning) step = Math.min(step * 1.6, length);
            else if (pursuit > .1) {
              const pace = enemy.speed + (player.speed * .83 - enemy.speed) * pursuit;
              step = Math.min(pace * dt, Math.max(0, distance - biteReach * .85));
            }
            const oldX = enemy.x, oldZ = enemy.z;
            if (step > 0) world.move(enemy, direction.x / length * step, direction.z / length * step, enemy.size);
            speed = Math.hypot(enemy.x - oldX, enemy.z - oldZ) / dt;
            heading = Math.atan2(direction.x, direction.z);
          }
          enemy.root.position.set(enemy.x, 0, enemy.z);
        } else if (enemy.attack <= 0 && player.invulnerable <= 0) {
          player.hp--;
          player.invulnerable = 1.3;
          enemy.attack = 1.2;
          if (onBite(enemy) === false) return false;
        }
        const yaw = enemy.root.rotation.y ?? heading;
        const angle = Math.atan2(Math.sin(heading - yaw), Math.cos(heading - yaw));
        const turn = (10 + 15 * pursuit) * dt;
        enemy.root.rotation.y = Math.abs(angle) <= turn ? heading : yaw + Math.sign(angle) * turn;
        animateEnemy(enemy, dt, time, attacking, speed);
      }
      return true;
    },
  };
}

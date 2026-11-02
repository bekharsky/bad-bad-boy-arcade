// Arena owns enemy pursuit, separation and bite timing. Rendering and round
// lifecycle stay with the coordinator; fatal damage stops the current step.
export function createArenaCombat({ world, player, enemies, animateEnemy, onBite }) {
  return {
    update(dt, time) {
      world.routeTo(player.x, player.z);
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        enemy.attack -= dt;
        enemy.hit = Math.max(0, enemy.hit - dt);
        const vx = player.x - enemy.x, vz = player.z - enemy.z;
        const distance = Math.hypot(vx, vz);
        const attacking = distance <= enemy.size + player.radius + .06 && world.lineClear(enemy.x, enemy.z, player.x, player.z, .1);
        enemy.root.rotation.y = Math.atan2(vx, vz);
        if (!attacking) {
          const direction = world.chase(enemy.x, enemy.z, player.x, player.z);
          for (const other of enemies) {
            if (other === enemy || !other.alive) continue;
            const sx = enemy.x - other.x, sz = enemy.z - other.z;
            const separation = Math.hypot(sx, sz), spacing = (enemy.size + other.size) * .88;
            if (separation > .001 && separation < spacing) {
              direction.x += sx / separation * (spacing - separation) * 1.8;
              direction.z += sz / separation * (spacing - separation) * 1.8;
            }
          }
          const length = Math.hypot(direction.x, direction.z);
          if (length > .01) {
            world.move(enemy, direction.x / length * enemy.speed * dt, direction.z / length * enemy.speed * dt, enemy.size);
            enemy.root.rotation.y = Math.atan2(direction.x, direction.z);
          }
          enemy.root.position.set(enemy.x, 0, enemy.z);
        } else if (enemy.attack <= 0 && player.invulnerable <= 0) {
          player.hp--;
          player.invulnerable = .85;
          enemy.attack = 1.2;
          if (onBite(enemy) === false) return false;
        }
        animateEnemy(enemy, dt, time, attacking);
      }
      return true;
    },
  };
}

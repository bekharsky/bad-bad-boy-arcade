import { createLiquidStream } from './liquid.js';

const SPREAD_ANGLE = .22;
const STREAM_COLOR = '#ffd34c';
const POWER_COLOR = '#39ff14';

// Own all jets as one weapon: input, power state and round cleanup must apply
// to the side jets as well as the centre jet. Damage shares the caller's clock.
export function createSpraySystem(scene, world, onHit, options) {
  const centre = createLiquidStream(scene, world, onHit, options);
  const sides = [createLiquidStream(scene, world, onHit, options), createLiquidStream(scene, world, onHit, options)];
  const streams = [centre, ...sides];
  const facing = { dx: 0, dz: 0 };
  let powered = false;

  function setPowered(value) {
    if (value === powered) return;
    powered = value;
    for (const stream of streams) stream.setTint(powered ? POWER_COLOR : STREAM_COLOR, powered ? POWER_COLOR : undefined);
    if (!powered) for (const side of sides) side.clear();
  }

  return {
    update(dt, firing, emitter, direction, enemies, powerActive = false) {
      setPowered(powerActive);
      const state = centre.update(dt, firing, emitter, direction, enemies);
      if (powered) for (let i = 0; i < sides.length; i++) {
        const angle = (i ? 1 : -1) * SPREAD_ANGLE;
        const c = Math.cos(angle), s = Math.sin(angle);
        facing.dx = direction.dx * c - direction.dz * s;
        facing.dz = direction.dx * s + direction.dz * c;
        sides[i].update(dt, firing, emitter, facing, enemies);
      }
      return state;
    },
    resetPressure() { for (const stream of streams) stream.resetPressure(); },
    clear() {
      for (const stream of streams) stream.clear();
      setPowered(false);
    },
  };
}

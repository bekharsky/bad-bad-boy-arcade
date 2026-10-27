# Bad Bad Boy: Golden Blast Helsinki

A browser arcade game starring Helsinki's Bad Bad Boy sculpture. The textured character model is included in the repository: `assets/bad-bad-boy.glb`.

## Play online

[Play Golden Blast](https://bekharsky.github.io/bad-bad-boy-arcade/)

GitHub Pages publishes the repository root from the `bekharsky/arcade` branch. Pushing updates to this branch updates the live game. The `.nojekyll` file serves the game and its bundled assets directly without Jekyll processing.

## Run locally

Start a local server from the repository root:

```bash
python3 server.py
```

Open [http://localhost:8000/](http://localhost:8000/). No build step or package installation is needed. Three.js and the fonts are included in `vendor/`, so gameplay does not depend on a CDN or an internet connection. You can also start the server with `npm start`. The server always serves fresh application modules to prevent stale code from different versions being mixed.

Movement defaults to **Tank controls**: up/down move forward/backward relative to the character, and left/right turn. An explicitly selected mode is remembered for future visits.

Choose **Direct movement** for screen directions: up always moves toward the top of the screen, regardless of which way the character faces. Arrow keys, `WASD`, and the joystick immediately move in the chosen screen direction while the character and stream smoothly turn toward it. Movement never waits for the turn to finish, even when reversing direction or spraying. Large turns follow the shortest angle at a capped speed and finish exactly at the requested direction; small aim corrections apply immediately. Direct movement brakes within about 7.5 cm when released at full speed. Diagonal movement is normalized. **Tank controls** use character-relative directions: up moves forward where the character is facing, down moves backward, and left/right turn the character. This applies to both keyboard layouts and the joystick. Releasing the Tank turn input stops rotation immediately. Spraying reduces movement speed and Tank steering speed. Both modes accelerate and brake smoothly, with animation paced to actual travel and a fixed camera viewing angle.

**Mouse aim** is an optional aiming helper, enabled by default on supported desktop browsers in either movement mode. Capturing the mouse does not change the keyboard layout. Tank keeps up/down for forward/backward movement and left/right for turning the character; Shift slows turning to 60% for finer adjustments, including while firing. Direct keeps its original screen-relative movement and facing. Keyboard steering always takes priority over the mouse. After a keyboard turn, the internal aim point follows the character and the chosen direction stays fixed until the mouse moves again; a stale cursor never pulls the character back. Capture alone does not steer. The existing ground marker shows the aim; there is no separate mouse crosshair. In Tank mode, mouse aiming can also adjust facing while up/down moves along that facing. Spray distance still uses tap/hold pressure.

Starting or clicking Resume captures the mouse; after a keyboard resume, click the game to capture it again. Pointer lock keeps the cursor inside the game and gives the game keyboard focus. `Esc`, losing capture, or switching away pauses and releases the mouse. The **Mouse aim** switch before starting and in the pause menu is remembered separately. Touch controls do not capture the mouse. Unsupported or denied capture leaves keyboard and mouse-click spraying available. Clicking the playfield fires immediately, independently of mouse capture; after a denial the game stops retrying capture until a new round or an explicit mouse-aim setting change. Screen controls and returning to the game restore canvas focus. On narrow desktop views the transparent touch zone passes mouse shots through to the world, while dragging from MOVE still controls the joystick. Mouse aiming overrides aim assist only while actively used; keyboard steering cancels the mouse helper.

**Aim assist** is enabled by default for Direct mode and can be switched off before starting or in the pause menu. While the mouse helper is inactive, firing gently turns the character and stream toward a living enemy within 25 degrees of the requested direction and about nine metres of the player. Obstacles block target selection. A gold ring marks the selected enemy. A valid lock is retained until the enemy dies, leaves range, becomes blocked, or moves more than 32 degrees away from the requested direction, preventing constant target switching or tracking around behind the player. Obstruction checks are batched at 10 Hz. Aim assist does not steer movement, change pressure, extend range, or bend liquid already in flight. Tap near and hold far as usual. The setting is remembered separately from the movement mode and has no effect in Tank mode.

For precise manual keyboard aiming in Direct mode, hold `Shift` with `Left` / `Right` (or `A` / `D`) to rotate in place at any angle, including while spraying. Turning eases into a fast rotation (about a quarter-turn in 0.55 seconds and a half-turn in one second), including while firing. Shift temporarily overrides aim assist. Releasing the direction keys stops rotation immediately. Shift alone stops travel and holds the current aim. `Shift` + `Up` / `Down` (or `W` / `S`) moves slowly forward/backward along the chosen aim without snapping it to a world direction. Normal directional movement and enabled aim assistance resume when Shift is released. Without aim assist, releasing Shift keeps the chosen angle until another movement command. In Tank mode, Shift slows movement and turning for finer adjustments, including while firing. Turns still ease in smoothly and stop immediately on release.

The title screen has one primary action, **PLAY**, with no movement choice or instructional copy blocking a quick start. A labelled gear opens **Controls**, containing Direct/Tank movement, aiming switches, sound, and model credits. Existing preferences apply immediately; movement, aiming, and sound choices are remembered for future visits when storage is available. Closing Controls before playing returns to the title without starting the game or capturing the mouse. Press `Esc` during a round to open the same settings and pause, then resume with `Esc` or **RESUME**. Changing modes clears held inputs. The movement cards are native radio groups with keyboard navigation and visible focus.

Tap the left mouse button or `Space` for nearby enemies, or hold to spray farther. The stream follows the character's actual facing direction from beneath his joined hands. On touchscreens, drag anywhere in the left control area; the joystick response is gentler near the centre for fine positioning and reaches full speed at the edge. The floating joystick appears under your thumb and its base follows long drags. Release to stop. Use a second finger on SPRAY to fire while moving. Touch controls support portrait and landscape layouts and reset when the app loses focus. Hit the approaching enemies to clear waves and earn points.

Health is shown only above the hero, with a red bar at low health. The header shows wave and score.

The character's axes are aligned, and his legs use a skeleton with hip, knee, and ankle joints.
The character reaches the third-floor windows of the map's buildings. His height is three storeys at 1.15 game units each (3.45 total), using the same storey spacing as the facades. The emitter, collision radius, and liquid thickness match this size. The camera frames his full height, and the running animation follows the distance travelled with a stride proportional to his height.

## Loading

The entry point uses one version for all game modules. Hero download progress uses the decoded file size from the GLB header, so HTTP compression cannot push it above 100%. The counter stops at 99% during transfer, then shows “Preparing the models…” until all models and the hero rig are ready. Startup errors appear above the start button with a retry button instead of leaving the game on an indefinite loading screen. The local server disables caching for JavaScript, HTML, and CSS. A plain static server still works; use the included server during development to keep modules fresh.

## Liquid stream

A tap sends a short, downward stream about 0.9 game metres from the emitter, making enemies near the feet reachable. Holding fire builds pressure over 1.2 seconds: launch speed and angle increase smoothly until the stream reaches about 8 metres on level ground. Release to return to the short range. The liquid always launches forward from beneath the character's hands and follows a gravity-driven parabola. The glossy surface pulses as it flows, breaks into droplets near the end, and splashes against enemies, walls, and the ground, with expanding rings on the pavement. Its particle capacity covers the full fall from this height; collisions account for obstacle height, allowing liquid to pass above benches and cars.

The ground ring previews the landing point, and the spray range meter shows the pressure and distance. The compact meter sits at the bottom centre, between MOVE and SPRAY on touch layouts, and shows only distance and a pressure bar. The marker hides and the meter shows × if an obstacle cuts the trajectory short. Every tap produces at least a 75 ms burst, including clicks shorter than a frame. Ground splashes also damage enemies within about half a metre of the landing point, plus their collision radius; splash damage respects obstacles and shares the direct-hit cooldown.

Liquid already in flight keeps its own trajectory when the character turns or the pressure changes. Releasing fire lets the remaining liquid fall. Collision and damage follow the actual liquid parcels, so the stream stops at the first enemy or obstacle. Direct hits grow from 1.5 damage at low pressure to 3 at full pressure, and knockback grows from 0.14 to 0.42 metres. Ground splashes deal 60% of direct damage. All three Battery streams share a 0.16-second per-enemy hit interval on the same game clock. Each parcel keeps its launch pressure, so releasing the button never weakens liquid already in flight. The full-pressure stream also looks thicker.

On devices with a coarse primary pointer, the stream keeps its glossy coating and alpha transparency with refraction disabled, avoiding an extra scene render. Empty stream and droplet meshes stay hidden on all devices, and their GPU buffers upload only when they contain visible geometry. These rendering choices do not change the stream's physics, range, or damage.

## City and enemies

The harbour neighbourhood has a 22 × 15 metre cobbled square and a playable area spanning 55.6 metres in each direction. The hero starts beside the silver Verkkopaukka department store and its red rooftop sign. A continuous road and tram corridor runs parallel to the shoreline along the edge of the square, with crossings connecting the neighbourhood to the waterfront. Red-brick warehouses, a glass ferry terminal, dock cranes, and a broad quay occupy the water side; homes, cafés, bakery windows, and outdoor tables line the inland side. A white cruise ferry sits on Baltic water beyond the quay, and a miniature white Helsinki Cathedral with green domes marks the western backdrop. This is a playful interpretation of the harbour rather than a scale reconstruction.

A green-and-yellow articulated Helsinki tram follows the boulevard from west to east, then returns in the opposite direction. Rails sit in a cobbled median between the asphalt traffic lanes, beneath contact wires and cross spans. The first service departs after eight seconds; subsequent services wait 22–34 seconds between trips. Its body blocks walking and the liquid stream, gently nudges actors off the tracks, and updates the enemies' navigation grid as it moves. Buildings and street furniture also have collision boundaries. Enemies navigate around obstacles using a shared navigation grid. The stream cannot pass through obstacles.
Buildings smoothly fade to 12% opacity when they overlap the character's feet, body, shoulders, or head along the camera's line of sight. Walls, roofs, windows, and signs fade together and return to full opacity once the view is clear.

Waves contain snails and Spanish slugs. Snails start with 10 health, slugs with 6; every three waves adds another health point. A short tap hurts without immediately killing, while direct, higher-pressure hits clear enemies faster. Each enemy is worth 150 points. Both enemy models are free and openly licensed: Snail by Poly by Google (CC BY 3.0) and Slug by Poly by Google (CC BY 3.0). Sources, licences, and modifications are listed in [CREDITS.md](./CREDITS.md) and the in-game Models & credits page.

Going 18 seconds without a kill brings two reinforcements. Further arrivals come after eight seconds, then six, then every four, with groups gradually growing to six enemies. Any kill resets this pressure and grants another 18 seconds; clearing a wave also resets it. The crowd is capped at 48 living enemies. Pausing freezes the timer.

Successful enemy bites emit a red splash from the animated shin nearest the attacker. Eighteen droplets fly outward, fall, flatten briefly on the pavement, and shrink away. The effect triggers only when health is lost, continues after a fatal bite, and resets when restarting. A shared instanced mesh caps the droplets at 64 and renders them in one draw call.

Five medkits appear each round: one emergency kit on the square and four hidden in courtyards behind houses. Look for floating white cases with green crosses and a green ground ring. Walk over one to restore up to two health points. They remain available at full health, are consumed once per round, and return when restarting. Placement leaves clearance for the player; pickups require a clear path. All five kits share three instanced meshes.

Four Battery energy drinks are hidden behind the outer houses instead of dropping from enemies. Each can turns the stream neon green and splits it into three for eight seconds; collecting more adds time. They return when restarting. All hidden rewards are reachable by walking around the buildings, and cannot be collected through walls.

## Files

- `index.html` and `style.css`: game interface and controls.
- `bootstrap.js`: startup, timeout handling, and visible loading errors.
- `server.py`: local server with fresh application modules.
- `vendor/`: pinned Three.js modules and local fonts with their licences.
- `game.js`: movement, waves, damage, and input.
- `touch-controls.js`: floating analog joystick and independent multitouch spray control.
- `movement.js`: Direct and Tank movement, shared keyboard layouts, analog speed, and collision handling.
- `aim-assist.js`: Direct-mode target selection, stable locks, bounded aim correction, and batched obstruction checks.
- `mouse-aim.js`: pointer lock, aim coordinates, capture lifecycle, and safe keyboard fallback.
- `game-input.js`: pointer-lock-independent mouse spraying and gameplay focus restoration.
- `city.js`: environment, collisions, and navigation.
- `city-scenery.js`: animated Helsinki tram, cruise ferry, harbour water, dock cranes, and miniature cathedral.
- `enemy-pressure.js`: kill-sensitive reinforcement timing and crowd limits.
- `liquid.js`: ballistic liquid simulation, fluid surface, droplets, splashes, and hit detection.
- `enemies.js`: loading and animating the snail and slug models.
- `hero.js`: character rig, animation, and stream emitter.
- `bites.js`: red droplets marking damaging snail and slug bites.
- `medkits.js`: collectible health kits, courtyard placement, and pickup handling.
- `assets/bad-bad-boy.glb`: character without its stand: 30,000 triangles, 21,052 vertices, preserved UVs and a 1024 × 1024 JPEG colour atlas (1,015,852 bytes total).
- `assets/enemies/`: original enemy GLBs with materials and animations.
- `scripts/prepare-model.mjs`: prepare the game GLB from the source model.
- `scripts/optimize-model.mjs`: simplify geometry with meshoptimizer, reorder the vertex cache, compact vertex streams, use 16-bit indices, and encode the texture with Sharp.

## Prepare the character model

The game model was derived from `bc222867938641be8050f747614e5d34.glb`. The source file incorrectly assigns its 8000 × 8000 colour atlas as a normal map. The preparation script reassigns it to base colour, removes the stand and separate plane, and aligns the model for its skeleton. It then automatically optimizes the result: 305,625 → 30,000 triangles, 183,001 → 21,052 vertices, and a 1024 × 1024 JPEG atlas instead of the intermediate 2048 × 2048 PNG. This reduces the game GLB from 18,326,612 to 1,015,852 bytes (94.5% smaller). UVs and normals are retained; simplification also accounts for hip, knee, and ankle weight transitions. The material, skeleton coordinate frame, and stream origin stay compatible with the game. The output is a standard GLB with no runtime compression decoder required.

To prepare it again, install Node.js and the development dependencies:

```bash
npm ci
npm run prepare-model -- /path/to/bc222867938641be8050f747614e5d34.glb
```

Normal gameplay uses the prepared GLB and does not require installing dependencies.

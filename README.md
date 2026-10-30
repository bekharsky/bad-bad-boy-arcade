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

Keyboard movement defaults to **Tank controls**: up/down move forward/backward relative to the character, and left/right turn. An explicitly selected mode is remembered for future visits.

Choose **Direct movement** for screen directions: up always moves toward the top of the screen, regardless of which way the character faces. Arrow keys, `WASD`, and the joystick immediately move in the chosen screen direction while the character and stream smoothly turn toward it. Movement never waits for the turn to finish, even when reversing direction or spraying. Large turns follow the shortest angle at a capped speed and finish exactly at the requested direction; small aim corrections apply immediately. Direct movement brakes within about 7.5 cm when released at full speed. Diagonal movement is normalized. **Tank controls** use character-relative directions: up moves forward where the character is facing, down moves backward, and left/right turn the character. This applies to both keyboard layouts. The touch joystick always uses screen directions. Releasing the Tank turn input stops rotation immediately. Spraying reduces movement speed and Tank steering speed. Both modes accelerate and brake smoothly, with animation paced to actual travel and a fixed camera viewing angle.

**Mouse aim** is an optional aiming helper, enabled by default on supported desktop browsers in either movement mode. Capturing the mouse does not change the keyboard layout. Tank keeps up/down for forward/backward movement and left/right for turning the character; Shift slows turning to 60% for finer adjustments, including while firing. Direct keeps its original screen-relative movement and facing. Keyboard steering always takes priority over the mouse. After a keyboard turn, the internal aim point follows the character and the chosen direction stays fixed until the mouse moves again; a stale cursor never pulls the character back. Capture alone does not steer. The existing ground marker shows the aim; there is no separate mouse crosshair. In Tank mode, mouse aiming can also adjust facing while up/down moves along that facing. Spray distance still uses tap/hold pressure.

Starting or clicking Resume captures the mouse; after a keyboard resume, click the game to capture it again. Pointer lock keeps the cursor inside the game and gives the game keyboard focus. `Esc`, losing capture, or switching away pauses and releases the mouse. The **Mouse aim** switch before starting and in the pause menu is remembered separately. Touch controls do not capture the mouse. Unsupported or denied capture leaves keyboard and mouse-click spraying available. Clicking the playfield fires immediately, independently of mouse capture; after a denial the game stops retrying capture until a new round or an explicit mouse-aim setting change. Screen controls and returning to the game restore canvas focus. Desktop layouts use keyboard and mouse input without on-screen touch controls, including in narrow windows. Mouse aiming overrides aim assist only while actively used; keyboard steering cancels the mouse helper.

**Aim assist** is enabled by default for Direct mode and can be switched off before starting or in the pause menu. While the mouse helper is inactive, firing gently turns the character and stream toward a living enemy within 25 degrees of the requested direction and about nine metres of the player. Obstacles block target selection. A gold ring marks the selected enemy. A valid lock is retained until the enemy dies, leaves range, becomes blocked, or moves more than 32 degrees away from the requested direction, preventing constant target switching or tracking around behind the player. Obstruction checks are batched at 10 Hz. Aim assist does not steer movement, change pressure, extend range, or bend liquid already in flight. Tap near and hold far as usual. The setting is remembered separately from the movement mode and has no effect in Tank mode.

For precise manual keyboard aiming in Direct mode, hold `Shift` with `Left` / `Right` (or `A` / `D`) to rotate in place at any angle, including while spraying. Turning eases into a fast rotation (about a quarter-turn in 0.55 seconds and a half-turn in one second), including while firing. Shift temporarily overrides aim assist. Releasing the direction keys stops rotation immediately. Shift alone stops travel and holds the current aim. `Shift` + `Up` / `Down` (or `W` / `S`) moves slowly forward/backward along the chosen aim without snapping it to a world direction. Normal directional movement and enabled aim assistance resume when Shift is released. Without aim assist, releasing Shift keeps the chosen angle until another movement command. In Tank mode, Shift slows movement and turning for finer adjustments, including while firing. Turns still ease in smoothly and stop immediately on release.

The title screen has one primary action, **PLAY**, and compact keyboard keycaps on desktop. Keyboard hints and movement-mode choices are hidden on devices with a coarse primary pointer. A labelled gear opens **Controls**, containing Direct/Tank movement, aiming switches, sound, and model credits. Existing preferences apply immediately; movement, aiming, and sound choices are remembered for future visits when storage is available. Closing Controls before playing returns to the title without starting the game or capturing the mouse. Press `Esc` during a round to open the same settings and pause, then resume with `Esc` or **RESUME**. Changing modes clears held inputs. The movement cards are native radio groups with keyboard navigation and visible focus.

Tap the left mouse button or `Space` for nearby enemies, or hold to spray farther. The stream follows the character's actual facing direction from beneath his joined hands. On touchscreens, the left joystick always moves in screen directions, including when the saved keyboard mode is Tank. The hero follows the stick and turns quickly toward the requested direction; firing does not slow that turn. Pressing the visible joystick uses its existing centre, while touching elsewhere in the left control area creates a floating stick. The centre stays fixed throughout the gesture, with a small radial deadzone and linear response. Release to stop. Hold the right reticle-and-droplet button with a second finger to spray while moving. Both controls use shapes instead of text, respect safe areas, and support portrait and landscape layouts. Each control owns its pointer, and cancellation, backgrounding, and resizing reset inputs. Hit the approaching enemies to clear waves and earn points.

Game-page zoom is disabled through viewport limits and `touch-action`, with non-passive cancellation of Safari gesture events and multi-touch browser gestures. Single-finger scrolling remains available in settings and overlays. Keyboard movement switches back to the saved keyboard mode, while touch controls do not capture the mouse.

The control arrangement follows the [on-screen stick and button pattern](https://learn.unity.com/tutorial/mobile-controls-and-touch-input); implementation stays in plain JavaScript. Browser gesture handling follows [MDN's touch-action guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action).

Health is shown only above the hero, with a red bar at low health. The header shows wave and score.

The character's axes are aligned, and his legs use a skeleton with hip, knee, and ankle joints.
The character reaches the third-floor windows of the map's buildings. His height is three storeys at 1.15 game units each (3.45 total), using the same storey spacing as the facades. The emitter, collision radius, and liquid thickness match this size. The camera frames his full height, and the running animation follows the distance travelled with a stride proportional to his height. Every district uses the same camera scale: 12 metres high and 15 metres behind the hero, with a fixed view angle and 56-degree field of view (58 degrees on touch devices and narrow windows). This sits between the earlier close harbor view and wider Senate Square view. Map transitions change position without changing the lens, hero size or viewing angle.

## Loading

The entry point uses one version for all game modules. Hero download progress uses the decoded file size from the GLB header, so HTTP compression cannot push it above 100%. The counter stops at 99% during transfer, then shows “Preparing the models…” until all models and the hero rig are ready. Startup errors appear above the start button with a retry button instead of leaving the game on an indefinite loading screen. The local server disables caching for JavaScript, HTML, and CSS. A plain static server still works; use the included server during development to keep modules fresh.

## Liquid stream

A tap sends a short, downward stream about 0.9 game metres from the emitter, making enemies near the feet reachable. Holding fire builds pressure over 1.2 seconds: launch speed and angle increase smoothly until the stream reaches about 8 metres on level ground. Release to return to the short range. The liquid always launches forward from beneath the character's hands and follows a gravity-driven parabola. The glossy surface pulses as it flows, breaks into droplets near the end, and splashes against enemies, walls, and the ground, with expanding rings on the pavement. Its particle capacity covers the full fall from this height; collisions account for obstacle height, allowing liquid to pass above benches and cars.

The ground ring previews the landing point. On desktop, a small ring beside the wave and score fills as holding increases pressure, with the range in metres inside it and no separate panel background. Touch devices keep the spray button and its surrounding radial gauge; its accessible label includes range. The ground marker hides and the radial gauge turns red if an obstacle cuts the trajectory short. Every tap produces at least a 75 ms burst, including clicks shorter than a frame. Ground splashes also damage enemies within about half a metre of the landing point, plus their collision radius; splash damage respects obstacles and shares the direct-hit cooldown.

Liquid already in flight keeps its own trajectory when the character turns or the pressure changes. Releasing fire lets the remaining liquid fall. Collision and damage follow the actual liquid parcels, so the stream stops at the first enemy or obstacle. Every direct hit deals 1 damage at any pressure, while knockback grows from 0.14 to 0.42 metres. Ground splashes deal 60% of direct damage. All three Battery streams share a 0.16-second per-enemy hit interval on the same game clock. Each parcel keeps its launch pressure, so releasing the button never weakens liquid already in flight. The full-pressure stream also looks thicker.

On devices with a coarse primary pointer, the stream keeps its glossy coating and alpha transparency with refraction disabled, avoiding an extra scene render. Empty stream and droplet meshes stay hidden on all devices, and their GPU buffers upload only when they contain visible geometry. These rendering choices do not change the stream's physics, range, or damage.

## City and enemies

The campaign moves from **West Harbor** to **Baana Run** on wave 4, **Kamppi / Narinkkatori** on wave 7, **Aleksanterinkatu** on wave 10, and **Senate Square** on wave 13, returning to West Harbor on wave 16. Each arena district lasts three waves. Baana and Aleksanterinkatu each use one runner course in place of an arena wave block. Finishing Baana and choosing **CONTINUE** enters Kamppi; finishing Aleksanterinkatu enters Senate Square. The five districts then repeat. Between districts, a 1.2-second pixelation and fade hides the scene swap beneath the destination name. Gameplay and input pause during the effect; Esc pauses the transition too. The reduced-motion preference uses a shorter fade without pixelation. Starting the first district and advancing waves within a district remain immediate. Every new district starts at full health and keeps the score; enemies, scenery and pickups reset for the new district while camera scale stays the same. Direct local starts are available for [Senate Square](http://localhost:8000/?map=senate-square), [Kamppi](http://localhost:8000/?map=kamppi), [Baana](http://localhost:8000/?map=baana), and [Aleksanterinkatu](http://localhost:8000/?map=aleksanterinkatu). An unknown `map` parameter uses the normal harbor start.

For map testing, open [the map picker](http://localhost:8000/?debug=maps) with `?debug=maps`. It lists every registered map on the title screen, pause menu and game-over screen. Clicking a map immediately starts a fresh round there at wave 1, without reloading or waiting through earlier waves. New entries in `maps/index.js` appear automatically. The ordinary interface stays unchanged when this parameter is absent.

Senate Square has a broad granite combat area, Helsinki Cathedral with five copper-green domes and a six-column portico, a flight of eighteen steps, the Alexander II monument, the University and Government Palace facades, and the southern Torikorttelit merchant blocks. Eight striped market stalls form two rows with open fighting lanes. A green-and-yellow tram runs along Aleksanterinkatu at the southern edge. The shared camera looks ahead across the square so the cathedral remains visible. The raised stair and church terrace are scenery with solid boundaries; combat stays on the level square and its surrounding alleys. Four medkits and all four Battery cans sit behind the perimeter buildings, with one emergency medkit on the square.

The layout takes its landmarks from the [City of Helsinki's Senate Square history](https://historia.hel.fi/en/alueet/southern/the-senate-square) and [MyHelsinki's square guide](https://www.myhelsinki.fi/places/senate-square/). Distances, market placement and the tram service are adapted for the game.

The cathedral's four porticos, taller windowed drum, Corinthian capitals, twelve rooftop apostle figures, cornices, copper seams, clock faces and central double door draw on the [cathedral's architecture guide](https://www.helsingintuomiokirkko.fi/en/index/historyofthecathedral/thechurchtowers.html). These details are procedural geometry merged into one vertex-coloured mesh; the ground-level combat boundary is unchanged.

Visible bollards and pale edge markings follow every exposed side of the Senate Square boundary, matching the harbor's perimeter treatment. Buildings and the raised terrace mark the closed sections; the tram portals stay clear of posts. The markers sit outside the playable bounds, leaving courtyard pickups and existing routes accessible.

Kamppi includes two connected squares across an 86 × 111.5 metre playable area. Facing the larger shopping centre, the wooden Chapel of Silence stands on the left near the end of Kulttuurikasarmi, and the lattice Entrepreneurs Monument stands on the right. The centre keeps its glazed curtain wall, projecting steel-and-glass canopy, lift shaft and rooftop terrace. The long, two-storey yellow Kulttuurikasarmi stands close to the starting area, with entrance canopies, a cafe terrace and yellow city bikes. Walking around either end leads into Lasipalatsinaukio, with the low white U-shaped Lasipalatsi, orange sun blinds, the white clock/chimney tower toward the chapel side of the courtyard and five tiled Amos Rex skylight hills. A green-and-yellow tram passes behind Lasipalatsi along the far Mannerheimintie edge, immediately before the boundary bollards. The shared camera scale stays unchanged. Building signs, advertisements and metro signs are omitted. Fourteen surrounding buildings fill the skyline outside the bollards, drawing on the [Google Maps satellite layout](https://www.google.com/maps/search/?api=1&query=Narinkkatori+Helsinki): green-glass Simonkenttä, Presidentti, Forum-side stone facades, rear shopping blocks and the Mannerheimintie street wall. A low glazed gallery returns from the mall along the chapel side, defining a narrower granite promenade with planted beds and benches along its edge. A cross street and recessed northern blocks break up the long backdrop, keeping the view from ending in a solid facade. The buildings leave the playable bounds and both tram portals clear, and fade if the following camera enters an outside building.

One medkit stays on Narinkkatori; four medkits and all four Battery cans are hidden behind the mall, chapel, Kasarmi and Lasipalatsi. Both squares and every pickup are reachable by the full-size hero. The skylight hills remain solid scenery with flat combat paths around them.

The Kamppi scenery draws on the supplied street-view references, [the mall and Narinkkatori photograph](https://commons.wikimedia.org/wiki/File:Kamppi_Centre_by_Narinkka_Square_in_Helsinki_Finland_02.jpg), [a street-level chapel photograph](https://enmodoviajero.cl/wp-content/uploads/2020/08/capilla-kamppi-helsinki5.jpg), the [chapel's architecture guide](https://kampinkappeli.fi/en/index/architectureanddesign.html), [HAM's photograph and description of Eva Löfdahl's Entrepreneurs Monument](https://www.hamhelsinki.fi/en/sculptures/yrittajaveistos-entrepreneurs-monument/), and [JKMM's Amos Rex / Lasipalatsi project](https://jkmm.fi/work/amos-rex-museum/). Distances and the street alignment are adapted for gameplay while retaining the order of the landmarks. All meshes and paving are generated locally; reference photographs are not included as game assets.

Baana is an automatic forward run through a former railway cutting, with granite retaining walls, exposed rock, overhead road bridges, cycle markings, murals, trees and city buildings above the route. The game course is shortened to 700 metres, inspired by the [City of Helsinki cycling guide](https://www.hel.fi/en/urban-environment-and-traffic/cycling/cycling-routes), and the scenery follows [this Helsinki City Museum photograph](https://commons.wikimedia.org/wiki/File:Kevyen_liikenteen_väylä_Baana_-_G8541_-_hkm.HKMS000005-km0000n5jx.jpg). It uses the same hero and camera scale as the arena maps, with five recyclable scenery sections and a fixed pool of traffic models.

Aleksanterinkatu replaces the Esplanadi prototype as a separate 640-metre street run before Senate Square. It has **two tram lanes**, with oncoming articulated green-and-cream trams, cyclists and standing scooter riders. Warm stone facades line both sides, with arched shop windows, projecting bays, balconies, cornices, roof dormers and awnings. Cobbles, paired steel rails, overhead contact wires and suspended green lamps follow the supplied Aleksanterinkatu photograph. All scenery is procedural; the reference photograph is not included as an asset. The route is an arcade interpretation rather than a street survey.

Four broad side-street squares interrupt the building rows. A flashing pavement arrow and an on-screen direction warning announce each crossing, then two scooters shoot across the tracks at 15 metres per second. Approaches alternate left and right. Crossing schedules use simulation time and pause with the game; a reset clears the pending events. Longitudinal traffic reserves a clear window around these events, and full tram length is included in spacing and collision checks. Trams block the actual liquid trajectory along their entire body and cannot be destroyed by spraying; cyclists and scooters, including cross traffic, can be defeated as usual. The old `?map=esplanadi` preview link now opens Aleksanterinkatu.

Use **← / →**, **A / D**, a horizontal swipe, or the familiar left joystick to change lanes: three on Baana and two on Aleksanterinkatu. On Baana, cyclists and standing scooter riders approach in green, light blue and red, mixed with parked tractors, orange road cones, red-and-white barriers and excavated road sections. Groups arrive roughly once a second, normally occupying two lanes, giving about three times the original total traffic. Speed increases during the run; arrival spacing accounts for stationary roadworks and oncoming riders so each group leaves an open lane and time to change lanes. Spawn reservations check the full visible path of each rider, not just its starting position: riders cannot emerge from or pass through roadworks. Beside construction, the spawner uses available lanes instead of forcing two occupied lanes. Collisions cost one health point and grant 1.2 seconds of protection. Hold **Space**, the mouse button on the playfield, or the usual right spray button to fire forward while running. The normal ballistic stream and pressure meter apply: a brief hit is enough to defeat a cyclist or scooter rider, including a nearby ground splash; holding extends the range. Cones, tractors, barriers and excavations remain solid obstacles regardless of spray. Riders flash gold on impact like snails, then burst into particles when defeated, without shrinking. On touch devices, the joystick is limited to left/right lane changes in both runners, with the spray button and its radial gauge on the right. Desktop uses the same upper range ring as the arenas. Moving the stick vertically has no effect. On touch screens, the stick and spray keep separate pointers. Score is two points per metre, 25 per cleanly passed obstacle, 150 per defeated rider (with a visible +150 bonus notification) and 500 for reaching the finish. **Esc** pauses, and switching tabs pauses automatically. Arena movement and aim settings are hidden during both runners; score carries into the next district after finishing, and health refills. Only a progress bar is shown during the run, without a distance counter.

The harbour neighbourhood has a 22 × 15 metre cobbled square and a playable area spanning 55.6 metres in each direction. The hero starts beside the silver Verkkopaukka department store with its glass frontage. A continuous road and tram corridor runs parallel to the shoreline along the edge of the square, with crossings connecting the neighbourhood to the waterfront. Red-brick warehouses, a glass ferry terminal, dock cranes, and a broad quay occupy the water side; homes, cafés, bakery windows, and outdoor tables line the inland side. The hero initially faces sideways beside Verkkopaukka. Baltic water surrounds the entire port island, and a white cruise ferry without a name sign sits beyond the quay, and a miniature Clarion Hotel Helsinki with twin silver towers, a glass connection, and a rooftop pool marks the western backdrop. Verkkopaukka retains its red rooftop sign with a white V; other building signs remain omitted. The hotel follows the [architect’s reference](https://dtsa.fi/project/clarion-hotel). The harbor has an open sea backdrop; Baana, Kamppi and Senate Square retain their original fog, while Aleksanterinkatu uses a brighter, longer view down the street. This is a playful interpretation of the harbour rather than a scale reconstruction.

A green-and-yellow articulated Helsinki tram follows the boulevard from west to east, then returns in the opposite direction. Rails sit in a cobbled median between the asphalt traffic lanes, beneath contact wires and cross spans. The first service departs after eight seconds; subsequent services wait 22–34 seconds between trips. Its body blocks walking and the liquid stream, gently nudges actors off the tracks, and updates the enemies' navigation grid as it moves. Buildings and street furniture also have collision boundaries. Enemies navigate around obstacles using a shared navigation grid. The stream cannot pass through obstacles.
Buildings smoothly fade to 12% opacity when they overlap the character's feet, body, shoulders, or head along the camera's line of sight. Walls, roofs, and windows fade together and return to full opacity once the view is clear.

Waves contain snails and Spanish slugs. On waves 1–3, slugs take one direct hit to defeat and snails take two, at any pressure. Health increases by one every three waves: two/three hits on waves 4–6, three/four on waves 7–9, and so on. Waves start with eight enemies and add three per wave, up to 30, so difficulty grows mainly through larger crowds. Higher pressure increases range and knockback; ground splashes still deal 60% of direct damage. Each enemy is worth 150 points. Both enemy models are free and openly licensed: Snail by Poly by Google (CC BY 3.0) and Slug by Poly by Google (CC BY 3.0). Sources, licences, and modifications are listed in [CREDITS.md](./CREDITS.md) and the in-game Models & credits page.

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
- `touch-controls.js`: visible joystick, stable gesture origins, and independent multitouch spray control.
- `gesture-guard.js`: pinch-zoom and Safari gesture suppression without consuming gameplay pointer events.
- `movement.js`: Direct and Tank movement, shared keyboard layouts, analog speed, and collision handling.
- `aim-assist.js`: Direct-mode target selection, stable locks, bounded aim correction, and batched obstruction checks.
- `mouse-aim.js`: pointer lock, aim coordinates, capture lifecycle, and safe keyboard fallback.
- `game-input.js`: pointer-lock-independent mouse spraying and gameplay focus restoration.
- `maps/index.js`: registry, campaign order and direct district starts.
- `maps/harbor.js`: West Harbor layout, bounds, spawn, pickup anchors, and tram behavior.
- `maps/harbor-scenery.js`: cruise ferry, water, dock cranes, and Clarion Hotel.
- `maps/senate-square.js` and `maps/senate-landmarks.js`: Senate Square, cathedral, stairs, monument, merchant blocks and market rows.
- `maps/kamppi-square.js` and `maps/kamppi-landmarks.js`: Narinkkatori, Kamppi shopping centre, Chapel of Silence, Kulttuurikasarmi, Lasipalatsi, Amos Rex courtyard, clock tower and cafe terraces.
- `maps/baana.js`: scrolling rock cutting, bridges and skyline.
- `maps/aleksanterinkatu.js`: two-track street runner, ornate facades, overhead lines, crossing squares, warning arrows and tram collision geometry.
- `maps/ferry.js`: shared procedural ferry, owned separately by each map.
- `runner/course.js`, `runner/runner-input.js`, `runner/track-renderer.js`, and `runner/traffic-models.js`: configurable runner simulation, lane controls, bounded traffic rendering and shared finish line. `runner/baana-run.js` retains the original Baana import API.
- `maps/tram.js` and `maps/scenery-model.js`: shared animated tram and merged scenery geometry.
- `world/map.js`: map instance creation, reset, pickup placement, and resource ownership.
- `world/map-manager.js`: active map replacement and the stable spatial query API used by gameplay.
- `world/navigation.js`: collision, movement, line of sight, and shared enemy routing.
- `world/building-visibility.js`: camera occlusion and building fading.
- `world/map-transition.js` and `world/transition-renderer.js`: simulation-time scene changes and the temporary GPU pixelation/fade pass.
- `world/game-camera.js`: shared camera scale, viewport lens and follow behavior for every district.
- `world/dispose.js`: disposal of map-owned GPU resources.
- `waves.js`: campaign planning, difficulty, clear delay, and wave/reinforcement scheduling.
- `batteries.js`: reusable Battery pickup rendering and collection.
- `enemy-pressure.js`: kill-sensitive reinforcement timing and crowd limits.
- `liquid.js`: ballistic liquid simulation, fluid surface, droplets, splashes, and hit detection.
- `spray-system.js`: owns the centre and Battery side jets, shared power colour, pressure reset and round cleanup.
- `burst-effects.js`: bounded, reusable instanced particles for enemy defeats.
- `docs/project-review.md`: architecture review, verification and priorities for performance and gameplay pacing.
- `enemies.js`: loading and animating the snail and slug models.
- `hero.js`: character rig, animation, and stream emitter.
- `bites.js`: red droplets marking damaging snail and slug bites.
- `medkits.js`: collectible health kits, courtyard placement, and pickup handling.
- `assets/bad-bad-boy.glb`: character without its stand: 30,000 triangles, 21,052 vertices, preserved UVs and a 1024 × 1024 JPEG colour atlas (1,015,852 bytes total).
- `assets/enemies/`: original enemy GLBs with materials and animations.
- `scripts/prepare-model.mjs`: prepare the game GLB from the source model.
- `scripts/optimize-model.mjs`: simplify geometry with meshoptimizer, reorder the vertex cache, compact vertex streams, use 16-bit indices, and encode the texture with Sharp.

## Maps and wave progression

The game uses plain JavaScript modules and Three.js for rendering. Map content is separate from movement, combat, and campaign rules. West Harbor, Senate Square and Kamppi use arena combat; Baana and Aleksanterinkatu use the runner mode. All five are registered in the same campaign and debug picker.

Each map definition provides a unique `id`, a display `name`, rectangular `bounds`, a `spawn` with an optional heading in radians, and `pickups.medkit` / `pickups.battery` anchors. Coordinates use world metres, with Y up and the map root at the origin. An anchor may specify a `jitter` width; placement checks clearance and reachability. Medkit instance capacity is sized for the largest registered map, rather than a harbor-specific count.

A definition's `create()` calls `createMap(definition, build)`. The builder adds only map-owned scenery to the supplied root and returns collision boxes (`minX`, `maxX`, `minZ`, `maxZ`, `height`). It can also supply `buildings` for camera fading, a `dynamicColliders()` callback, `reset()`, and `update(dt, actors, navigation)`. Moving obstacles call `navigation.refresh()` when their occupied space changes; `update` may return a player-facing announcement. Harbor-specific tram rules stay in the harbor module. A runner definition sets `mode: 'runner'`, a `runner` configuration (`length`, optional `riderKinds`, `lanes`, `tramChance` and `crossingPoints`), and supplies `updateRunner(state)`; the runner simulation drives scenery and traffic independently of arena navigation.

Register completed definitions in `maps/index.js`. `createCampaign` follows that order in blocks of three waves by default, then loops back to the first map while difficulty keeps increasing. `wavesPerMap` can be set when constructing the campaign; map rotation is independent of enemy health progression. With only one registered map, every wave remains in West Harbor.

`createWaveDirector` advances only after a wave stays empty for 1.4 seconds and manages reinforcement pressure. It receives simulation time from the existing game loop, so pausing cannot trigger a delayed wave. Restart begins at wave 1 and clears both the transition delay and reinforcement pressure. `completeMap()` advances a finished runner directly to the next district block.

`game.js` coordinates a map transition at a wave boundary: keep score, restore full health, clear active attacks and effects, reset Battery power and inputs, place the player and camera at the new spawn, refill that map's pickups, then spawn the new wave. Pickups stay consumed between waves on the same map. Restart resets the current map or returns to the campaign's first map.

The map manager prepares and validates a new map before replacing the old one. Its query functions always address the active map, so streams, aim assist, movement, and pickups cannot retain stale collision data. Removing a map disposes its owned geometries, materials, textures, and instance buffers exactly once; hero, enemy templates, and reusable pickup assets live outside that root. This follows [Three.js resource disposal guidance](https://threejs.org/manual/pages/how-to-dispose-of-objects.html).

Run the tests with Node 24 or newer:

```bash
node --test
```

The suite checks real harbor navigation and tram behavior, map replacement with different bounds, GPU disposal events, pickup relocation, safe spawn fallback, campaign rotation, restart timing, runner collision and safe routes at multiple refresh rates, swipe/button input, and runner traffic-pool disposal. New map geometry should also be inspected in the browser.

## Prepare the character model

The game model was derived from `bc222867938641be8050f747614e5d34.glb`. The source file incorrectly assigns its 8000 × 8000 colour atlas as a normal map. The preparation script reassigns it to base colour, removes the stand and separate plane, and aligns the model for its skeleton. It then automatically optimizes the result: 305,625 → 30,000 triangles, 183,001 → 21,052 vertices, and a 1024 × 1024 JPEG atlas instead of the intermediate 2048 × 2048 PNG. This reduces the game GLB from 18,326,612 to 1,015,852 bytes (94.5% smaller). UVs and normals are retained; simplification also accounts for hip, knee, and ankle weight transitions. The material, skeleton coordinate frame, and stream origin stay compatible with the game. The output is a standard GLB with no runtime compression decoder required.

To prepare it again, install Node.js and the development dependencies:

```bash
npm ci
npm run prepare-model -- /path/to/bc222867938641be8050f747614e5d34.glb
```

Normal gameplay uses the prepared GLB and does not require installing dependencies.

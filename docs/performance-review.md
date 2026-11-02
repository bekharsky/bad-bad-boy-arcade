# Performance review

This is a list of places to measure and optimize next, ordered by likely player impact. It is a code review, not an FPS benchmark. A one-pass Node.js diagnostic on this machine created each map with a stubbed canvas and counted scene meshes, including hidden traffic variants:

| District | Map creation | Mesh nodes |
| --- | ---: | ---: |
| West Harbor | 140 ms | 114 |
| Baana | 65 ms | 536 |
| Kamppi | 207 ms | 66 |
| Aleksanterinkatu | 207 ms | 646 |
| Senate Square | 101 ms | 69 |

These timings exclude GPU upload and vary by device. Mesh nodes are not draw calls. Measure map-transition frame time, `renderer.info.render.calls`, GPU time and memory in a browser before changing the rendering strategy.

## 1. Runner traffic variants and scene size

`runner/track-renderer.js` creates every colour and model variant in each of 24 traffic slots. Baana has ten variants per slot; Aleksanterinkatu has seven. Only one variant is visible in a slot at a time, but the copies increase map construction, scene traversal and memory pressure. Pool slots by model kind or swap shared geometries into a smaller set of visible objects. Keep the independent hit flash material and tram articulation behavior.

## 2. Map transition stalls

`world/map-manager.js` constructs the complete next map synchronously. The local diagnostic took about 200 ms for Kamppi and Aleksanterinkatu before GPU upload. `maps/aleksi-paving.js` also regenerates two 512 × 512 RGBA textures each time Aleksanterinkatu is entered. Cache immutable geometry and textures with explicit ownership, or prepare the next district in stages before the swap. Keep the existing map disposal guarantees and verify memory does not climb after repeated loops.

## 3. Mobile GPU cost

`game.js` allows device pixel ratio up to 2, enables antialiasing and uses a 2048 × 2048 shadow map on every device. On a high-density phone, shading and shadow work may dominate even if simulation is cheap. Measure frame time on a real phone, then try a lower pixel ratio and 1024 shadow map for a mobile quality tier. Compare screenshots so houses and characters stay readable.

## 4. Arena crowd update

`arena-combat.js` compares every active enemy with every other enemy on each simulation step. The crowd limit is 48, so a full crowd can reach about 2,300 separation checks per step, before pursuit and collision queries. A small spatial grid could restrict separation to nearby enemies. Profile first, and preserve the current behavior around narrow paths and grouped geese.

## 5. Building fade checks

`world/building-visibility.js` tests five sight lines against every registered building on each rendered frame. It also changes material transparency and marks materials for recompilation when a house starts or stops fading. A distance or screen-space broad phase and skipping unchanged camera/player positions may reduce work. Test roofs, balconies and runner bridges from multiple camera positions before reducing samples.

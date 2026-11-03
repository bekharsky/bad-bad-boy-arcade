# Performance

Graphics preparation runs before PLAY becomes available and under cover when
changing districts. It compiles canvas and linear offscreen shader variants,
including hidden effects, enemy models and fading buildings. The simulation
waits for preparation and discards that time instead of catching it up. Empty
liquid meshes briefly activate the refraction buffer during preparation, then
return to their hidden state. Two hidden enemy representatives retain shared
programs across districts. Shader diagnostic queries remain enabled in development.

Desktop refraction uses a half-width, half-height scene buffer: 75% fewer pixels
in that additional pass. The main canvas retains its existing resolution,
antialiasing, shadows and geometry. Touch devices still skip refraction.

## Local comparison, 3 November 2026

Compared production builds of `1c504bb` and the preparation changes in Chrome
on an Apple M5 Pro, at 1440 × 900 CSS pixels and device pixel ratio 2. Each sample
started West Harbor and held fire for four seconds with seeded randomness.

| Measurement | Main | With preparation |
| --- | ---: | ---: |
| Longest frame interval | 64.1 ms | 9.5 ms |
| Frame intervals above 25 ms | 2 | 0 |
| Median frame interval | 8.3 ms | 8.3 ms |

The original run blocked on GPU shader diagnostic queries after starting.
These queries did not occur during the modified production run. Three complete
cycles of manual district changes left the same Harbor resource counts:
112 geometries, 15 textures and 94 programs. Pause/resume and mobile rendering
were checked separately. These are local checks, not an M2 performance guarantee.

## Remaining profiling work

- Validate startup, crowds, sustained spraying and frame-time peaks on the
  reported M2 and on a phone. Compare the same scenes and input sequences.
- District geometry is still built synchronously. Aleksanterinkatu regenerates
  its paving textures on entry. Profile construction separately from shader
  preparation before adding staged building or texture caching.
- Arena separation still compares enemies pairwise. Introduce a neighbour grid
  only if a crowd profile points here, preserving movement in narrow passages.
- Building sight checks and navigation refreshes for moving trams remain
  candidates for CPU profiling. Verify occlusion from several positions before
  reducing their frequency.

Keep gameplay balance changes separate from performance measurements.

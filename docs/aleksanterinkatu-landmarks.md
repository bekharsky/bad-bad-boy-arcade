# Aleksanterinkatu landmarks

The starting checkpoint is `62ff149` on `bekharsky/aleksanterinkatu-runner`. The worktree was clean before this refinement.

The route runs west to east. North is on the player's left. Landmark sides and relative order follow the street; frontage lengths and gaps are compressed to keep the 640-metre arcade course and its four crossing events. This is a stylised reconstruction, not a surveyed model.

| Landmark | Location | Details used | Primary reference |
| --- | --- | --- | --- |
| Stockmann department store | Aleksanterinkatu 52, south | Brown brick, vertical bronze window bays, upper window bands, pitched roof and dormers, canopy and projecting clock | [Finnish Architecture Navigator](https://www.finnisharchitecture.fi/projects/stockmann-department-store), [project architect's photograph](https://blocherpartners.com/media/pages/projekte/stockmann-helsinki/6e74a1d638-1706710522/header-1900x800-crop-q90.webp) |
| Pohjola Insurance building | Aleksanterinkatu 44, south | Rough stone lower facade, tall rectangular windows, arched portal, simplified carved animal masks and copper corner helmet | [Finnish Architecture Navigator](https://www.finnisharchitecture.fi/projects/pohjola-insurance-company), [corner photograph](https://www.finnisharchitecture.fi/uploads/fa/Pohjola_9.jpg) |
| Lundqvist / Aleksi 13 | Aleksanterinkatu 13, north, opposite Pohjola | Red brick piers, broad glass shop bays, upper arches, pointed roof details and corner turret | [Finnish Architecture Navigator](https://www.finnisharchitecture.fi/projects/lundqvist-commercial-building), [owner's renovation photographs](https://www.ilmarinen.fi/ajankohtaista/blogit-ja-artikkelit/2024/aleksanterinkatu-13-uudistui/) |
| University of Helsinki Main Building | Unioninkatu 34, north before the square | Yellow plaster, white horizontal bands and window surrounds, six-column square-facing portico | [Finnish Architecture Navigator](https://www.finnisharchitecture.fi/projects/helsinki-university), [restoration architect](https://ark-lpr.fi/en/projekti/university-of-helsinki/) |
| Sederholm House | Aleksanterinkatu 18, south by the square | Low two-storey blue-grey facade, white pilasters and window balustrades, dark mansard roof with dormers, central pediment | [Helsinki City Museum](https://www.helsinginkaupunginmuseo.fi/en/exhibitions/childrens-town/), [City of Helsinki photograph](https://historia.hel.fi/fi/media/kuva/sederholmin-talo-0) |

The City Museum's visitor address is Aleksanterinkatu 16; the individual Sederholm House is number 18. Reference photographs are used for research only and are not distributed as game assets. All new geometry is generated locally. Facade lettering and shop signs are omitted.

`maps/aleksi-landmarks.js` owns the individual models and their reserved frontages. The generic facade builder subtracts these spans before filling the remaining blocks, so buildings do not overlap or close the final waterfront opening. Side elevations have windows too. The end-of-street vista is a deliberately compressed arcade waterfront: a broad quay, rail buffers, lamps, terminal and cruise ferry. The cathedral remains on the separate Senate Square map.

Geometry remains merged by building, within the 563,701-vertex budget of checkpoint `62ff149`.

The map tests check landmark sides, the opposite Pohjola/Lundqvist pair, lane clearance, the low Sederholm roofline, non-overlapping frontages, open crossing corridors, the geometry budget and exactly-once resource disposal. Existing runner tests continue to cover safe routes at 15/30/60/120 FPS, tram collision, lateral scooter events and changes between braking and boosting. Cross-street road spans replace the longitudinal surface instead of overlapping it; warning arrows pulse smoothly and are the sole crossing notifications; runner toasts are hidden. Both runners accept vertical joystick and W/S or arrow-key speed input (45–150% of cruise), with a smoothed camera lens and hero lean following achieved speed, and dodging riders awards 150 points compared with 50 for spraying them. Visual checks use the actual game camera, lights, hero scale and renderer.

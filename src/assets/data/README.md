# Facility map positions

`facilities.json` maps the 53 numbers in the supplied NEUST Sumacab official campus diagram to the interactive Leaflet map.

The app also adds a separate **Campus Entrance** destination from `campus.entrance`. Its `E` pin is not an official map number. With live location, the same mapped path network guides a user from inside campus toward this gate.

- `positionSource: "osm"` means the point comes from the center of a named OpenStreetMap feature near campus. These are building or site centers, not surveyed entrances.
- `positionSource: "official-map-estimate"` means OpenStreetMap did not identify that numbered facility. The point is an approximate placement inferred from nearby named features and the supplied numbered diagram. Check it on site before relying on it for navigation.

Map #6, #14, and #15 were aligned with separate, unnamed OpenStreetMap building outlines near the named Metal Innovation Center and University Canteen, using their relative positions on the supplied official diagram. Those building identities are inferred; the coordinates remain estimates until checked on campus.

Map #7, #8, #9, #26, #27, #28, and #31 were similarly moved from open space or an unrelated footprint onto buildings matching the diagram's relative order. OpenStreetMap does not identify these individual facilities by those numbers, and its name for the footprint used by #28 differs from the campus diagram. Verify these pins with a campus survey before treating them as exact entrances.

The later annotated reference identifies the detached upper criminology building as **Building A (#26)** and the long lower building as **Building B (#27)**. This corrects the earlier A/B labels in the data. Pins #31–#34, #36, #39, #44, #47, and #51 were aligned to their corresponding building footprints after checking the supplied diagram against nearby OpenStreetMap geometry. Unnamed footprints remain estimates. The quadrangle pin (#35) indicates an open area rather than a building.

A further marked campus screenshot places #31 on the upper Graduate School footprint, #32 on the adjacent narrow Nieto Hall footprint, #34 on the Gender and Development Center footprint west of Dubat Street, and #35 in the green quadrangle. It identifies the previous #32 footprint as College of Education (#36) and the previous #34 position as Quality Assurance (#41). #20 was moved to the center of the OpenStreetMap building named IPE. The numbered identities in this paragraph come from the supplied campus reference; unnamed OpenStreetMap outlines do not independently confirm them.

`campus-paths.json` contains an OpenStreetMap extract of nearby paths, service roads, residential streets, and highway segments around the entrance. `scripts/build-campus-paths.cjs` regenerates it from an OSM XML extract. The app finds the shortest connected path from live GPS when the position is close enough to this network. Without GPS, numbered facilities preview a route from the entrance; routing *to* the entrance needs GPS. When no mapped route connects, a dashed direct guide shows direction only. Short links from a road to a building center may cross an area that has no mapped path. Check crossings and access on site; this is not turn-by-turn or accessibility guidance. The entrance position was estimated from the supplied screenshot and needs an on-site check.

The bundled path extract covers the OpenStreetMap bounding box `120.935,15.438,120.948,15.452` and was generated from `https://api.openstreetmap.org/api/0.6/map?bbox=120.935,15.438,120.948,15.452`.

OpenStreetMap feature data: https://www.openstreetmap.org/copyright

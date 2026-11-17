# PATH Atlas — source matrix and verification gates

| Source | What it can provide | Can it power real indoor routing? | Rights/status |
|---|---|---|---|
| OpenStreetMap `shop`, `amenity`, `indoor`, `level`, `entrance`, `conveying` | Community POIs, named building outlines, sometimes indoor floor tags and entrance candidates | **No without further verification of exact PATH affiliation, geometry, connectivity and rights** | ODbL 1.0, attribution/share-alike as applicable |
| City of Toronto PATH network map, January 2026 | Names, schematic connected buildings, broad network research | **No**: not surveyed indoor walkable centerlines; map reproduction/alteration requires permission | City copyright, written permission stated |
| Mappedin PATH example and user screenshots | Interaction and visual design reference only | **No**: no data licence obtained | Mappedin proprietary map/data |
| Google Maps JS | Geographically grounded outdoor street context, user pan/zoom, approximate buildings | **No**: not a surveyed indoor navigation data source | Google APIs/ToS, browser key restrictions |
| Royal Bank Plaza official directory | Four named businesses with venue listings | **No**: floor, doors and specific units not surveyed | Official directory; link to sources |
| Venue survey / lawfully licensed floor plans | Correct room polygons, entry and stair/elevator geometry, floor labels, corridor centerlines | **Yes only after QA and source registry approval** | Written redistribution, maps/access restrictions, field verification |

## Before allowing a surveyed route

- Property owner or data provider permission to use **and redistribute** the exact dataset.
- Independent source and review date for every node and edge, surveyed coordinates with floor and building identifiers.
- Validated topology, direction restrictions, elevator/stair/escalator semantics, accessibility truth values; closed edges removed.
- Geometric polylines follow walkable corridors, not center-to-center building lines or arbitrary building outlines.
- Operational hours, closure freshness, and user feedback/field QA; explicit limitation where unknown.
- Source-based distance; do not fabricate ETA, route availability or the nearest exit.

## Area represented by the supplied screenshots

- Northern: Eaton Centre / Dundas and Queen corridor, retail upper/underground floors.
- Central: First Canadian Place, Bay Adelaide, Royal Bank Plaza, Financial District shopping and washroom facilities.
- Southern: Union Station, York Concourse, Bay Concourse and transport connections.

The optional OSM bbox is a **study rectangle**, not an official PATH-exclusive boundary. It may include above-ground shops not connected to the PATH and may miss underground retail units not present in OSM. Floor tags `-0.5`, `-1` and `-2` are shown when present, without assuming all properties share floor numbering.

# PATH indoor data: provenance, acquisition and licensing gate

## Authoritative reference sources (reviewed November 2026)

- **City of Toronto**: [PATH visitor page](https://www.toronto.ca/explore-enjoy/visitor-toronto/path-torontos-downtown-pedestrian-walkway/) links the **January 2026** PATH network PDF (v.2026.01). The PDF states: **"Any reproduction, distribution or alteration of this map requires written permission from the City of Toronto."** It contains useful schematic connections and names, not surveyed 3D floor footprints. **No raster, map traces, or geometry from this PDF can be committed without permission.** Contact the City / Financial District BIA to request precise routing geometries and licence terms. City states PATH segments are owned and controlled by individual property owners.
- **Mappedin**: [Toronto PATH reference](https://www.mappedin.com/map-gallery/path-map-toronto/) and [SDK getting started](https://developer.mappedin.com/web-sdk/getting-started). SDK access to your own map requires a Pro licence; the live map is neither a downloadable dataset grant nor a redistributable mapping licence. Ask Mappedin whether a lawful API/licensed data partnership is possible. Never scrape tiles, maps, screenshots or private APIs.
- **Royal Bank Plaza**: [operator site](https://royalbankplaza.com/food-and-drinks) supports directory-name/category discovery. Leasing floor plans on the property website do **not** imply a right to publish interiors as routing geometry. Need explicit operator permission or an original commissioned survey.
- **OpenStreetMap**: [Simple Indoor Tagging](https://wiki.openstreetmap.org/wiki/Simple_Indoor_Tagging). Evaluate indoor PATH coverage and the ODbL, including attribution, databases/derivatives and source permissions, before any import. No OSM corridor geometry is included today.

## Preferred first pilot: Royal Bank Plaza ↔ Union Station area

Why: recognizable existing project references, a documented public connection, venue contact, and a small enough area for source collection and fieldwork. **This is a candidate for data acquisition, not an already surveyed, verified route.** Partner with the relevant property managers and transit operator; do not presume a public walkway exists along any particular line or on any specific floor.

## Required per-feature licence / evidence record

- **Venue and origin:** legal owner, data supplier, copyright/DB licence, precise scope, redistribution/derivative map permission, attribution obligations, expiration/revocation.
- **Geometry:** WGS84 location or surveyed floor-to-street transform; interior polygon and corridor centerline/width, connecting node endpoints within tolerance, unit/door boundaries, georeferencing QA.
- **Floor:** official floor ID/level, vertical coordinates or clearly marked schematic elevation, transition type, linked destinations, direction of travel.
- **Accessibility:** independently observed elevators, accessible ramps, barriers, one-way rules and currently unknown statuses; unknown never treated as accessible.
- **Operations:** restricted/public hours, reviewed date, source contact, real-time closure feed where possible, last known operational state.
- **Validation:** original source reference and QA reviewer, spot field survey, connectivity/island tests, actual walk-time/distance sample checks.

## Release gate

Never set `routable_geometry_provided=true` and `redistribution_authorized=true` in `data/indoor/source_registry.json` unless written permission or a compatible licence has actually been obtained and reviewed. The code requires these flags for real nodes/edges. No amount of editing JSON can independently make a data source accurate or legally reusable. Ship a pilot only after permission, field validation, QA, risk review and public-data maintenance arrangements are established.

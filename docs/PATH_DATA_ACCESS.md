# PATHway Toronto — legal data access and route verification plan

_Reviewed 2026-11-16. Research document; no routing permission is asserted._

## Public references and what they **do not** give us

1. **City of Toronto / Financial District BIA, January 2026 simplified PATH network**: https://static1.squarespace.com/static/60466adde21fa469e3679ee3/t/698a2a06c60443326eefb1f2/1770662407020/PATH_AccessibleOnlineMap_Simplified_v2026.01.pdf . The schematic identifies named PATH areas. The map explicitly says reproduction, distribution and alteration require written permission. Neither a licence for digitizing corridor coordinates nor an indoor-floor routing graph is provided.
2. **City PATH visitor information**: https://www.toronto.ca/explore-enjoy/visitor-toronto/path-torontos-downtown-pedestrian-walkway/ . Background and contacts, not line-by-line surveyed routing.
3. **OpenStreetMap Simple Indoor Tagging**: https://wiki.openstreetmap.org/wiki/Simple_Indoor_Tagging . Defines levels and interior tags but does not guarantee Toronto PATH completeness. Data is under ODbL; attribution and downstream database/share-alike obligations may apply (https://www.openstreetmap.org/copyright). Evaluate quality, permitted use and actual available elements before any import. Do not convert every OSM `indoor=corridor` into a verified route without surveying connections.
4. **Royal Bank Plaza tenant listings**: https://royalbankplaza.com/food-and-drinks . A store listed inside the building is not a spatially located door, accessible route or surveyed floor. Store-specific source links can support a search directory, but not indoor directions.
5. **Mappedin example**: https://www.mappedin.com/map-gallery/path-map-toronto/ . Interface inspiration only. No proprietary data, graphics, 3D assets or source code copied.

## Obtain an actually routable pilot dataset

1. Choose a **small connected pilot area** around Royal Bank Plaza and Union Station, subject to permission. Do not promise these places have a fully indoor connection until reviewed.
2. Ask property managers, venue operators, City/BIA and mapping providers for **explicit use/redistribution rights** to floor-specific corridor centerlines (or permission for an independent survey), entrances, doors, elevators, ramps and stairs.
3. Validate coordinate reference system, each floor's level convention, graph junctions, connectivity, walking restrictions, closure/hours status, accessible routes, and survey date. Record per-feature provenance.
4. Require independent on-site confirmation before labeling any route suitable for real-world use. Retain a documented reviewer, verification date, licence and geometry QA results.
5. Import *only* approved data into `data/indoor/indoor_graph.json` after source-registry flags (`routable_geometry_provided`, `redistribution_authorized`) are reviewed and true; run backend tests and spatial QA. **Never** promote the separate fictional 3D/demo graph.

## Acceptance blocker

Currently: **zero** independently verified, licensed indoor walkway edges. The API must keep responding `DATA_NOT_AVAILABLE` for real indoor-only queries, including CIBC Square to Nathan Phillips Square. No reliable closest exit, distance, time, or accessible route can be inferred.

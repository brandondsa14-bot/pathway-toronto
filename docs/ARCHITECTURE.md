# Architecture and research boundaries

## Current implementation (Day 01)
- Frontend: Next.js / React / TypeScript, accessible selectable SVG schematic, searchable locations, client-side graph traversal and route highlighting.
- Backend: Python FastAPI, public health, places, and demonstrative route endpoints with pytest tests.
- Current frontend works independently of backend. Integration is a later milestone.
- All geometry, street labels, building marker placements and graph connections in the app are **illustrative synthetic demo data**. **DO NOT USE FOR REAL NAVIGATION.** The map isn't georeferenced, does not use the Google Maps API yet, and does not calculate physical distance/time.
- Official Royal Bank Plaza directory names Mos Mos Coffee in the lower concourse north of the food court. The site demonstrates this verified *listing*, but not a verified physical pin.

## Production target
Next.js frontend ⇄ FastAPI ⇄ PostGIS (geographic buildings, floors, nodes, edges, tenant footprints, verification sources). 3D scenes later stored as original optimized GLB assets. Use Dijkstra/A* with access restrictions, floor levels and verified corridor edges.

## Data integrity
Record source URL, observed_at, verified_at, reviewer, status, floor, building and provenance for every surveyed spatial feature and tenant. Never promote unverified drawings to routable edges. Keep business directory verification distinct from geometry verification. Avoid unauthorized imagery/assets. No API secrets in Git.

## Official research sources
- City Toronto PATH map https://www.toronto.ca/wp-content/uploads/2024/01/94dd-PATH-Basemap-2023-12-FINAL.pdf
- Royal Bank Plaza directory https://royalbankplaza.com/food-and-drinks
- Royal Bank Plaza building information https://royalbankplaza.com/building-info

## Next scope
Day 02 improves design/accessibility; Day 03 implements Google Maps with client-managed billing and key restrictions; Day 05 adds relational persistence; Day 06 starts transcribing *verified* anchors and individually corroborating interior connections.

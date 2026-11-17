# Day 28 — Map-first Verified PATH explorer

The previous evidence panel was accurate about data limitations but too small to explore. This update makes **Verified PATH** the full-width workspace while retaining Street View, legacy schematic, the explicitly fictional 3D demo, and the original directory in the other tabs.

## Mappedin comparison

- **Spatial realism:** outdoor Google basemap gives actual city context; interior footprints are NOT available and are not fabricated. The scene feed draws only licensed reviewed lines; 3D orbit view is disabled without such lines.
- **Navigation:** side panel permits selectable starting/destination places, preferences, result details, and correct no-data response. Clicking a reviewed map node selects an endpoint; clicking a map floor location requires a validated `/snap` response.
- **Discovery:** searchable landmarks and venue-listed businesses, source links and category filters; exact unverified business locations have no map pins and have disabled Navigate Here.
- **Map tools:** Google zoom/pan/tilt where supported; distinct reviewed floor switcher (no fictional floor levels), 2D city context and conditional 3D orbit controls.
- **Mobile/keyboard:** mobile bottom sheet, semantic controls, labelled map selectors, visible focus ring, reduced-motion support, explicit loading/error status.

## Validation

```sh
cd frontend && npm run lint && npm run build
cd ../backend && source .venv/bin/activate && python -m pytest -q
```

In Chrome at http://localhost:3000: select Verified PATH. Search CIBC Square and Tim Hortons, switch Discover/Directions, test category filters and official links; request CIBC Square → Nathan Phillips Square. Expect `DATA_NOT_AVAILABLE`. The floor selector must report no surveyed indoor floors; Indoor 3D must be disabled, with the live street basemap visible when configured. Check each legacy tab for regressions. On a narrow viewport verify the bottom sheet and accessible keyboard tab order.

**Do not confuse the original hallway demo with the spatially accurate verified map.** It remains under a separate, clearly labelled demonstration tab.

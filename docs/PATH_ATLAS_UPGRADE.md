# PATH Atlas upgrade — source-first navigation and discovery

**Status:** a functional map/data integration upgrade, **not** a complete surveyed Toronto PATH navigation dataset. This upgrade uses an original map UI and optional OpenStreetMap community data, not any Mappedin proprietary assets, map tiles, POI exports, or route geometry.

## What changed

- The former `PATH layer` button now opens the **PATH atlas**: a full-width geographically oriented Google Maps explorer. `Verified routes` opens the same evidence-aware map with the directions pane selected. The synthetic six-place network was **moved into a separate `Synthetic demo` tab**, and the fictional 3D corridor remains under `3D demo`.
- An explicit, one-time OpenStreetMap import (`tools/import_osm_path_candidates.py --fetch`) can collect downtown Toronto candidate POIs, named buildings and OSM polygons within the **Union–Financial District–Eaton Centre screenshot area** (`43.6405,-79.3960,43.6630,-79.3680`). The screen exposes categories for shopping, restaurants, cafes, banks, washrooms, escalators, stairs, elevators, subway entrances, transit and more **where OpenStreetMap has entries**.
- OSM sources appear as searchable directory entries and map markers. Clicking a marker opens its description/source. Available OSM polygon shapes render as **community-mapped outlines** over street context, and in a separate stylized **OSM 3D preview**, with orbit controls. No invented stores/walls/floor plans are added.
- Floor options include **−0.5, −1, −2**, regardless of the current dataset. Items only appear on a specific level if the OSM record includes that exact level. A floor label from OSM is **not** a vetted PATH floor mapping.
- Clicking the map places an approximate **proposed start or destination pin**; both can be dragged. Without verified indoor walking nodes this **never** silently becomes an indoor routing endpoint.
- The verified graph now permits **source-reviewed half-floors**, and source-supported routes produce direction-correct step instructions and actual geometry-derived left/right turn cues and interior bend cues. No street names are made up; named corridors appear only if supplied in reviewed edge data.
- Adds a separate OSM exploration API, licensing metadata, generated-data validation, importer and regression tests. **OSM candidate records never enter the verified routing graph.**

## Supported routing behavior

If the verified corridor dataset contains a reviewed and licensed graph, selecting routable endpoints can return a path over **actual surveyed edge polylines**, floor transitions, closures/one-way/accessibility restrictions and turn-by-turn cues. A user can then select nodes or snap a pin within the reviewed network.

**Currently**, the graph has **zero verified corridor edges**. Example CIBC Square to Nathan Phillips Square must still return `DATA_NOT_AVAILABLE`, not a fake line, false exit or made-up turn sequence. Actual travel directions are blocked until venue data, surveying, licence review and route QA are complete.

## One-time community-data import

From your Mac's repo root:

```bash
cd ~/Downloads/pathway-toronto
python3 tools/import_osm_path_candidates.py --fetch
```

The importer requests **one** cached Overpass response, validates/normalizes the data and writes `data/indoor/osm_candidates.json`. That JSON is **gitignored**. It will not make network requests during routine API requests or while drawing the website. Restart/refresh your FastAPI/Next.js pages after import if needed.

If the public API is overloaded or returns HTTP 429, wait and retry later, or export the same area and tags using Overpass Turbo to a local JSON file and run:

```bash
python3 tools/import_osm_path_candidates.py --from-file ~/Downloads/overpass-export.json
```

The directory is inherently incomplete if OSM coverage is missing or outdated. The current screenshot is a reference, **not** a lawful coordinate dataset. Only attributes genuinely present in OSM are returned. Retail unit geometry, operator-supplied floor assignments, temporary closures and actual entrances cannot be inferred from brand names or map screenshots.

## API

- `GET /api/v2/indoor/explore`: OSM search and filtering. Optional `q`, `category`, `scope`, `level`, `limit` query parameters. All records include a stable source URL, source and attribution, `COMMUNITY_MAPPED_UNVERIFIED`, and positional quality (`OSM_POINT` or `OSM_FEATURE_CENTROID`).
- Existing `/coverage`, `/scene`, `/snap`, `/route`, and `/catalog` retain their evidence-gated behavior.

## Exact acceptance tests (Mac)

1. Import the OSM candidate snapshot. Verify the resulting output count is nonzero. For an empty/failed import, UI must clearly say no OSM snapshot, not pretend stores are mapped.
2. Launch backend on port 8000 and frontend on port 3000; navigate to **PATH atlas**, search `Tim Hortons`, `washroom`, `escalator`, `Eaton` or another mapped POI in the snapshot. Search results must match available OSM/community attributes; no results must be shown for unsupported data.
3. Filter **Food, coffee, fashion, shopping, grocery, subway entrances, washrooms, escalators** etc. Select any returned location; a marker should be identifiable on the city map if its coordinates are among the currently rendered candidates, and the OSM source should open.
4. Switch between **All**, **−0.5**, **−1**, **−2**. Only OSM records explicitly tagged with each level appear; no automatic level copying or fake interiors. Where OSM polygons exist, try `OSM 3D preview` and rotate/zoom; it must say it is unverified.
5. Open **Verified routes**. Click `Set starting point` then map click; switch to `Set destination` and click a different location. Drag either marker. They are proposed map positions only; no PATH route is claimed until snapped to reviewed graph nodes.
6. Ask for CIBC Square → Nathan Phillips Square. Expect `DATA_NOT_AVAILABLE` in current dataset, no invented path/time. Test accessibility restrictions. Verified 3D remains disabled while `feature_count=0`.
7. Open **Synthetic demo** and **3D demo** to confirm they are still available and labelled as demo, separate from the real map.
8. Test small viewport, keyboard focus, source links, and Chrome DevTools console. Run backend tests, frontend lint/build and npm audit. Validate no `.env.local` or real Google API key in Git.

## Data limits, privacy and rights

- **OpenStreetMap:** © OpenStreetMap contributors, Open Database License (ODbL). Follow attribution and any database redistribution/share-alike terms. See https://www.openstreetmap.org/copyright . Conduct licensing review for commercial use and combined databases.
- **Overpass:** public Overpass instances have limited capacity; use a caching, compliant import and a production data provider or managed extract for a public deployment.
- **Google Maps:** browser key is necessarily visible to end users; protect it with HTTP referrer and Maps JavaScript API restrictions in Google Cloud; never commit `.env.local`.
- **Mappedin screenshots:** UI inspiration only. No reproduced venue polygons, place coordinates, proprietary assets or API calls.
- **Toronto official PATH map:** research reference, not automatically licensed for reproduction/re-geometry; its copyright notice requires written permission for reproducing, distributing or altering the map.
- **Verified PATH** must only accept independently surveyed, properly licensed corridor, vertical connector and store entrance/floor data after physical validation. GPS does not establish a reliable indoor floor.

## Remaining blocker to an investor-ready, live navigation product

A working backend cannot manufacture the missing real-world facts. To reach reliable turn-by-turn indoor navigation (including CIBC Square → Nathan Phillips Square), obtain venue-approved floor plans, interior walking centerlines, legally reusable store/unit footprints and POI metadata, surveyed entrance nodes and level connections, operational hours/closures, and accessible path status; field-test routes on site. A smaller fully verified pilot should precede Toronto-wide claims.

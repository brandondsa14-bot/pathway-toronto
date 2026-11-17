# Session 6 acceptance and regression tests

The expected real-world production outcome is **no mapped indoor corridor**, not a manufactured route. Check all items manually in addition to automated tests.

## Source / API gate

- [ ] `python -m pytest -q` passes (includes source licensing, map pin snap, known closed edges, floor transitions, CORS tests).
- [ ] `GET /api/v2/indoor/coverage` returns `verified_edge_count:0`, `available_levels:[]`.
- [ ] `GET /api/v2/indoor/scene` returns `NO_LICENSED_INDOOR_GEOMETRY`, `feature_count:0`, `can_place_pin:false`.
- [ ] `GET /api/v2/indoor/snap?lon=-79.38&lat=43.646&level=-1` returns `NO_VERIFIED_WALKING_AREA` and null node.
- [ ] CIBC Square → Nathan Phillips Square returns `DATA_NOT_AVAILABLE`, `route:null`, no fake travel time or exit.
- [ ] Unknown business id used as a route endpoint returns HTTP 404 `UNKNOWN_PLACE`.

## Desktop (Chrome)

- [ ] Verified PATH is map-first across the available width. The original sidebars do not squeeze its map.
- [ ] Live Google street basemap loads with a restricted key, or a clear configuration fallback appears.
- [ ] Search `Tim` finds a venue-backed listing, selects Tim Hortons, shows Royal Bank Plaza and working official links.
- [ ] Coffee & cafés vs Fast food filters show relevant catalog entries.
- [ ] No exact unverified business points on the map; Navigate Here disabled for unverified stores.
- [ ] Floor picker honestly says no surveyed floor plans; no invented levels.
- [ ] The Indoor 3D view is disabled until verified spatial data is loaded, while the old 3D hallway remains under the **3D demo** tab.
- [ ] Directions panel includes From, To, Swap, accessible and floor-change preferences; unavailable route status announced without fake geometry.
- [ ] Click other views (Street, PATH demo, 3D demo), confirm older behavior and labels retained.
- [ ] Inspect Chrome DevTools Console and Network: no relevant JS/CORS errors and API `scene`, `coverage`, `catalog`, `route` return expected HTTP statuses.

## Mobile and accessibility

- [ ] At 390px viewport, floor and map controls remain usable, floating bottom panel opens/closes and scrolls, no horizontal overflow.
- [ ] Keyboard Tab reaches search, categories, places, businesses, route controls and external links; visible focus outline.
- [ ] Enter/Space activates buttons, labels correspond to form controls, live error/status messages are announced.
- [ ] Browser reduced-motion preference does not block essential actions.
- [ ] No claim of indoor GPS positioning; no permission prompt unless a reliable positioning feature is actually implemented.

## Release/security

- [ ] `npm install` updates installed Next to >=15.5.29 and produces a valid lockfile for commit.
- [ ] `npm run lint && npm run build` passes; npm production audit reports no unresolved high/critical vulnerabilities.
- [ ] `.env.local` remains ignored and untracked; new commit history checked for recognizable Google API key patterns.
- [ ] Backend `PATHWAY_ENV=production` demands explicit trusted HTTPS CORS origins.
- [ ] Four logically separate commits Days 27–30; one final push after complete acceptance.

## Investor readiness

**This checklist confirms the research prototype's honest behaviour, not a live navigation service.** A credible pilot additionally needs the licensed venue/fieldwork gates listed in `SESSION_06_GAP_ASSESSMENT.md`. No claim of 90% parity or complete PATH coverage until those gates pass.

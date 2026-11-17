# PATHway Toronto

**A map-first, evidence-aware research prototype for navigating Toronto's underground PATH.** Built with Next.js, React, TypeScript, Google Maps JS API, React Three Fiber, Python, and FastAPI.

> **NOT FOR REAL-WORLD NAVIGATION.** This project currently contains **zero licensed, surveyed, verified PATH walking corridors**. It cannot calculate a trustworthy indoor-only route, reachability, wheelchair route, or closest exit. The former PATH schematic and 3D hallway remain **explicit fictional demonstrations**, not maps of Toronto. The accuracy gate is intentional.

## Product vision

A Google Maps-style search and wayfinding interface with Mappedin-like discoverability, floor switching, 2D/3D exploration, business/amenity markers and step-by-step directions **once lawful and verified indoor mapping data has been obtained**. The final target is a real spatial representation, *not a nicer generic hallway*.

### What works today

- **Map-first Verified PATH explorer:** live real-world street context from Google Maps with a searchable origin/destination panel, floor-aware controls, accessible routing preferences, keyboard-accessible navigation, and responsive layout.
- **Source-backed discovery:** six documented place anchors and four Royal Bank Plaza directory businesses; search, category filters, outbound official links, and explicit unverified store unit/floor status.
- **Strict verified-geometry API:** `/api/v2/indoor/scene` publishes only licensed, review-validated lines; `/api/v2/indoor/snap` rejects unverified indoor pin drops; `/api/v2/indoor/route` fails closed when a verified path does not exist.
- **3D readiness:** scene-driven React Three Fiber orbit view, floor-specific corridors and reviewed junction labels **only when valid data exists**. At present the 3D indoor mode is disabled because no such geometry is licensed/verified.
- **Algorithm tests:** directionality, vertical transitions, accessibility restrictions, closure state, route instructions, network QA and source requirements, using **test-only** fixtures. The API never uses the fictitious demonstration graph for v2 routing.
- **Street walking directions (separate from PATH):** Google Maps JavaScript Routes Library requests actual outdoor walking geometry for typed addresses, dragged pins or OSM candidate points, displays provider-sourced turn instructions, and draws an orange map route. Requires the Google Routes API enabled for your browser key; an external Google Maps walking-directions fallback is included.
- **Route 3D flyover:** an interactive camera follows the outdoor route on a *stylized* low-relief model based on available OSM outlines. It is **not** a PATH floorplan, surveyed building height, real indoor view, or Google Street View; an optional link opens Google's nearby street imagery where available.
- **Coordinate-aware indoor pilot endpoint:** `/api/v2/indoor/route/pins` can snap proposed points to actual reviewed open walking segments and split them for routing (with test-only fixtures). Production still has no reviewed walkways and must refuse to route.
- **OSM atlas discovery:** optional, separately attributed community-mapped points and available polygons from the local opt-in importer; these are never promoted to verified PATH corridors.
- **Legacy demonstrations preserved:** standalone PATH schematic and fictional 3D corridor with storefront labels for UI exploration, separate from Verified PATH.

### What does not work yet

No real Toronto interior floor plans, retail unit outlines, corridor polygons, surveyed entrances, validated escalator/elevator transitions, live closure feed, validated user indoor positioning, or actual indoor directions. Street markers represent **approximate buildings only**. Google Maps does not provide precise indoor floor positioning. Don't represent the project as a live wayfinding product or an end-to-end 90%-equivalent Mappedin replacement.

## Run locally

Requires Node.js 20+ (22 recommended) and Python 3.11+.

```bash
# Terminal A — FastAPI
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```bash
# Terminal B — Next.js
cd frontend
npm install
npm run dev -- -p 3000
```

Open **http://localhost:3000**. Select **Verified PATH** for the map-first experience. On the first run, create `frontend/.env.local` from `.env.example` and set your Google Maps JS browser API key there; the app displays a fallback if it is absent. **Never commit `.env.local`**. Restrict the browser key by HTTP referrer and API in Google Cloud; public browser keys are still observable to users. A backend base URL can be configured using `NEXT_PUBLIC_PATH_API_BASE_URL`.

**Two distinct route modes:** **Verified indoor PATH** must still say `DATA_NOT_AVAILABLE` for CIBC Square → Nathan Phillips Square; **Street walking** can request Google walking directions between those names, any address, or dropped map pins. The orange street line and the 3D flyover are **not underground PATH directions**. The unverified Tim Hortons business card cannot become an indoor endpoint.

Enable **Routes API** (the current Maps JavaScript Routes Library) in the Google Cloud project for your browser key, with appropriate restrictions and billing; never place the key in Git. See [Route Planner Upgrade](docs/ROUTE_PLANNER_UPGRADE.md) and [Manual acceptance tests](docs/ROUTE_PLANNER_QA.md).

## Tests and quality gates

```bash
cd backend && source .venv/bin/activate && python -m pytest -q
cd ../frontend && npm run lint && npm run build
npm audit --omit=dev --audit-level=high
```

CI checks backend tests and frontend builds. For reproducible CI, generate and commit `frontend/package-lock.json` using `npm install` on a connected machine. The dependency upgrade to Next.js >=15.5.29 **must be installed and audited locally before public deployment**.

## Relevant endpoints

| Route | Purpose |
| --- | --- |
| `GET /health` | Current data mode and verified-edge count |
| `GET /api/v2/indoor/coverage` | Documented place names and verified floor coverage |
| `GET /api/v2/indoor/catalog` | Official building-directory business listing search |
| `GET /api/v2/indoor/scene` | Licensed reviewed corridor features for map and 3D |
| `GET /api/v2/indoor/snap?lon=...&lat=...&level=...` | Validate proposed point against reviewed walking nodes |
| `GET /api/v2/indoor/route?start=...&end=...` | Route on verified indoor graph only, or return no-data |
| `GET /api/v2/indoor/route/pins?...` | Snap coordinate/floor pairs to licensed, confirmed-open corridor segments and route between them, or decline |
| `GET /api/v1/route?mode=demo&start=...&end=...` | **Synthetic demonstration only** |

## Data and rights

The City of Toronto's *January 2026 PATH Network* map and Mappedin's interactive PATH map are **research/experience references only**, not datasets licensed for reproduction. The City map states that reproduction, distribution, or alteration needs written City permission. The Mappedin map/SDK does not grant permission to copy its underlying venue data. OpenStreetMap data would require individual coverage assessment and ODbL attribution/share-alike compliance. Property owners control the individual PATH segments within their buildings.

We need either venue/property agreements, commissioned and licensed original surveys, or independently vetted lawful data covering corridors, floors, retail units and accessibility transitions. See [data rights](docs/SESSION_06_DATA_RIGHTS.md), [mappedin gap assessment](docs/SESSION_06_GAP_ASSESSMENT.md), and [partner request](docs/DATA_PARTNERSHIP_REQUEST.md).

## Deployment status and next steps

**Status:** Technical/portfolio research prototype, **not live route-planning software**. Consult [deployment guide](docs/SESSION_06_DEPLOY.md), [release quality checks](docs/SESSION_06_ACCEPTANCE.md) and [Session 6 release notes](docs/SESSION_06_RELEASE.md) before using a publicly accessible domain.

The four Day 27–30 commits are staged locally first and pushed to GitHub together at the end of the accelerated session. The 30-day exercise ends here; obtaining/verifying actual PATH geometry is the next major project phase and cannot be manufactured by more code alone.

### Primary references

- [City of Toronto PATH information and map](https://www.toronto.ca/explore-enjoy/visitor-toronto/path-torontos-downtown-pedestrian-walkway/)
- [Mappedin interactive Toronto PATH reference](https://www.mappedin.com/map-gallery/path-map-toronto/)
- [Mappedin developer SDK access terms](https://developer.mappedin.com/web-sdk/getting-started)
- [OpenStreetMap Simple Indoor Tagging](https://wiki.openstreetmap.org/wiki/Simple_Indoor_Tagging)
- [Royal Bank Plaza property directory](https://royalbankplaza.com/food-and-drinks)

This repository does not contain copyrighted PATH map graphics, Mappedin venue geometry, or private API credentials.

## PATH Atlas — expanded community-mapped discovery (optional research upgrade)

The `PATH atlas` view now supports an **optional OSM community POI import** for downtown Toronto: more named buildings, cafés, shopping, washrooms, subway entrances, elevators and escalators **where OSM contributors have mapped them**. Floor filters include `-0.5`, `-1`, `-2`; the map can show OSM points/outlines and an unverified polygon-based 3D preview when source polygons exist. Click/dragging map pins is available for proposed origins and destinations, but the pins do **not** become valid indoor routes without surveyed geometry.

To populate the local discovery snapshot (Internet required, one-off request):

```bash
python3 tools/import_osm_path_candidates.py --fetch
```

Restart/refresh the site and API, then open `PATH atlas` or `Verified routes`. The generated `data/indoor/osm_candidates.json` is deliberately gitignored and does not authorize copying proprietary Mappedin/CITY maps or claiming any route verified. Read [`docs/PATH_ATLAS_UPGRADE.md`](docs/PATH_ATLAS_UPGRADE.md) and [`docs/PATH_ATLAS_SOURCE_MATRIX.md`](docs/PATH_ATLAS_SOURCE_MATRIX.md). Keep `Synthetic demo` and `3D demo` visibly separate from real navigation.

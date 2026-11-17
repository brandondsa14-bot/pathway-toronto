# PATHway Toronto — Dual-mode route planner upgrade

## What it actually solves

- **Street walking (functional with an enabled Google Routes Library account):** type **any address or named place** (not just six preset names), select a mapped OSM candidate as origin/destination, or click/drag two proposed pins. A deliberate **Street walking** button requests a real provider-calculated walking route (with `avoidIndoor` preference, not a guarantee of an all-outdoor path) and renders its polyline **in orange** with provider-sourced turn-by-turn instructions, distance and approximate time where returned. The map pans/highlights a step selected in the list.
- **Approximate location:** the browser's consent-based Geolocation API can estimate the street position, with accuracy disclosed. It is not precise indoor positioning or floor detection.
- **3D route flyover:** uses the **returned Google walking line**, colored route ribbon, a replay marker, and optional available OSM footprint polygons as **stylized low relief only**. Play, pause, scrub and orbit. A link opens Google Street View near the route where imagery is offered. It is **not** an actual PATH interior, a live camera feed, or surveyed building heights.
- **Verified indoor PATH remains evidence-gated:** existing source-reviewed graph and restrictions remain intact. The added `/route/pins` endpoint accepts two lat/lon/floor points and snaps only to nearby reviewed, redistributable, **confirmed-open** horizontal corridors. The route algorithm dynamically splits the appropriate reviewed edges, observes direction, accessibility and closures, and derives step instructions from the real polyline. In current production there are **zero** surveyed corridor segments, so that endpoint also fails safely.

## What cannot be delivered from the existing screenshots or OSM import

The approximately 5,440 imported OSM downtown records are **not** all Toronto PATH tenants, and 1,213 possible indoor candidates are **not** reviewed walkable destinations. Community tags may include outdated stores and incorrect/unknown floor labels. We have not obtained permission to extract/reproduce Mappedin's map geometry, nor a legally usable, sufficiently complete indoor routing dataset. **No one can accurately route anywhere throughout Toronto's underground PATH from these inputs.** No claim of 90% equivalence or investor-ready **live indoor navigation** is justified yet.

## Configure current Google Routes Library

Google's modern Maps JavaScript **Routes Library** (Route.computeRoutes) replaces the older DirectionsService. See:

- https://developers.google.com/maps/documentation/javascript/routes/overview
- https://developers.google.com/maps/documentation/javascript/routes/get-a-route
- https://developers.google.com/maps/documentation/javascript/reference/route

In **Google Cloud Console**, use the same project as your existing Maps JavaScript key:

1. Confirm billing is active and enable **Maps JavaScript API** and **Routes API**; the new Routes Library may require Routes API permissions. Check the browser console if quota, API permissions or referrer restrictions block the request.
2. Under **APIs & Services → Credentials**, keep your browser API key restricted to HTTP referrers (your local `http://localhost:3000/*` or production host) and **only** the Google APIs actually used. Browser-exposed `NEXT_PUBLIC_*` values are not secrets; referrer/API restrictions and quota alerts matter.
3. Keep the actual value exclusively in ignored `frontend/.env.local`. Do **not** post the key, stage the file, or insert it into docs.
4. Restart `npm run dev -- -p 3000` only if changing environment settings. Do not start duplicate servers when the port is already taken.

The outdoor walking provider might snap arbitrary pins or OSM feature centroids to a **nearby public road/sidewalk**, not to a real indoor doorway. Google Maps warnings and credits must remain visible. There is **no wheelchair-accessibility guarantee** from street walking mode. No automatic indoor/outdoor route switching occurs.

## API behavior

`GET /api/v2/indoor/route/pins?start_lon=...&start_lat=...&start_level=-1&end_lon=...&end_lat=...&end_level=-1&accessible_only=false`

Return states:
- `DATA_NOT_AVAILABLE`: no real verified graph loaded (actual production status).
- `NO_VERIFIED_WALKING_AREA`: at least one pin is more than **6 m** from a reviewed, open, horizontal walking centerline at the specified floor. This is a **manual planning snap tolerance**, not evidence that the physical GPS user can access that line (walls and accessibility still require surveying).
- `NO_VERIFIED_CONNECTION`: pins snap to reviewed lines but no valid connected route exists under operating/direction/accessibility restrictions.
- `VERIFIED_SEGMENTS_ROUTE`: data-backed path/steps and length along the source-reviewed graph, only when matching geospatial evidence is installed and physically QA'd.

Only vetted, redistributable, correctly sourced edges can enter this route service. The API never uses OSM POI centroids, old synthetic six-node data, or exterior Google walking routes as underground geometry.

## Investor presentation: accurate, credible demo

A credible current pitch should show **two flows**:

1. **Usable today — street walking/discovery:** CIBC Square → Nathan Phillips Square; live Google street route (if API available), turn list, click/drag points, original search/categories, 3D outdoor flyover, and data attribution.
2. **Safety-first indoor prototype:** request the same locations under *Verified indoor PATH*. It must report insufficient indoor evidence, not draw a fictitious corridor. Show the pilot plan and data rights checklist for the missing geometry.

To present actual indoor turn-by-turn and journey-following 3D, partner with property managers or a licensed indoor mapping vendor for a **single small, fully validated pilot**, including passage polygons, floors, stairs/elevators/escalators, doors, source license and operational status. Test on-site in both directions under closure/accessibility constraints. Only then expand across buildings.

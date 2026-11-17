# PATHway Toronto — Session 6 release notes (Days 27–30)

## Delivered

- Day 27: evidence-only spatial scene feed and valid-floor map pin snap API. Unit tests verify no fictional/unlicensed geometry reaches the map.
- Day 28: modern full-width map-first Verified PATH explorer: real street context, source-backed search, category filters, origin/destination controls, accessibility filters, reviewed floor selector, route statuses, conditional original 3D orbit renderer and a responsive mobile sheet. Old synthetic experiences remain explicitly separated.
- Day 29: production-origin CORS allowlisting, docs disabled for production API, JSON response headers, revised frontend Next.js minimum security version, environment templates and deployment guide.
- Day 30: reproducible QA script, CI backend+frontend checks, honest README, source-data/right-to-use assessment, prospective partner outreach and acceptance criteria.

## Not delivered (external blockers, not postponed code)

- A complete surveyed 3D Toronto PATH model (no lawful floorplan/corridor dataset acquired).
- Verified CIBC Square → Nathan Phillips Square indoor route, real closest exit, actual walk time, verified indoor positioning or production accessibility routing.
- Licensed unit/door polygons, elevator positions and live closures across 75+ buildings.
- Mappedin map-data access; the reference is used solely for original UX design. No copied 3D tiles, map assets or proprietary code.
- Public deployment approval: only after dependency audit, external map-data licence, privacy/accessibility review, QA and commercial operating arrangements.

## Release classification

**RESEARCH / PORTFOLIO BETA — NOT SAFE FOR LIVE PATH NAVIGATION**. Completing the accelerated Days 1–30 exercise must not be confused with completing a commercial Toronto-wide navigation product. A single high-quality **verified licensed pilot** is the next real achievement.

## Verify

Run `bash tools/release-check.sh` (after `npm install` generates a lockfile and updates dependencies). The script deliberately fails if backend tests, frontend build, or npm production audit fails. A separate manual browser and fieldwork gate remains required; see `docs/SESSION_06_ACCEPTANCE.md`.

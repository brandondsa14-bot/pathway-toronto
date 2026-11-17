# Day 19 — Source audit and provenance foundation

## Existing architecture inspected

- **Next.js 15 / React 19:** `frontend/app/page.tsx` keeps the existing Google Street map, PATH schematic, three.js demonstration, and business directory.
- **FastAPI:** `backend/app/main.py` provides `/api/v1/network` and `/api/v1/route`; the demo graph is fabricated and **cannot** be used for actual navigation.
- **Existing A*:** `backend/app/routing.py` uses a zero heuristic; the algorithm is usable, but the weighted demo graph is not surveyed or licensed real corridor data.
- **3D:** `frontend/app/three-d` has fictional geometry. It is not georeferenced or level-matched.
- **Business search:** selected real directory records, but interior point locations are unverified.

## Updated reference hierarchy (2026-11-16)

1. City of Toronto **January 2026** PATH network map (see `data/indoor/source_registry.json`). It contains schematic connectivity and symbols but NOT a downloadable surveyed, level-specific navigation graph. Its publication has a written-permission requirement for reproduction/alteration. **Do not trace or redistribute it as geometry without permission.**
2. Venue-maintained indoor data / commissioned original survey / lawfully licensed geospatial data — potential future routable sources, subject to accuracy and license review.
3. OpenStreetMap indoor mapping — possible supplementary data, but inspect coverage, imports, ODbL attribution/share-alike, and levels first.
4. Mappedin — interaction/design reference only; do not copy app source or venue data.

## Required evidence for a publishable segment

- Explicit endpoints at reviewed floor(s), and accurate indoor corridor geometry.
- Documented legal right to use/redistribute that geometry.
- Source record and verification date; current closure/hours data if relevant.
- Accessible route status is **unknown** until confirmed; never infer from absence of stairs.
- No computed travel distance or minutes without validated coordinates/lengths.

## Acceptance / limitation

No newly verified corridor data has been obtained in this milestone. The existing demo remains isolated. This session establishes a **fail-closed** engine: no real indoor route is returned when evidence is missing.

## Manual test

After applying Day 19, confirm original Google Maps / PATH schematic / 3D demo / storefronts still work. No frontend or backend files are modified today.

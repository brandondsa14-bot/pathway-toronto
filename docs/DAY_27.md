# Day 27 — Evidence-gated spatial scene and pin validation

- **Architecture finding:** The old Three.js corridor and PATH diagram are fabricated; neither has surveyed Toronto PATH geometry, valid retail footprints or verified floor transitions. Re-colouring them is not a solution.
- `GET /api/v2/indoor/scene` outputs **only licensed, structurally validated route geometry**. In the real dataset, the answer remains `NO_LICENSED_INDOOR_GEOMETRY`, zero features, zero selectable walking nodes.
- `GET /api/v2/indoor/snap?lon=...&lat=...&level=...` accepts a map click only if it snaps within 8 m of a verified, traversable node on the selected floor; this is not a real indoor GPS location.
- Known closed edges are not advertised as walkable scene lines. Source IDs, verification dates, accessibility and operational state travel with features.
- The test fixture is **unit-test-only** and is never bundled into `data/indoor` or served to users. Real floor plans, retail unit polygons, and live conditions are still missing.

## Acceptance tests

```sh
cd backend && source .venv/bin/activate
python -m pytest -q
curl -s http://127.0.0.1:8000/api/v2/indoor/scene
curl -s 'http://127.0.0.1:8000/api/v2/indoor/snap?lon=-79.38&lat=43.646&level=-1'
```

The scene must return 0 features and pin requests must fail closed in production. No City or Mappedin geometries are copied. See `docs/SESSION_06_DATA_RIGHTS.md` in the final bundle for the licensing gate.

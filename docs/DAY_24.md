# Day 24 — Searchable indoor destination directory with evidence boundaries

- Added a four-record Royal Bank Plaza tenant catalog linked to the building's existing NAME_ONLY anchor. All entries have `location_status=BUILDING_LISTED_ONLY`, null levels/coordinates and `navigation_ready=false`.
- Added GET `/api/v2/indoor/catalog?q=&category=` (separate from surveyed route endpoints). Its results include official building sources and official business website links.
- Backfilled provenance in `source_registry.json` with the venue directory. No building interior geometry was copied.
- Validator rejects invented business-floor assignments, route-ready claims, unknown source IDs and unsafe URLs. `/api/v2/indoor/route` deliberately rejects tenant IDs because their exact indoor positions are unknown.

## Test

```bash
cd backend && source .venv/bin/activate
python -m pytest -q
curl -sS 'http://127.0.0.1:8000/api/v2/indoor/catalog?q=Tim%20Hortons'
```

Expected: one listed business with `navigation_ready:false`. Day 24 does not add new frontend UI; Day 26 will connect it.

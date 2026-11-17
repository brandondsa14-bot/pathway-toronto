# Day 23 — PATH data access, provenance and survey-readiness audit

- Rechecked Toronto's January 2026 PATH simplified map (distributed by Toronto Financial District BIA). Corrected the source registry URL; the earlier path referenced a different basemap despite labelling it January 2026.
- Added `data/indoor/review_queue.json`, an evidence checklist for the six existing NAME_ONLY place anchors. No coordinates, floor numbers or edges are invented.
- Added a **read-only** CLI audit and negative tests. The CLI cannot import or publish third-party data.
- See `docs/PATH_DATA_ACCESS.md` for source limitations and an acquisition plan.

## Run

```bash
cd backend
source .venv/bin/activate
python -m pytest -q
python -m app.data_review
```

Expected: zero verified routable edges, six research review items, no active real indoor routes. Day 23 does not change the Next.js interface.

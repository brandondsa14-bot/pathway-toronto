# Day 21 — Evidence-gated indoor-only routing

Endpoints (FastAPI at port 8000):

- `GET /api/v2/indoor/coverage` — source-documented places, real floor coverage and number of **verified** corridor edges.
- `GET /api/v2/indoor/route?start=cibc_square&end=nathan_phillips_square&accessible_only=true` — always refuses to invent a connection when reviewed geometry is absent. It returns HTTP 200 and a structured status such as `DATA_NOT_AVAILABLE` so the UI can explain why no directions are shown.
- `avoid_floor_changes=true` is supported. Unconfirmed accessible edges are excluded by `accessible_only=true`.

**Safety invariants:**

1. `/api/v2/indoor/route` never calls the old `/api/v1/route` synthetic graph. Existing demo behavior remains intact and visibly separate.
2. A publicly listed destination is NOT a verified entrance location. No closest PATH exit, walking metres, accessible path or time is guessed.
3. Any future valid route must comprise licensed, surveyed indoor segments, with tracked floor transitions and source reviews. The algorithm uses metres rather than straight-line map distance.
4. All future source imports require evidence and licence review; obtaining a City PDF does not automatically grant reproduction rights.

Tests: `cd backend && source .venv/bin/activate && python -m pytest -q`. Check `http://localhost:8000/docs` and test both v1 demo and v2 verified-only endpoints.

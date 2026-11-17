# Day 25 — Route safety, directionality and evidence-linked steps

- Added explicit `direction` (`BOTH`, `FORWARD`, `REVERSE`) and `operational_status` (`UNKNOWN`, `CONFIRMED_OPEN`, `CONFIRMED_CLOSED`) to every **future** licensed corridor. This prevents silently reversing a one-way escalator or routing through a known-closed corridor.
- Geometry must start/end within 20 m of its surveyed junction endpoints; this is a coarse QA sanity check, **not** a substitute for on-site verification.
- Stairs/escalators cannot be marked wheelchair-accessible. Unconfirmed accessibility remains excluded from `accessible_only` routes.
- Detailed instructions distinguish corridors, doors, stairs, elevators, escalators and ramps; reversed paths produce reversed line geometry. Each step retains its source and review date. No guessed walking times.
- Corrected `/health` to report v1 synthetic vs v2 evidence-gated routing rather than a stale Day 1 milestone.
- Tests use wholly fabricated **in-memory unit test fixtures only**. `data/indoor/indoor_graph.json` still contains **zero** verified corridors.

## Test

```bash
cd backend && source .venv/bin/activate
python -m pytest -q
curl -sS http://127.0.0.1:8000/health
curl -sS 'http://127.0.0.1:8000/api/v2/indoor/route?start=cibc_square&end=nathan_phillips_square'
```

Expected: all tests pass, `/health` shows `verified_indoor_edges:0`, and CIBC Square → Nathan Phillips Square returns `DATA_NOT_AVAILABLE` with `route:null`.

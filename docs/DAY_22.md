# Day 22 — Interactive, honesty-first indoor navigator

- Existing Street view, PATH **synthetic** schematic, fictional 3D corridor, and storefront directory are unchanged.
- A separate **Verified PATH** tab integrates `GET /api/v2/indoor/coverage` and `/route`.
- Search names such as **CIBC Square** and **Nathan Phillips Square**; select start, destination, accessibility-only, and avoid-floor-change filters. Select a floor only when reviewed floor records exist.
- Current data intentionally has **zero licensed verified edges** and **zero surveyed indoor levels**, so the new view reports that a real indoor route or closest exit cannot yet be calculated.
- If future, legally usable and surveyed route geometry is imported and validated, the panel can render verified segments and textual instructions, filter by level, and show measured metres; it never invents minutes.
- Source-document listings aren't misrepresented as precise entries or storefronts; the new route API never falls back to the demo graph.

## Launch and test (Day 22)

Terminal 1: `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000` (reuse your server if already running).

Terminal 2: `cd frontend && npm run lint && npm run build`, then `npm run dev -- -p 3000` (reuse if running).

1. Open the **Verified PATH** tab, search for CIBC Square, select it as start, select Nathan Phillips Square as destination.
2. Click **Check indoor-only route**. Expected: `DATA NOT AVAILABLE`, no invented walking time, exit or fabricated line.
3. Enable accessibility-only and floor-change avoidance; result must remain honest. Floor selector has no validated floors available.
4. Switch to the **PATH layer**; the earlier fictional A* route still appears when previewed and is labeled synthetic. Street view and fictional 3D demo still work.
5. Backend `python -m pytest -q` passes. Run `tools/security-check.sh` after staging Day 22 files and **before** committing. No API key or `.env.local` is included.

## Next steps to make this a real navigator

Acquire permission/licensed, up-to-date corridor centerlines or perform an original survey; verify floors and vertical connectors for one contiguous pilot area; validate real routes on site with venue operators; review accessibility, closures and legal use. Only then add route-based map camera/georeferenced 3D overlays. Mappedin data is not copied or embedded.

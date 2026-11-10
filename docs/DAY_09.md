# Day 09 — Route visualization (synthetic only)

The route preview now requests the FastAPI A* endpoint and highlights the server-returned node sequence on the **illustrative** PATH schematic. No route is computed when the API is offline; error messages are visible. The selected route is cleared whenever the origin or destination changes. The outdoor Google map intentionally shows NO indoor route overlay.

## Test
1. Start backend: `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000`.
2. Start frontend from `frontend`: `npm run dev`.
3. On the PATH layer, select Commerce Court and set Union Station as origin. Click **Preview illustrative route**. Check the API response and highlighted schematic connections.
4. Switch to Street view; no real PATH line should be drawn over Google Maps. Switch back.
5. Stop the backend and retry; a readable error should appear, not an invented route.

Distance and walking time are deliberately omitted because the synthetic graph costs are not metres.

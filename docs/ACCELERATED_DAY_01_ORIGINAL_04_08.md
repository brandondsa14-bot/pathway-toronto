# PATHway Toronto — Accelerated Session 1 (Original Days 4–8)

## What's implemented

- **Day 4 — outdoor markers:** the five location markers, sidebar synchronization, street/PATH switching and address links from the Day 4 update. Street-level coordinates are approximate and are **not surveyed entrances**.
- **Day 5 — data foundation:** PostgreSQL/PostGIS schema, source and verification columns, source-backed entrance seed rows and an optional localhost-only Docker Compose service.
- **Day 6 — initial PATH records:** four source-described entrance records from the TTC Union Station page, preserved in JSON and SQL. No invented indoor coordinates or corridor edges are included.
- **Day 7 — graph representation:** standalone graph data with nodes, edge weights and provenance; the bundled demonstration graph is **synthetic**, for algorithm evaluation only.
- **Day 8 — A* routing:** deterministic weighted shortest-path search with accessible-edge and floor-change filters, versioned API endpoints, frontend routing-lab panel and automated tests. The A* heuristic is zero, a valid admissible heuristic that behaves like Dijkstra's algorithm until spatial geometry is verified.

## Boundaries (important)

An official entrance description alone is not enough to derive a route polyline. **No verified indoor corridor edges or walking lengths are available** in this package. The `/api/v1/route` endpoint defaults to `mode=verified` and refuses to calculate a real route (422). The demonstration mode requires `mode=demo` and labels its costs as `synthetic_units`, not metres or walking times. The original illustrative PATH schematic is still present.

**Actual PATH routing, surveyed entrances, verified end-to-end accessible routes and 3D environments are not completed by this session.** More source research and site verification will be required.

## Source for entrance descriptions

- TTC Union Station entrance and PATH access descriptions: https://www.ttc.ca/subway-stations/Union-station (consulted November 9, 2026)
- Official City PATH map reference for future geometry research: https://www.toronto.ca/wp-content/uploads/2024/01/94dd-PATH-Basemap-2023-12-FINAL.pdf

Do not interpret `SOURCE_DESCRIBED` to mean the presence of a surveyed geometry or accessible route.

## Installation onto existing repository

1. Make sure Days 1–3 are already applied and that your local work is committed or backed up. The package also includes Day 4 map-marker files, so **do not install the separate Day 4 ZIP afterward**.
2. From the root of your existing `~/Downloads/pathway-toronto` repository, extract the ZIP (overwrites only the listed source files; does not include your `.env.local` or `.git` directory):

```bash
cd ~/Downloads/pathway-toronto
unzip -o ~/Downloads/pathway-toronto-accelerated-session-01-days-04-08.zip
```

3. In terminal A, run the backend (using Python 3.10+):

```bash
cd ~/Downloads/pathway-toronto/backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

4. In terminal B, run the frontend with your **existing** Next.js dependencies and Maps key:

```bash
cd ~/Downloads/pathway-toronto/frontend
npm run dev
```

If running on port 3001, ensure your Google Maps website restriction permits that local port, as configured during Day 3. `frontend/.env.local` stays on your computer; it is not included in this ZIP.

5. Visit the running localhost address. Switch to **Street view** to test the five approximate building markers. Select Royal Bank Plaza or Brookfield Place and look for **A* routing lab** in the location details. The panel should show `Connected to FastAPI`. Select start/end and try `Calculate synthetic A* route` with and without access restrictions. The original demo route button remains independent.

6. Backend API documentation: http://localhost:8000/docs

### API examples

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/entrances
curl 'http://localhost:8000/api/v1/network?mode=verified'
curl 'http://localhost:8000/api/v1/route?start=union&end=commerce&mode=demo'
# Expected 422: no verified route graph exists
curl -i 'http://localhost:8000/api/v1/route?start=union&end=commerce'
```

### Run tests and frontend build

```bash
cd ~/Downloads/pathway-toronto/backend
source .venv/bin/activate
python -m pytest -q

cd ../frontend
npm run lint
npm run build
npm audit
```

Any failed production build or outstanding high-severity npm security advisory is a blocker for public deployment. Do not run `npm audit fix --force` without reviewing the major-version changes.

## Optional PostGIS database (not required to run frontend or demo API)

You need a running Docker Desktop installation. The database is a **schema/seed foundation only**; this session's FastAPI reads the packaged JSON datasets. Wiring the API to PostGIS is a future step.

```bash
cd ~/Downloads/pathway-toronto
export POSTGRES_PASSWORD='choose-a-strong-local-password'
docker compose -f infrastructure/docker-compose.yml up -d db
# After healthcheck is passing:
docker compose -f infrastructure/docker-compose.yml exec -T db psql -U pathway -d pathway < database/migrations/001_initial.sql
docker compose -f infrastructure/docker-compose.yml exec -T db psql -U pathway -d pathway < database/seed_verified.sql
```

The database listens at `127.0.0.1:5433`. Avoid using the example password verbatim. Do not commit any passwords or production database credentials.

## GitHub: commit this session

```bash
cd ~/Downloads/pathway-toronto
git status --short
git check-ignore -v frontend/.env.local
git ls-files frontend/.env.local  # should print nothing
git add frontend/app/GoogleStreetMap.tsx frontend/app/outdoorLocations.ts frontend/app/page.tsx frontend/app/globals.css frontend/app/RoutingLab.tsx \
  backend/app/main.py backend/app/routing.py backend/tests/test_api.py backend/tests/test_routing.py \
  data/geographic/demo_graph.json data/geographic/verified_entrances.json \
  database/migrations/001_initial.sql database/seed_verified.sql infrastructure/docker-compose.yml \
  docs/DAY_04.md docs/ACCELERATED_DAY_01_ORIGINAL_04_08.md
git diff --cached --name-only
git commit -m 'feat: add PATH entrance data, PostGIS schema, and A-star routing prototype'
git push origin main
```

**Important:** review `git diff --cached` before committing, especially if you have made local changes beyond this update. The ZIP does not include your `.env.local`, `.git`, or `node_modules`.

## Six-session overview

| Session | Original milestones | Focus |
|---|---|---|
| 1 | 4–8 | Markers, database foundation, entrance sources, graph model, A* API |
| 2 | 9–13 | Route UI, verified accessibility rules, 3D scene, corridor, movement |
| 3 | 14–18 | 3D controls, mini-map, shared routing state, retail data, storefronts |
| 4 | 19–22 | Royal Bank Plaza 3D pilot, expansion, authentication, admin |
| 5 | 23–26 | Approval process, audit logs, security and automated tests |
| 6 | 27–30 | Accessibility, deployment, CI and portfolio docs |

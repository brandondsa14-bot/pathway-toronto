# Day 20 — Strict floor-aware indoor network schema

- `data/indoor/indoor_graph.json` lists source-documented places; **no verified floor assignments, coordinates, entrances or walkway edges** have been acquired. The array of routable edges is empty by design.
- `backend/app/indoor_network.py` strictly rejects any purported real corridor unless its endpoints have verified floors/coordinates, its geometry and measured length exist, and the source expressly permits its use/redistribution.
- Each connecting edge records type (`corridor`, `stairs`, `elevator`, `escalator`, `ramp`, `door`), accessibility (true/false/unknown), review date, legal source, and geometry.
- An accessibility filter rejects **unknown** accessibility rather than guessing. Dijkstra computes the minimum validated metres, not shortest ungrounded aerial distance.
- Backend tests use a clearly fictitious **test-only** graph to exercise multilevel routing. That graph is never shipped as a verified route dataset.
- The source registry distinguishes names/diagrams from legally usable indoor geometry. The official City map is a **reference, not a geometry source to trace or publish without written permission**.

Test: `cd backend && source .venv/bin/activate && python -m pytest -q`. Do not claim real walking directions until a source-reviewed dataset has been incorporated and independently validated.

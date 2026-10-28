# PATHway Toronto

A full-stack Computer Science portfolio project aiming at real-world 2D/3D navigation for Toronto's PATH. **This package is Day 01, not the finished application.** It includes a functional, polished frontend schematic and a separate FastAPI demonstration routing service.

**IMPORTANT:** The current street lines, graph edges, indoor location markers and map coordinates are **synthetic and not geographically accurate**. Never use them for travel or accessible-route guidance. The business listing for Mos Mos Coffee comes from the official Royal Bank Plaza directory; its SVG map location is *illustrative*.

## Run the frontend
Requires Node.js 20+ and npm:

```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000. Search places, filter categories, choose a destination, select an origin, preview a **demo-only** route, switch map layers, zoom and open the official Royal Bank Plaza directory.

## Run the API
Requires Python 3.10+:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
On Windows activate with `.venv\Scripts\activate` instead. API docs: http://localhost:8000/docs. Try `/health`, `/api/places`, and `/api/route?start=union&end=commerce`.

## Run backend tests
```bash
cd backend
python -m pytest -q
```

## GitHub: Day 01
```bash
git init
git add .
git commit -m "feat: initialize PATHway Toronto day 01 prototype"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/pathway-toronto.git
git push -u origin main
```
Create an empty repo on GitHub first. Never commit `.env` or secrets. If working in an existing repository, adapt these steps rather than replacing its history.

## Development
Read [30-day milestones](docs/30_DAY_PLAN.md) and [architecture/provenance](docs/ARCHITECTURE.md). Every milestone should have a separate commit; create feature branches/PRs once the project is on GitHub.

## Sources
- City of Toronto official PATH map: https://www.toronto.ca/wp-content/uploads/2024/01/94dd-PATH-Basemap-2023-12-FINAL.pdf
- Royal Bank Plaza retail directory: https://royalbankplaza.com/food-and-drinks
- Royal Bank Plaza building description: https://royalbankplaza.com/building-info

No external photos, maps, logos or copyrighted floor plans are bundled. Current illustration is original CSS/SVG and should not be confused with a genuine PATH floor plan.

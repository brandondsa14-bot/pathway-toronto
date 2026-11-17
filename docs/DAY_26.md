# Day 26 — Source-backed indoor discovery UI and Session 5 quality gate

- The existing Verified PATH tab now shows source-backed business listings from `/api/v2/indoor/catalog`, alongside the six known place names.
- Search both places and businesses, filter businesses by category, and open official venue/business links. Business cards deliberately **disable Navigate Here** until floor, entrance and corridor geometry are verified.
- Existing route controls, floor filtering, accessibility preferences, Street View, PATH demo, 3D demo and separate Store Directory are preserved.
- The route result displays per-step evidence and operational status when licensed, verified segments are eventually available. Current production routing stays `DATA_NOT_AVAILABLE`.
- Added a Session 5 QA checklist in the package; no new API credentials, external libraries or licence-restricted map data are introduced.

## Test on Mac (not all frontend modules are available in the packaging environment)

```bash
cd ~/Downloads/pathway-toronto/backend
source .venv/bin/activate
python -m pytest -q
python -m app.data_review

cd ~/Downloads/pathway-toronto/frontend
npm run lint && npm run build
```

Run the existing backend on port 8000 and the frontend on port 3000. In Verified PATH, search for 'Tim', select Tim Hortons, verify the official links and confirm the disabled Navigate Here button. Try CIBC Square to Nathan Phillips Square: the result must remain **DATA_NOT_AVAILABLE**. Switch through all existing tabs to check regression.

Do not use the app for actual indoor walking directions. No licensed, surveyed PATH corridor geometry is present.

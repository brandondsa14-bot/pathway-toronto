# Session 5 QA / acceptance — Days 23–26

## Data provenance / accuracy

- [ ] Source registry points to a January 2026 City PATH map (research citation only; no copied geometry).
- [ ] `python -m app.data_review` reports six review items and zero verified edges.
- [ ] All Royal Bank Plaza businesses are BUILDING_LISTED_ONLY with null floor and coordinates.
- [ ] Inaccessible segments and unknown-accessibility segments are rejected when accessible-only is requested.
- [ ] Directional edges are not reversed. Known-closed segments are not routed through.
- [ ] CIBC Square to Nathan Phillips Square returns `DATA_NOT_AVAILABLE` and no route/time/exit.

## Automated / browser testing

- [ ] `python -m pytest -q` (37 or more tests pass).
- [ ] `npm run lint && npm run build` passes on Mac.
- [ ] Verified PATH tab: searchable places + businesses, category filters, official source/website links, disabled Navigate Here for businesses.
- [ ] Street View, PATH demonstration, 3D demonstration and existing Store Directory still work.
- [ ] No browser console errors, no unhandled requests in Next.js / FastAPI.
- [ ] Security check passes; `frontend/.env.local` is ignored/untracked, no recognizable Google key in currently unpushed history.

## Release blockers

- There is no venue/survey-reviewed, licensable floor-specific routing network. There is no basis to claim accurate indoor walking routes or accessible paths.
- Official directory listings alone do not identify exact store units, elevators or entrances.
- Do not present fake unit-test topology or the old 3D corridor as real navigation.
- Resolve dependency advisories and perform wider manual QA before public deployment.

# Day 30 — Research-grade release package and honest QA

- Replaced outdated Day 01 README with the complete Session 6 setup and current truthful feature matrix.
- Added release script (`tools/release-check.sh`), data readiness CLI, and integration tests for critical no-real-geometry API behaviour.
- Added GitHub backend+frontend CI. It uses `npm ci`; **generate/commit a proper frontend/package-lock.json in Day 29 on your Mac** before committing the Session 6 code to GitHub. Npm registry is unavailable in the packaging environment; frontend was checked for TypeScript syntax only, not built here.
- Added data-rights/licensing assessment, requirements for property manager permission and original surveys, investor gap assessment, draft property-owner outreach and detailed manual/mobile/keyboard acceptance criteria.
- No source records were falsely marked verified. Never edit `indoor_graph.json` simply to make the live map look complete.

## Day 30 release gate

```sh
cd ~/Downloads/pathway-toronto
bash tools/release-check.sh
python3 -m json.tool data/indoor/indoor_graph.json > /dev/null
git diff --check
```

Verify in Chrome, Safari and a narrow mobile viewport; do not claim all browsers were tested without actually checking them. The exact current production result is zero surveyed floors, zero verified routes, and disabled interior pin placement. The separate fictional 3D demo must be clearly labelled. Finish the Day 30 commit only after `npm run lint`, `npm run build`, Python tests, and dependency audit pass on your machine.

# Day 29 — API security and deployment gates

- Tightened CORS to explicit development origins (3000–3002) or `PATHWAY_ALLOWED_ORIGINS` for production. Production fails startup if none is configured or if any are wildcard/HTTP/path-bearing. No credentials and no permissive origins.
- FastAPI disables interactive docs/OpenAPI in `PATHWAY_ENV=production`. Added basic JSON security headers and no-store policy. No location tracking/indoor-floor GPS claims.
- Updated `frontend/package.json` **minimum Next.js release to 15.5.29** (November 2026 security maintenance). **Because npm registry access was unavailable during packaging**, the dependencies and lockfile still require installation/audit on your Mac. Do not claim this upgrades your installed node_modules until `npm install` succeeds.
- Added `backend/.env.example` with placeholders; never commit `frontend/.env.local`, real Google key or external provider secrets.
- Deployment and dependency audit instructions live in `docs/SESSION_06_DEPLOY.md` (final package).

## Tests

```sh
cd backend && source .venv/bin/activate && python -m pytest -q
cd ../frontend && npm install && npm run lint && npm run build
npm audit --omit=dev --audit-level=high
```

`npm audit` requires internet and may flag additional transitive issues. **Do not deploy publicly while it fails**. Keep the resulting valid `frontend/package-lock.json` in the Day 29 commit for reproducible builds, and use `npm ci` in CI once it exists. If package manager errors occur, report them; do not run blind `npm audit fix --force`.

# Session 6 deployment and security checklist

**Status:** Research preview only; not certified/authorized for live pedestrian guidance. Do not advertise as production-ready PATH directions.

## Backend — runtime environment

- Install Python requirements in a fresh virtual environment (`python -m pip install -r backend/requirements.txt`).
- Development default CORS supports local frontend on ports 3000, 3001, 3002.
- In production set `PATHWAY_ENV=production` and `PATHWAY_ALLOWED_ORIGINS=https://your-trusted-frontend.example`. The backend refuses to start with missing, HTTP or wildcard origins. Do not enable CORS credentials or expose local server on internet unauthenticated by mistake.
- Production disables `/docs`, `/redoc` and `/openapi.json` and adds JSON security headers. Test the public deployment separately; TLS termination, host hardening and logging must be configured by the chosen hosting provider.
- Never hardcode source ownership/geometry flags as true to pass validators. Current v2 API must return 0 verified corridors.

## Frontend — current security maintenance

The Next.js minimum changed to **15.5.29**, the November 3, 2026 15.x maintenance/security release. The build environment used to assemble this ZIP cannot access npm registry, so **installed dependencies and npm audit have NOT been verified here**. On your Mac:

```sh
cd ~/Downloads/pathway-toronto/frontend
npm install
npm ls next
npm run lint && npm run build
npm audit --omit=dev --audit-level=high
```

Commit the generated `frontend/package-lock.json` in the Day 29 local commit (it should not contain secret values). `npm audit` can flag new issues even on that version: resolve or document each high/critical issue **before public launch**; avoid `npm audit fix --force` without testing. Use `npm ci` on CI after the lockfile exists. If there is a newer verified security version when you actually deploy, upgrade and test again.

## Browser key handling

- Put `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` only in **gitignored** `frontend/.env.local` during development or your hosting provider's secret/config dashboard at deployment.
- `NEXT_PUBLIC_` is intentionally exposed in browser code: restrict the Google Cloud key by **HTTP referrer/origin, allowed API (Maps JavaScript API), billing/quota** and rotate compromised keys. Hiding it in `.env.local` keeps it out of Git, not out of a browser.
- `NEXT_PUBLIC_PATH_API_BASE_URL` is public and should point to your HTTPS FastAPI host. Don't put private credentials in any `NEXT_PUBLIC_` environment variable.
- Confirm `.env.local` is ignored and no keys are tracked or included in new commit history before each push.

## Production preflight

1. `python -m pytest -q` and `npm run lint && npm run build` pass.
2. `npm audit --omit=dev --audit-level=high` resolves high/critical vulnerabilities.
3. Backend production config boots with allowed HTTPS origins and rejects unknown origins.
4. Browser search, map, source links and error states work on desktop/mobile with network throttling.
5. All demo labels stay visible. Never publish a route where verified network data is absent.
6. Record the exact venue map/data permissions and independently field-test pilot geometry before switching the app from research preview to actual navigation.
7. Have a privacy policy, data retention/analytics plan, ongoing update and incident-response owner before inviting the public to rely on the software.

**Do not conflate a successful CI build with permission to publish someone else's floor plans or an assurance that indoor routes are correct.**

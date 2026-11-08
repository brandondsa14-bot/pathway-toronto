# Day 03 — Google Maps outdoor integration

## What's changed
- Added a **real Google Maps JavaScript API outdoor map**, shown via **Street view**. This tab name existed in Day 2 but now switches to the actual Google map, rather than reusing the schematic.
- Kept the interactive Day 2 PATH schematic, its illustrative routing, selectable locations, search, and responsive mobile tabs.
- Added an explicit missing-key state and a visible disclaimer; no imaginary interior connections are placed on Google Maps.
- Added **no npm dependencies**, so existing installation/security-update work is not overwritten.

## Enable Google Maps
1. Visit https://console.cloud.google.com/google/maps-apis/overview and create/select a Google Cloud project. Follow the current Maps JavaScript API setup instructions. Most production setups require billing; Google may offer a limited **Maps Demo Key** for prototyping.
2. Enable **Maps JavaScript API** and obtain an API key.
3. In `frontend/`, create `.env.local` with:

   ```text
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_REAL_KEY_HERE
   ```

4. Restrict key to **HTTP referrers** (`http://localhost:3000/*` for local use, plus your deployed origin if needed) and restrict API usage to **Maps JavaScript API**. Never commit `.env.local`.
5. Restart `npm run dev` (Next.js reads environment variables at startup). Click **Street view**. Google Maps should load and let you pan/zoom around downtown Toronto.
6. Click **PATH layer** to return to the original interactive schematic.

`NEXT_PUBLIC_` keys are visible in the browser: the key is not a secret. The security protection is proper application/API restrictions and budget/quotas, not hiding it in client code. Set billing budgets/quotas where relevant.

## Testing and limitations
- With **no key**, the street view displays setup instructions instead of breaking the application.
- With a **valid, allowed key**, the outdoor map should render; test under your own Google Cloud configuration. Integration could not be verified against a live key in this package.
- Indoor graph and positions are **illustrative**. No Google indoor navigation, verified PATH overlays, driving routes, geocoding search, or verified marker placement is claimed. Future days will supply these separately.
- `npm run lint` (TypeScript) and `npm run build` should be run on your Mac before pushing; Next.js/PostCSS security audit remains unresolved until you successfully upgrade and audit dependencies.

## Suggested Git commit

```bash
git add frontend/app/page.tsx frontend/app/globals.css frontend/app/GoogleStreetMap.tsx docs/DAY_03.md
git commit -m "feat: integrate Google Maps outdoor view with safe fallback"
git push origin main
```

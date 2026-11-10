# Day 04 — Outdoor building markers and map-layer clarity

## Shipped
- Five clickable Google Maps JavaScript API markers: Union Station, Royal Bank Plaza, Brookfield Place, Toronto-Dominion Centre, Commerce Court.
- Clicking a marker selects its place in the existing location-details panel.
- Selecting a place in the sidebar re-centres the Google map when an outdoor marker exists.
- Official source links and street addresses appear in the details panel.
- Street view (outdoor Google Map) and PATH layer (the original Day 2 illustrative schematic) remain separate.
- No additional npm packages or Google API products are required for Day 4; the same restricted Maps JavaScript API key is used.

## Accuracy and limitations
The addresses come from public official operator/property references, but the embedded marker latitude/longitude values are *approximate building-area coordinates* for demo use. They are not validated building entry points, PATH entrances, indoor geometry, accessible pathways, or suitable turn-by-turn route destinations. No retail store marker is placed on the outdoor map because verified indoor coordinates are not available. The PATH schematic remains purely illustrative.

Addresses/sources:
- Union Station: 65 Front Street West — https://torontounion.ca/faqs/
- Royal Bank Plaza: 200 Bay Street — https://royalbankplaza.com/contact-us
- Brookfield Place: 181 Bay Street — https://www.brookfield.com/contact-us
- Toronto-Dominion Centre: 66 Wellington Street West — https://assets.cadillacfairview.com/m/52b7ccb2924edeb5/original/CF-TDC-Tenant-Manual-Sept-2025.pdf
- Commerce Court: 199 Bay Street — https://www.commercecourt.ca/get-in-touch/

## Install on top of Day 03
From `~/Downloads/pathway-toronto`, extract the Day 04 update ZIP. The ZIP only includes:
- `frontend/app/GoogleStreetMap.tsx` (modified)
- `frontend/app/page.tsx` (modified)
- `frontend/app/globals.css` (modified)
- `frontend/app/outdoorLocations.ts` (new)
- `docs/DAY_04.md` (new)

No previous files are deleted. Your `frontend/.env.local` is untouched and must stay ignored by Git.

## Manual checks
1. `cd frontend && npm run lint && npm run build` (fix any errors before pushing).
2. `npm run dev`, then open the printed localhost port.
3. In Street view, look for five outdoor markers. Click Brookfield Place; the details should select Brookfield Place.
4. Choose Union Station in the sidebar; the map should pan towards Union Station.
5. Switch to PATH layer and test the original synthetic route preview; switch back to Street view.
6. Select Mos Mos Coffee. Since the actual shop coordinates are unverified, no Google marker is created for the shop.
7. Check a narrow/mobile viewport and ensure Explore, Map, Details navigation still works.
8. Check Google Maps errors in the browser console. Billing and valid key restrictions may be required.

## Git commands
```bash
cd ~/Downloads/pathway-toronto
git status
git add frontend/app/GoogleStreetMap.tsx frontend/app/page.tsx frontend/app/globals.css frontend/app/outdoorLocations.ts docs/DAY_04.md
git diff --cached --name-only
git ls-files frontend/.env.local
git commit -m "feat: add approximate outdoor landmarks and source links"
git push origin main
```

**Security:** Do not stage `.env.local`, `.env.*` secrets, or printed API keys. If `git ls-files frontend/.env.local` prints a filename, investigate before pushing.

**Outstanding:** Existing npm dependency advisories from Days 1–3 remain unresolved until independently fixed and a production audit/build passes. Day 05 will introduce the database schema.

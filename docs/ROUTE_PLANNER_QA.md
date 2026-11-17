# Route Planner Upgrade — acceptance tests

## Automated

Run from `~/Downloads/pathway-toronto`:

```sh
cd backend && source .venv/bin/activate && python -m pytest -q
cd ../frontend && npm run lint && npm run build
npm audit --omit=dev --audit-level=high
cd .. && node tools/test-street-route-adapter.cjs
```

Expected **60 backend passing tests** on the reconstructed Atlas baseline (52 previous + 8 coordinate-routing tests); a Starlette depreciation notice may still appear. The full Next.js build must be executed on the user's Mac because the package environment cannot install the npm dependencies.

## Browser: `http://localhost:3000`

1. **Select Verified routes → Directions → Street walking.** Type **CIBC Square, Toronto, Ontario** to **Nathan Phillips Square, Toronto, Ontario**, click **Compute street walking route**. If the Google Cloud Routes API is enabled and the provider returns a route: an **orange route line on the city map**, *actual Google walking turn steps*, distance and duration should display. The page must explicitly say this is **not** verified PATH travel. If denied, see provider error and the external **Open walking directions in Google Maps** link instead—do not invent a route.
2. **Any point:** use the Map pin tool to choose START, click city map; choose DESTINATION, click another point. Drag either pin. Click Compute street walking route; the route should request these coordinates. Typing an address into a field must override any previous pin choice for that field. Swap the endpoints and request the reverse route.
3. **OSM candidates:** in Discover, search for a mapped restaurant/amenity, open its source, then choose **Use as street starting point** or **Street directions to here**. Confirm the correct pin is selected and the app opens the street route panel. Do not mistake the OSM point for an indoor unit entrance.
4. **Approximate current location:** click **Use approximate location**, grant/deny permission in browser. The UI must communicate accuracy/denial and never claim indoor floor certainty.
5. **Step highlight:** once a Google walking route is returned, click a step. The related portion of the city map should turn dark blue and pan to that segment. Confirm steps are sourced from Google and not invented from a diagonal straight line.
6. **Route 3D flyover:** click **Route 3D flyover**, Play, Pause, Restart, progress scrub, Follow camera, and Nearby Street View. The teal route and red marker must follow the returned street path. OSM footprints, where present, must be clearly labelled **stylized low-relief outdoor mapping** and not real indoor 3D.
7. **Verified indoor safety:** switch to Verified indoor PATH, choose CIBC Square/Nathan Phillips Square, check route. Production response must still be `DATA_NOT_AVAILABLE`; no orange street line may be labelled as an indoor path. Verified 3D remains disabled when no licensed corridor geometry exists.
8. **Floor filters:** -0.5, -1 and -2 must only show source-tagged candidates; absence of data cannot fabricate floor geometry.
9. **Regression:** original Street View, PATH atlas/Discover, original 3D demo, synthetic demo, store directory, category filters, markers and source links still function.
10. **Mobile/keyboard/console:** mobile 390 px width, tab/enter, focus outline, browser developer console and network. Test Chrome and Safari separately if claiming both.

## Evidence and security

- `git check-ignore -v frontend/.env.local` should show an ignored file; `git ls-files frontend/.env.local` must show nothing.
- `git check-ignore -v data/indoor/osm_candidates.json` should show the local optional import ignored; do not commit 3.5 MB of unvetted community data without explicit data-governance review.
- Run `bash tools/release-check.sh` and `bash <route-upgrade-folder>/tools/verify-route-upgrade.sh` after the patch.
- No live on-site PATH routes are established by browser tests or backend test fixtures.

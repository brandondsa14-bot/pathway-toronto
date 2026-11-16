# Day 16 — Source-backed retail directory

The application now has search and category filters for four businesses listed in the **Royal Bank Plaza official retail directory**: Mos Mos Coffee, Tim Hortons, Starbucks, and Wendy’s. Entries contain category, building, source URL, research check date (2026-11-16), and a conservative location description. Tenant availability and hours may change.

## Sources
- https://royalbankplaza.com/shop/mos-mos-coffee
- https://royalbankplaza.com/shop/tim-hortons
- https://royalbankplaza.com/shop/starbucks
- https://royalbankplaza.com/shop/wendys

## Manual test
1. Open the location details area and scroll to Discover PATH businesses.
2. Search `coffee`, `Tim Hortons`, and `Wendy’s`; verify filtering.
3. Filter by Coffee & cafés and Fast food.
4. Select a listing; verify its official directory source and check date.
5. The existing building selection, A* synthetic route and 3D prototype still work.

**Accuracy constraint:** Retail listings are source-backed, but neither 3D store positions nor indoor routes are surveyed. The directory is not a live occupancy database.

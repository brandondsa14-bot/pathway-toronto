# Session 6 — Architecture / Mappedin reference gap assessment

**Reference:** User-supplied Mappedin PATH screenshots (outdoor overview, underground -1, category menu, route preview) and https://app.mappedin.com/map/65b1c67ec6d00dd23a6f002c?floor=m_d7d9abf025030ed8 (may need normal browser interaction). **This is not licensed content for copying.**

| User expectation | Mappedin reference shows | PATHway Toronto after Day 30 | Remaining blocker / acceptance gate |
| --- | --- | --- | --- |
| Real multi-building shape | Dense contextual buildings, connected spaces and store units | Google street context; no indoor footprints | Permission + measured floor polygons for each venue |
| Accurate 3D | Georeferenced indoor units, corridors and transitions | Data-driven 3D renderer, disabled until verified input; old fictional hallway retained under demo tab only | Surveyed geom incl levels, boundaries, connector metadata |
| Multi-floor | Named street and underground levels | Floor picker based only on vetted data (empty in production) | Legitimate floor IDs and vertical links from venues |
| Discoverability | Search/categories, stores and amenity markers | Real place names, 4 venue-listed tenants, categories, source links | Verified unit positions, washrooms, ATM and access point surveys |
| Pin placement | Select indoor walking position | Snap API only accepts reviewed walkable nodes by level; rejects all production clicks at present | Verified interior geometry and floor/position sensing |
| Navigation | Interactive routed overlay and directions | Evidence-gated routing API and polyline overlay only for validated graphs; test-only fixture exercises algorithm | Actual pedestrian graph, operational/closure QA, route audit |
| Accessible travel | Elevators and floor transitions | Strict accessibility filters; unknown != accessible | Venue-accessible segment inventory, elevator status |
| Route length/time | Calculated from mapped paths | Distance only for vetted edge length; no fabricated time | Surveyed measures, travel-rate policy and QA |
| Investor readiness | Cohesive live navigable application | Polished research preview with transparent data limitations | Complete a **small verified pilot zone** and field QA before commercial pitch |

## Why the current 3D hallway looked unrealistic

Original corridor geometry was synthetic, not floor-specific, not tied to the real city coordinate system; it has a repeated hallway mesh, fabricated storefront placement, no physical multi-building footprint, no authentic escalator/elevator locations, no entrance-to-street correspondence, no reliable routing overlay or complete retailer POIs. Lighting/color changes cannot fix missing indoor topology. Its location signs are visual demonstrations only.

## Our deliberate design pivot

Rather than emulate the reference's detailed indoor assets without ownership, we now use **street context plus an evidence-gated spatial feed**. Real surveyed features can appear both in the 2D outdoor-context overlay and an original 3D orbit view; the same node IDs power the route planner and reviewed markers. Unverified stores stay in the directory without artificial lat/lon or floor assignments. Because no verified floor data exists, the 3D verified view and interior pin placement are disabled.

## Investor-ready pilot acceptance (not yet achieved)

1. Agreement/licence covers building floor plans, spatial graph and derived works for at least one connected pilot segment.
2. At least two real navigable endpoints and one surveyed connected corridor, with field-checked entry coordinates.
3. Building + floor + provenance on every segment, door, elevator, staircase and retail unit marker.
4. At least one verified indoor-only route shows correct floor changes, direction, length and route overlay on real geometry.
5. On-device field testing confirms routes and closures; wheelchair claim only on independently confirmed accessible edges.
6. All unreachable routes fail closed; no silent outdoor fallback, no synthetic paths.
7. Search, pin placement, map controls, floor switching, keyboard/mobile and external links pass user QA.
8. Security audit and dependency patching, hosting rules, monitoring, partner acceptance and data update workflow are completed.

**Current verdict:** frontend UX foundation and backend algorithms are investable as a research demonstration of architecture, **not** as a usable 30 km navigation service or a 90%-equivalent real-world Mappedin experience.

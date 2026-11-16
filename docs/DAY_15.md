# Day 15 — Shared 2D / 3D destination and route state

The selected destination now stays consistent between the Street, PATH schematic and 3D demo. The 3D context panel allows changing the destination and returning to the PATH layer. If a synthetic A* route has been previewed on the PATH schematic, its **text labels** are visible in 3D as context. No position, corridor or highlighted line is projected into the 3D scene: the test graph and scene coordinates have never been spatially aligned.

## Manual test
1. Select Union Station → Commerce Court; preview the synthetic route on PATH.
2. Switch to 3D; the selected destination and the route's place names remain visible.
3. Change the destination to Brookfield Place in the 3D dropdown. The old route must clear; the 3D scene stays open.
4. Click Return to PATH layer and preview a new route; confirm the selection is preserved.
5. Street view should still show outdoor buildings only.

No environment files or Google Maps credentials are changed.

# Day 14 — 3D camera modes and simulated mini-map

The original fictional 3D corridor now has **Walk view** and **Overhead** buttons, plus a live top-down mini-map showing simulated position and heading. The map is derived from invented corridor dimensions, not from PATH coordinates or your device location.

## Manual test
1. Open 3D demo. Switch between Walk view and Overhead; the scene should change without losing your simulated position.
2. Move with WASD and verify the mini-map dot moves; Q/E should rotate its heading.
3. Walk into side and end walls; movement must stop at collision limits.
4. Use Reset and confirm the simulated position returns to the beginning.
5. Switch between the existing Street and PATH layers to confirm both remain available.

## Scope
This is **not** a floor plan, survey, accessible route or map-matched location. No new API key or environment variables are introduced.

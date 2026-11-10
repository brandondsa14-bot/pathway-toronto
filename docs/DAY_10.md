# Day 10 — Accessible-edge filters and floor transitions (demonstration only)

The route planner now offers two independent restrictions: **exclude edges tagged inaccessible** and **avoid edges with floor changes**. The backend returns the traversed edge kinds, synthetic cost per edge, and a count of demonstration floor transitions. It never describes these flags as verified accessibility data.

## Test
1. Select Union Station → Toronto-Dominion Centre without filters: the short synthetic path passes through the demonstration stair edge.
2. Enable either checkbox and recalculate: the longer path through Brookfield Place and Commerce Court should be shown.
3. Toggle both and check that the floor transition count becomes zero.
4. Run `python -m pytest -q` inside `backend` (activate `.venv`).

**Not for navigation:** Synthetic accessibility flags are not based on a survey of Toronto's PATH.

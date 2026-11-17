"""Indoor-only, source-gated routing API. NEVER falls back to the demo network."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from .indoor_network import load_network, shortest_indoor_route
from .indoor_catalog import load_catalog, search_catalog
from .route_instructions import route_steps

router = APIRouter(prefix="/api/v2/indoor", tags=["indoor-evidence"])


@router.get("/catalog")
def indoor_catalog(q: str = "", category: str = "all"):
    """Directory listings are discoverable, but NOT destination coordinates."""
    catalog = load_catalog()
    records = search_catalog(q, category)
    return {
        "status": "BUILDING_DIRECTORY_ONLY",
        "total": len(catalog["destinations"]),
        "count": len(records),
        "categories": sorted({r["category"] for r in catalog["destinations"]}),
        "destinations": records,
        "disclaimer": catalog["disclaimer"],
    }


@router.get("/coverage")
def coverage():
    network = load_network()
    levels = sorted({node["level"] for node in network["nodes"] if node.get("position_status") != "NAME_ONLY" and node.get("level") is not None})
    return {
        "status": "NO_VERIFIED_WALKWAYS" if not network["edges"] else "PARTIAL_VERIFIED_GRAPH",
        "network_id": network["network_id"],
        "verified_edge_count": len(network["edges"]),
        "available_levels": levels,
        "places": [{"id": n["id"], "name": n["name"], "kind": n["kind"], "level": n.get("level"), "position_status": n["position_status"], "has_verified_entry": n["position_status"] == "VERIFIED_ENTRY"} for n in network["nodes"]],
        "message": ("These place names appear in public sources, but no independently verified, licensed indoor corridor geometry is loaded. There are currently no real PATH directions." if not network["edges"] else "Only routes entirely supported by verified segment evidence can be returned."),
        "disclaimer": "Not for live navigation until venue/survey verification and route QA are complete.",
    }


@router.get("/route")
def indoor_only_route(
    start: str = Query(min_length=1),
    end: str = Query(min_length=1),
    accessible_only: bool = False,
    avoid_floor_changes: bool = False,
):
    network = load_network()
    nodes = {n["id"]: n for n in network["nodes"]}
    unknown = [ident for ident in (start, end) if ident not in nodes]
    if unknown:
        raise HTTPException(status_code=404, detail={"status": "UNKNOWN_PLACE", "ids": unknown})
    base = {"status": "DATA_NOT_AVAILABLE", "route": None, "requested": {"start": start, "end": end, "indoor_only": True, "accessible_only": accessible_only, "avoid_floor_changes": avoid_floor_changes}, "verified_edge_count": len(network["edges"])}
    if not network["edges"]:
        return {**base, "message": "No verified indoor corridor network is loaded. We cannot determine an indoor-only route or the closest PATH exit. The old synthetic demo is not used."}
    if nodes[start]["position_status"] == "NAME_ONLY" or nodes[end]["position_status"] == "NAME_ONLY":
        return {**base, "status": "UNVERIFIED_ENDPOINT", "message": "One or both locations lack surveyed indoor entry coordinates/floors. Choose verified entry points once available; no route was guessed."}
    result = shortest_indoor_route(network, start, end, accessible_only, avoid_floor_changes)
    if result is None:
        return {**base, "status": "NO_VERIFIED_CONNECTION", "message": "No connected indoor-only route is supported by the currently verified segments and preferences. No outdoor detour is generated automatically."}
    ids, traversed_edges = result
    steps = route_steps(nodes, ids, traversed_edges)
    return {**base, "status": "VERIFIED_SEGMENTS_ROUTE", "message": "Route uses only source-reviewed, licensed indoor edges; confirm current closures before walking.", "route": {"nodes": ids, "labels": [nodes[ident]["name"] for ident in ids], "distance_m": round(sum(e["length_m"] for e in traversed_edges), 1), "time_minutes": None, "steps": steps, "floor_changes": sum(nodes[ids[i]]["level"] != nodes[ids[i+1]]["level"] for i in range(len(ids)-1))}}

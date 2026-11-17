"""Publish only vetted, licensed walking geometry to the map renderer.

Building-outline diagrams, directory links and synthetic A* graph must never
enter this feed. Production starts with an intentionally empty feature list.
"""
from __future__ import annotations

from math import cos, hypot, radians, isfinite
from typing import Any


def _distance_metres(lon: float, lat: float, point: dict) -> float:
    return hypot((lon - point["lon"]) * 111_320 * cos(radians(lat)),
                 (lat - point["lat"]) * 111_320)


def publish_scene(network: dict[str, Any]) -> dict[str, Any]:
    """Called only with load_network() output, which validates provenance."""
    nodes = {n["id"]: n for n in network["nodes"]}
    edges = [e for e in network["edges"] if e["operational_status"] != "CONFIRMED_CLOSED"]
    usable_ids = {e["from"] for e in edges} | {e["to"] for e in edges}
    features = [
        {
            "type": "Feature", "id": e["id"],
            "properties": {
                "from": e["from"], "to": e["to"],
                "level_from": nodes[e["from"]]["level"], "level_to": nodes[e["to"]]["level"],
                "kind": e["kind"], "accessible": e["accessible"],
                "operational_status": e["operational_status"], "source_id": e["source_id"],
                "verified_on": e["verified_on"],
            },
            "geometry": {"type": "LineString", "coordinates": e["geometry"]},
        }
        for e in edges
    ]
    floor_levels = sorted({nodes[n]["level"] for n in usable_ids})
    point_features = [
        {"id": n["id"], "name": n["name"], "kind": n["kind"],
         "level": n["level"], "lon": n["lon"], "lat": n["lat"],
         "position_status": n["position_status"], "source_ids": n["source_ids"]}
        for n in nodes.values() if n["id"] in usable_ids
    ]
    return {
        "status": "VERIFIED_GEOMETRY_AVAILABLE" if features else "NO_LICENSED_INDOOR_GEOMETRY",
        "coordinate_system": "WGS84_lon_lat", "floor_elevations_surveyed": False,
        "levels": floor_levels, "features": features, "nodes": point_features,
        "can_place_pin": bool(features), "feature_count": len(features),
        "disclaimer": "Verified indoor surveyed geometry only. Street map and building locations are outdoor context, not PATH entrances. Changes and closures require on-site confirmation.",
    }


def snap_to_reviewed_node(network: dict[str, Any], lon: float, lat: float, level: float, threshold_m: float = 8.0) -> dict[str, Any]:
    """A map click is a *request* for pin placement, not proof of an indoor fix.

    Only snap to a route node with reviewed walkable edges on the specified
    level. No interpolation into uncatalogued floors or automatic GPS floor.
    """
    if not all(isfinite(v) for v in (lon, lat)) or not (-180 <= lon <= 180 and -90 <= lat <= 90):
        return {"status": "INVALID_COORDINATES", "node": None}
    scene = publish_scene(network)
    choices = [n for n in scene["nodes"] if n["level"] == level]
    if not choices:
        return {"status": "NO_VERIFIED_WALKING_AREA", "node": None, "message": "No verified walkable indoor points are mapped on this level. Pin placement is unavailable."}
    nearest = min(choices, key=lambda n: _distance_metres(lon, lat, n))
    distance = _distance_metres(lon, lat, nearest)
    if distance > threshold_m:
        return {"status": "OUTSIDE_VERIFIED_NETWORK", "node": None, "message": "This click is not close enough to a reviewed walkable point. No location was assumed."}
    return {"status": "SNAPPED_TO_REVIEWED_NODE", "node": nearest, "distance_to_node_m": round(distance, 2), "message": "Snapped to a verified route junction; not a GPS-based indoor location."}

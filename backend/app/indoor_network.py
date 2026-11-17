"""Strict indoor-data validation. Never merge with the synthetic demo graph.

Documentation references to City / venue maps do NOT authorize reproducing
or inventing corridor geometry. No production edge ships in Session 4.
"""
from __future__ import annotations

import json
from heapq import heappush, heappop
from itertools import count
from math import isfinite, cos, radians, hypot
from pathlib import Path
from typing import Any

INDOOR_PATH = Path(__file__).resolve().parents[2] / "data" / "indoor" / "indoor_graph.json"
SOURCES_PATH = Path(__file__).resolve().parents[2] / "data" / "indoor" / "source_registry.json"
ALLOWED_KINDS = {"corridor", "door", "stairs", "elevator", "escalator", "ramp"}
VERTICAL_KINDS = {"stairs", "elevator", "escalator"}
DIRECTIONS = {"BOTH", "FORWARD", "REVERSE"}
OPERATIONS = {"UNKNOWN", "CONFIRMED_OPEN", "CONFIRMED_CLOSED"}


def _endpoint_separation_m(a: dict, point: list) -> float:
    """Small local-distance QA only, never used for routing or travel length."""
    return hypot((point[0] - float(a["lon"])) * 111_320 * cos(radians(float(a["lat"]))),
                 (point[1] - float(a["lat"])) * 111_320)



class NetworkValidationError(ValueError):
    """Unreviewed or structurally invalid data must not be served as a route."""


def _numeric(value: Any, key: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not isfinite(value):
        raise NetworkValidationError(f"{key} must be a finite number")
    return float(value)


def validate_network(network: dict[str, Any], registry: dict[str, Any]) -> dict[str, Any]:
    if network.get("schema_version") != "1.0" or not isinstance(network.get("nodes"), list) or not isinstance(network.get("edges"), list):
        raise NetworkValidationError("Unsupported indoor network schema")
    sources = {s["id"]: s for s in registry.get("sources", [])}
    nodes: dict[str, dict[str, Any]] = {}
    for node in network["nodes"]:
        ident = node.get("id")
        if not isinstance(ident, str) or not ident or ident in nodes:
            raise NetworkValidationError("Duplicate/missing indoor node ID")
        if not node.get("name") or not isinstance(node.get("source_ids"), list) or not node["source_ids"] or any(src not in sources for src in node["source_ids"]):
            raise NetworkValidationError(f"Missing node name or provenance: {ident}")
        status = node.get("position_status")
        if status not in {"NAME_ONLY", "VERIFIED_ENTRY", "VERIFIED_JUNCTION"}:
            raise NetworkValidationError(f"Position status unknown: {ident}")
        if status != "NAME_ONLY":
            if not any(sources[src].get("routable_geometry_provided") and sources[src].get("redistribution_authorized") for src in node["source_ids"]):
                raise NetworkValidationError(f"Verified indoor point needs a licensed surveying source: {ident}")
            if not isinstance(node.get("level"), int) or isinstance(node["level"], bool):
                raise NetworkValidationError(f"Verified node needs a floor: {ident}")
            lat = _numeric(node.get("lat"), "lat")
            lon = _numeric(node.get("lon"), "lon")
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                raise NetworkValidationError(f"Coordinates out of bounds: {ident}")
        elif any(node.get(k) is not None for k in ("lat", "lon", "level")):
            raise NetworkValidationError(f"NAME_ONLY must not claim floor or position: {ident}")
        nodes[ident] = node
    seen_edges: set[str] = set()
    for edge in network["edges"]:
        eid = edge.get("id")
        a, b = edge.get("from"), edge.get("to")
        if not isinstance(eid, str) or not eid or eid in seen_edges or a not in nodes or b not in nodes or a == b:
            raise NetworkValidationError("Invalid, duplicated or disconnected edge IDs")
        seen_edges.add(eid)
        if nodes[a]["position_status"] == "NAME_ONLY" or nodes[b]["position_status"] == "NAME_ONLY":
            raise NetworkValidationError("Real edges cannot attach to unsurveyed anchors")
        if edge.get("review_status") != "VERIFIED" or not edge.get("verified_on"):
            raise NetworkValidationError("Unreviewed edges are prohibited in the routable graph")
        source = sources.get(edge.get("source_id"))
        if not source or not source.get("routable_geometry_provided") or not source.get("redistribution_authorized"):
            raise NetworkValidationError("Missing licensed and reviewed corridor source")
        if edge.get("kind") not in ALLOWED_KINDS:
            raise NetworkValidationError("Unrecognized corridor/transition kind")
        if edge.get("direction") not in DIRECTIONS:
            raise NetworkValidationError("Surveyed segment requires explicit travel direction")
        if edge.get("operational_status") not in OPERATIONS:
            raise NetworkValidationError("Segment needs an explicit (possibly UNKNOWN) operational status")
        if edge["kind"] in {"stairs", "escalator"} and edge.get("accessible") is True:
            raise NetworkValidationError("Stairs/escalators cannot be marked wheelchair-accessible")
        if edge.get("accessible") not in (True, False, None):
            raise NetworkValidationError("Accessibility must be true, false, or unknown")
        distance = _numeric(edge.get("length_m"), "length_m")
        if distance <= 0:
            raise NetworkValidationError("Routable edge length must be positive metres")
        floor_change = nodes[a]["level"] != nodes[b]["level"]
        if floor_change and edge.get("kind") not in VERTICAL_KINDS | {"ramp"}:
            raise NetworkValidationError("Floor change requires a surveyed vertical connector")
        if edge.get("kind") in VERTICAL_KINDS and not floor_change:
            raise NetworkValidationError("Vertical connector must change floor")
        geometry = edge.get("geometry")
        if not isinstance(geometry, list) or len(geometry) < 2:
            raise NetworkValidationError("Real corridor must include licensed line geometry")
        for pt in geometry:
            if not isinstance(pt, list) or len(pt) != 2:
                raise NetworkValidationError("Line geometry must contain [lon, lat] points")
            lon, lat = _numeric(pt[0], "lon"), _numeric(pt[1], "lat")
            if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                raise NetworkValidationError("Line geometry out of bounds")
        if _endpoint_separation_m(nodes[a], geometry[0]) > 20 or _endpoint_separation_m(nodes[b], geometry[-1]) > 20:
            raise NetworkValidationError("Segment geometry must connect its surveyed endpoint coordinates (20 m QA threshold)")
    return network


def load_network() -> dict[str, Any]:
    return validate_network(json.loads(INDOOR_PATH.read_text(encoding="utf8")), json.loads(SOURCES_PATH.read_text(encoding="utf8")))


def shortest_indoor_route(network: dict[str, Any], start: str, end: str, accessible_only: bool = False, avoid_floor_changes: bool = False) -> tuple[list[str], list[dict[str, Any]]] | None:
    """Dijkstra on evidence-validated indoor metres; never a straight-line guess."""
    nodes = {n["id"]: n for n in network["nodes"]}
    if start not in nodes or end not in nodes:
        raise ValueError("Unknown indoor place")
    if nodes[start]["position_status"] == "NAME_ONLY" or nodes[end]["position_status"] == "NAME_ONLY":
        return None
    if start == end:
        return ([start], [])
    adjacency: dict[str, list[tuple[str, float, dict[str, Any]]]] = {n: [] for n in nodes}
    for edge in network["edges"]:
        if edge.get("operational_status") == "CONFIRMED_CLOSED":
            continue
        if accessible_only and edge["accessible"] is not True:
            continue  # unknown is never assumed wheelchair-accessible
        if avoid_floor_changes and nodes[edge["from"]]["level"] != nodes[edge["to"]]["level"]:
            continue
        a, b = edge["from"], edge["to"]
        if edge["direction"] in {"BOTH", "FORWARD"}:
            adjacency[a].append((b, float(edge["length_m"]), edge))
        if edge["direction"] in {"BOTH", "REVERSE"}:
            adjacency[b].append((a, float(edge["length_m"]), edge))
    sequence = count()
    queue = [(0.0, next(sequence), start)]
    best = {start: 0.0}
    parent: dict[str, tuple[str, dict[str, Any]]] = {}
    while queue:
        length, _, current = heappop(queue)
        if length > best[current]:
            continue
        if current == end:
            path = [end]
            edges: list[dict[str, Any]] = []
            while path[-1] != start:
                prev, edge = parent[path[-1]]
                edges.append(edge)
                path.append(prev)
            path.reverse()
            edges.reverse()
            return path, edges
        for neighbor, cost, edge in adjacency[current]:
            proposed = length + cost
            if proposed < best.get(neighbor, float("inf")):
                best[neighbor] = proposed
                parent[neighbor] = current, edge
                heappush(queue, (proposed, next(sequence), neighbor))
    return None

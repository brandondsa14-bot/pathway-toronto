"""Coordinate-first indoor route planning; ZERO fake corridor geometry.

Only verified, redistributable, CONFIRMED_OPEN horizontal walkable segments can
accept map pins. Temporary start/end nodes split reviewed segments so a visitor
can select points along a corridor, not only pre-existing junction IDs.

The production graph currently has no reviewed edges; therefore all real-world
requests remain DATA_NOT_AVAILABLE. Unit tests use isolated licensed-test fixtures.
"""
from __future__ import annotations

from copy import deepcopy
from math import cos, hypot, isfinite, radians
from typing import Any

from .indoor_network import shortest_indoor_route
from .route_instructions import route_steps

PIN_RADIUS_METRES = 6.0
HORIZONTAL_KINDS = {"corridor", "door", "ramp"}


def _xyz(point: list[float], base_lat: float) -> tuple[float, float]:
    return point[0] * 111_320 * cos(radians(base_lat)), point[1] * 111_320


def _segment_lengths(geometry: list[list[float]], latitude: float) -> list[float]:
    result = []
    for a, b in zip(geometry, geometry[1:]):
        x, y = _xyz(a, latitude)
        xx, yy = _xyz(b, latitude)
        result.append(hypot(xx-x, yy-y))
    return result


def _nearest_on_line(geometry: list[list[float]], lon: float, lat: float) -> tuple[float, float, list[float]] | None:
    lengths = _segment_lengths(geometry, lat)
    total = sum(lengths)
    if total <= 0.001:
        return None
    px, py = _xyz([lon, lat], lat)
    traversed = 0.0
    best: tuple[float, float, list[float]] | None = None
    for index, (a, b) in enumerate(zip(geometry, geometry[1:])):
        ax, ay = _xyz(a, lat)
        bx, by = _xyz(b, lat)
        dx, dy = bx-ax, by-ay
        if lengths[index] < 0.001:
            traversed += lengths[index]
            continue
        t = min(1.0, max(0.0, ((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)))
        near = [a[0]+t*(b[0]-a[0]), a[1]+t*(b[1]-a[1])]
        nx, ny = _xyz(near, lat)
        dist = hypot(px-nx, py-ny)
        frac = (traversed+t*lengths[index])/total
        if best is None or dist < best[0]:
            best = (dist, frac, near)
        traversed += lengths[index]
    return best


def _geometry_between(geometry: list[list[float]], start_frac: float, end_frac: float) -> list[list[float]]:
    lat = sum(point[1] for point in geometry)/len(geometry)
    lengths = _segment_lengths(geometry, lat)
    total = sum(lengths)
    if total <= 0:
        return [geometry[0][:], geometry[-1][:]]
    cumulative = [0.0]
    for length in lengths:
        cumulative.append(cumulative[-1]+length)

    def at(fraction: float) -> list[float]:
        target = fraction * total
        for index, length in enumerate(lengths):
            if target <= cumulative[index+1] or index == len(lengths)-1:
                t = min(1, max(0, (target-cumulative[index])/max(length,1e-9)))
                a,b=geometry[index],geometry[index+1]
                return [a[0]+t*(b[0]-a[0]), a[1]+t*(b[1]-a[1])]
        return geometry[-1][:]

    output = [at(start_frac)]
    output.extend(point[:] for i, point in enumerate(geometry[1:-1], 1) if start_frac*total < cumulative[i] < end_frac*total)
    output.append(at(end_frac))
    return output


def _snap(network: dict[str, Any], lon: float, lat: float, level: float, accessible_only: bool) -> dict[str, Any] | None:
    nodes = {node["id"]: node for node in network["nodes"]}
    candidates = []
    for edge in network["edges"]:
        start = nodes[edge["from"]]
        end = nodes[edge["to"]]
        if (start["level"] != level or end["level"] != level or
            edge["kind"] not in HORIZONTAL_KINDS or
            edge["operational_status"] != "CONFIRMED_OPEN" or
            (accessible_only and edge["accessible"] is not True)):
            continue
        nearest = _nearest_on_line(edge["geometry"],lon,lat)
        if nearest is not None and nearest[0] <= PIN_RADIUS_METRES:
            candidates.append({"edge":edge,"distance_m":nearest[0],"fraction":nearest[1],"point":nearest[2]})
    return min(candidates, key=lambda c:c["distance_m"]) if candidates else None


def route_between_pins(
    network: dict[str, Any], *, start_lon: float, start_lat: float, start_level: float,
    end_lon: float, end_lat: float, end_level: float,
    accessible_only: bool = False, avoid_floor_changes: bool = False,
) -> dict[str, Any]:
    base = {"status": "NO_VERIFIED_WALKING_AREA", "route": None,
            "message": "At least one pin is not within 6 m of an independently reviewed, licensed, confirmed-open corridor on its selected floor. No indoor route has been guessed."}
    if not all(isfinite(v) for v in (start_lon,start_lat,start_level,end_lon,end_lat,end_level)):
        return {**base,"status":"INVALID_COORDINATES"}
    if not (-180 <= start_lon <= 180 and -180 <= end_lon <= 180 and -90 <= start_lat <= 90 and -90 <= end_lat <= 90):
        return {**base,"status":"INVALID_COORDINATES"}
    if not network["edges"]:
        return {**base,"status":"DATA_NOT_AVAILABLE","message":"No licensed, surveyed PATH corridor data is loaded. Approximate surface map pins cannot become indoor navigation points."}
    first = _snap(network,start_lon,start_lat,start_level,accessible_only)
    last = _snap(network,end_lon,end_lat,end_level,accessible_only)
    if first is None or last is None:
        return base
    if first["edge"]["id"] == last["edge"]["id"] and abs(first["fraction"]-last["fraction"]) < 1e-7:
        return {"status":"VERIFIED_SEGMENTS_ROUTE","route":{"distance_m":0,"nodes":[],"labels":[],"steps":[],"floor_changes":0,"time_minutes":None},
                "message":"Both pins match the same reviewed walking position."}
    graph = deepcopy(network)
    # For live navigation do not silently traverse connections whose current
    # operational status is unknown, even though the older research API can
    # expose them with explicit warnings.
    graph["edges"] = [e for e in graph["edges"] if e["operational_status"] == "CONFIRMED_OPEN"]
    new_nodes=[]
    cuts: dict[str,list[tuple[float,str]]] = {}
    endpoints=[]
    for ident,snap,floor in (("__pin_start",first,start_level),("__pin_end",last,end_level)):
        frac=snap["fraction"]
        edge=snap["edge"]
        if frac <= 1e-8:
            endpoints.append(edge["from"])
            continue
        if frac >= 1-1e-8:
            endpoints.append(edge["to"])
            continue
        endpoints.append(ident)
        new_nodes.append({"id":ident, "name":"Chosen walking start" if ident == "__pin_start" else "Chosen walking destination",
                          "kind":"junction", "level":floor, "lon":snap["point"][0],"lat":snap["point"][1],
                          "position_status":"VERIFIED_JUNCTION","source_ids":[edge["source_id"]]})
        cuts.setdefault(edge["id"],[]).append((frac,ident))
    new_edges=[]
    for edge in graph["edges"]:
        if edge["id"] not in cuts:
            new_edges.append(edge)
            continue
        positions = [(0.0,edge["from"])]+sorted(cuts[edge["id"]])+[(1.0,edge["to"])]
        for i,(left,right) in enumerate(zip(positions,positions[1:])):
            a,from_id=left
            b,to_id=right
            if b-a <= 1e-8:
                # A pin on an existing junction needs no zero-length edge.
                # Substituting the endpoint ID safely supports exact-vertex pins.
                continue
            sub=deepcopy(edge)
            sub.update({"id":f"{edge['id']}__part_{i}","from":from_id,"to":to_id,
                        "length_m":edge["length_m"]*(b-a),
                        "geometry":_geometry_between(edge["geometry"],a,b)})
            new_edges.append(sub)
    graph["nodes"].extend(new_nodes)
    graph["edges"]=new_edges
    route=shortest_indoor_route(graph,endpoints[0],endpoints[1],accessible_only,avoid_floor_changes)
    if route is None:
        return {**base,"status":"NO_VERIFIED_CONNECTION","message":"No fully reviewed and traversable connection exists between these snapped pins under the chosen restrictions."}
    ids,edges=route
    nodes={node["id"]:node for node in graph["nodes"]}
    steps=route_steps(nodes,ids,edges)
    return {"status":"VERIFIED_SEGMENTS_ROUTE","route":{
        "nodes":ids,"labels":[nodes[node]["name"] for node in ids],"steps":steps,
        "time_minutes":None,"distance_m":round(sum(edge["length_m"] for edge in edges),1),
        "floor_changes":sum(nodes[a]["level"]!=nodes[b]["level"] for a,b in zip(ids,ids[1:]))},
        "message":"Both pins snapped to reviewed, source-licensed, confirmed-open walking segments. Verify real-time closures before following directions."}

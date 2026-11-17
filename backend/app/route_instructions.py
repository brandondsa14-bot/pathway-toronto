"""Geometry-derived turn cues, only for sourced, evidence-validated walking edges.

NEVER calculate turns from a building name, schematic edge or straight line between
unconnected sites. All output geometry is direction-correct for reversed travel.
"""
from __future__ import annotations

from math import atan2, cos, degrees, radians

VERBS = {
    "corridor": "Follow the surveyed corridor",
    "door": "Go through the documented doorway",
    "stairs": "Use the documented stairs",
    "elevator": "Take the documented elevator",
    "escalator": "Use the documented escalator",
    "ramp": "Use the surveyed ramp",
}


def _bearing(a: list[float], b: list[float]) -> float | None:
    """Approximate local bearing: adequate to label turns, NOT for survey lengths."""
    dx = (b[0] - a[0]) * cos(radians((a[1] + b[1]) / 2.0))
    dy = b[1] - a[1]
    if abs(dx) + abs(dy) < 1e-12:
        return None
    return (degrees(atan2(dx, dy)) + 360) % 360


def _turn(previous: float | None, next_bearing: float | None) -> str:
    if previous is None or next_bearing is None:
        return "CONTINUE"
    delta = ((next_bearing - previous + 540) % 360) - 180
    if abs(delta) < 25:
        return "CONTINUE"
    if abs(delta) >= 155:
        return "TURN_AROUND"
    return "TURN_RIGHT" if delta > 0 else "TURN_LEFT"


def _headings(line: list[list[float]]) -> list[tuple[int,float]]:
    bearings = []
    for i in range(len(line) - 1):
        bearing = _bearing(line[i], line[i + 1])
        if bearing is not None:
            bearings.append((i, bearing))
    return bearings


def route_steps(nodes: dict, ids: list[str], edges: list[dict]) -> list[dict]:
    steps = []
    prev_last_bearing: float | None = None
    for index, edge in enumerate(edges):
        a, b = ids[index], ids[index + 1]
        if (a, b) == (edge["from"], edge["to"]):
            geometry = edge["geometry"]
        elif (a, b) == (edge["to"], edge["from"]):
            geometry = list(reversed(edge["geometry"]))
        else:
            raise ValueError("Traversed edge endpoints do not match path nodes")
        origin, dest = nodes[a], nodes[b]
        headings = _headings(geometry)
        first = headings[0][1] if headings else None
        last = headings[-1][1] if headings else None
        turn = _turn(prev_last_bearing, first)
        floor_change = origin["level"] != dest["level"]
        floor_text = (f" on level {origin['level']}" if not floor_change else
                      f" from level {origin['level']} to level {dest['level']}")
        name = str(edge.get("corridor_name") or "").strip()[:100]
        prefix = {"TURN_LEFT": "Turn left. ", "TURN_RIGHT": "Turn right. ", "TURN_AROUND": "Turn around. "}.get(turn, "")
        intro = f"{VERBS[edge['kind']]}{floor_text}"
        if name:
            intro += f" via {name}"
        instruction = f"{prefix}{intro}: {origin['name']} → {dest['name']}."
        # Only emit interior bend maneuvers when the licensed line actually has
        # at least three distinct surveyed positions.
        bends = []
        for i in range(1, len(headings)):
            at, bearing = headings[i]
            change = _turn(headings[i - 1][1], bearing)
            if change != "CONTINUE":
                bends.append({"at": geometry[at], "turn": change,
                              "instruction": change.replace("_", " ").capitalize() + " at the surveyed corridor bend."})
        steps.append({
            "from": a, "to": b, "instruction": instruction,
            "turn": turn, "maneuvers": bends, "corridor_name": name or None,
            "kind": edge["kind"], "length_m": edge["length_m"],
            "floor_from": origin["level"], "floor_to": dest["level"],
            "accessible": edge["accessible"], "geometry": geometry,
            "verified_on": edge["verified_on"], "source_id": edge["source_id"],
            "operational_status": edge["operational_status"], "edge_id": edge["id"],
        })
        if last is not None:
            prev_last_bearing = last
    return steps

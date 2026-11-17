"""Evidence-linked, direction-correct route steps. Only call for validated graphs."""
from __future__ import annotations

VERBS = {
    "corridor": "Follow the surveyed corridor",
    "door": "Go through the documented doorway",
    "stairs": "Use the documented stairs",
    "elevator": "Take the documented elevator",
    "escalator": "Use the documented escalator",
    "ramp": "Use the surveyed ramp",
}


def route_steps(nodes: dict, ids: list[str], edges: list[dict]) -> list[dict]:
    steps = []
    for index, edge in enumerate(edges):
        a, b = ids[index], ids[index + 1]
        if (a, b) == (edge["from"], edge["to"]):
            geometry = edge["geometry"]
        elif (a, b) == (edge["to"], edge["from"]):
            geometry = list(reversed(edge["geometry"]))
        else:
            raise ValueError("Traversed edge endpoints do not match path nodes")
        origin, dest = nodes[a], nodes[b]
        floor_text = (f" on level {origin['level']}" if origin["level"] == dest["level"]
                      else f" from level {origin['level']} to level {dest['level']}")
        steps.append({
            "from": a, "to": b, "instruction": f"{VERBS[edge['kind']]}{floor_text}: {origin['name']} → {dest['name']}.",
            "kind": edge["kind"], "length_m": edge["length_m"],
            "floor_from": origin["level"], "floor_to": dest["level"],
            "accessible": edge["accessible"], "geometry": geometry,
            "verified_on": edge["verified_on"], "source_id": edge["source_id"],
            "operational_status": edge["operational_status"], "edge_id": edge["id"],
        })
    return steps

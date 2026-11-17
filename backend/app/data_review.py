"""Read-only review of route-readiness evidence; no import, sampling, or coordinates.

The City diagram is NOT a licence to reproduce its geometry. A source listing a
place by name does not establish a surveyed entrance or PATH connection.
"""
from __future__ import annotations
import json
from pathlib import Path
from .indoor_network import INDOOR_PATH, SOURCES_PATH, load_network

QUEUE_PATH = INDOOR_PATH.with_name("review_queue.json")
VALID_STATUSES = {"NEEDS_PRIMARY_EVIDENCE", "IN_REVIEW", "REJECTED", "READY_FOR_GEOMETRY_REVIEW"}


def evidence_report(queue_path: Path = QUEUE_PATH) -> dict:
    network = load_network()  # Enforces graph and source licensing rules first.
    sources = json.loads(SOURCES_PATH.read_text(encoding="utf8"))
    queue = json.loads(queue_path.read_text(encoding="utf8"))
    if queue.get("schema_version") != "1.0" or not isinstance(queue.get("items"), list):
        raise ValueError("Invalid evidence-review queue")
    anchors = {node["id"] for node in network["nodes"]}
    source_ids = {src["id"] for src in sources.get("sources", [])}
    seen: set[str] = set()
    for item in queue["items"]:
        ident = item.get("id")
        if ident not in anchors or ident in seen:
            raise ValueError(f"Invalid or repeated review anchor: {ident}")
        seen.add(ident)
        if item.get("review_status") not in VALID_STATUSES:
            raise ValueError(f"Invalid review status for {ident}")
        if not isinstance(item.get("evidence_needed"), list) or not item["evidence_needed"]:
            raise ValueError(f"Missing evidence checklist for {ident}")
        if not isinstance(item.get("source_ids"), list) or not item["source_ids"] or set(item["source_ids"]) - source_ids:
            raise ValueError(f"Unknown source for {ident}")
        if item.get("licensed_geometry_received") not in (True, False):
            raise ValueError(f"Invalid licence status for {ident}")
    return {
        "network_id": network["network_id"],
        "documented_place_names": len(network["nodes"]),
        "verified_routable_edges": len(network["edges"]),
        "review_items": len(queue["items"]),
        "needing_primary_evidence": sum(x["review_status"] == "NEEDS_PRIMARY_EVIDENCE" for x in queue["items"]),
        "routable_data_available": bool(network["edges"]),
        "message": "Research queue only; no public-use route can be inferred from a diagram or listing.",
    }


if __name__ == "__main__":
    print(json.dumps(evidence_report(), indent=2))

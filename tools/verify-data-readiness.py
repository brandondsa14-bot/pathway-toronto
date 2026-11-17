"""Read-only status report: never assert that a legal entitlement is present."""
from __future__ import annotations
import json
from app.indoor_network import load_network
from app.spatial_scene import publish_scene


def report() -> dict:
    graph = load_network()  # fail if source validation fails
    scene = publish_scene(graph)
    return {
        "network_id": graph["network_id"],
        "documented_place_names": len(graph["nodes"]),
        "licensed_reviewed_scene_segments": scene["feature_count"],
        "reviewed_floor_levels": scene["levels"],
        "real_indoor_navigation_available": bool(scene["features"]),
        "physical_site_verification": "NOT_ESTABLISHED_BY_AUTOMATED_TESTS",
        "release_status": "RESEARCH_ONLY" if not scene["features"] else "REQUIRES_MANUAL_FIELD_QA",
    }

if __name__ == "__main__":
    print(json.dumps(report(), indent=2))

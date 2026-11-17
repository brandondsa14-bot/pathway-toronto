import copy
import pytest
from app.indoor_network import validate_network, load_network, shortest_indoor_route, NetworkValidationError


def test_production_has_no_verified_edges():
    network = load_network()
    assert len(network["edges"]) == 0
    assert all(n["position_status"] == "NAME_ONLY" for n in network["nodes"])
    assert shortest_indoor_route(network, "cibc_square", "nathan_phillips_square") is None


def test_reject_unlicensed_fabricated_edge():
    network = copy.deepcopy(load_network())
    network["edges"] = [{"id": "invented", "from": "cibc_square", "to": "union_station", "review_status": "VERIFIED", "verified_on": "2026-11-16", "source_id": "toronto-path-2026", "kind": "corridor", "accessible": True, "length_m": 1, "geometry": [[-79.3, 43.64], [-79.3, 43.65]]}]
    # A real route cannot start/end at source-listed names without verified positions.
    registry = {"sources": [{"id": "toronto-path-2026", "routable_geometry_provided": False, "redistribution_authorized": False}]}
    with pytest.raises(NetworkValidationError):
        validate_network(network, registry)


def test_synthetic_fixture_validates_but_is_not_shipped_in_production():
    registry = {"sources": [{"id": "test-only-original-survey", "routable_geometry_provided": True, "redistribution_authorized": True}]}
    nodes = [{"id": i, "name": i, "kind": "junction", "level": level, "lat": 43.64, "lon": -79.38, "position_status": "VERIFIED_JUNCTION", "source_ids": ["test-only-original-survey"]} for i, level in [("a", -1), ("b", -1), ("c", -2)]]
    def edge(i, a, b, kind, distance, access):
        return {"id": i, "from": a, "to": b, "kind": kind, "length_m": distance, "accessible": access, "verified_on": "2026-11-16", "review_status": "VERIFIED", "source_id": "test-only-original-survey", "geometry": [[-79.3801, 43.64],[-79.38,43.6401]], "direction": "BOTH", "operational_status": "UNKNOWN"}
    graph = validate_network({"schema_version": "1.0", "nodes": nodes, "edges": [edge("ab", "a", "b", "corridor", 10, True), edge("bc", "b", "c", "stairs", 4, False)]}, registry)
    assert shortest_indoor_route(graph, "a", "c")[0] == ["a", "b", "c"]
    assert shortest_indoor_route(graph, "a", "c", accessible_only=True) is None
    assert shortest_indoor_route(graph, "a", "c", avoid_floor_changes=True) is None
    assert shortest_indoor_route(graph, "a", "b", accessible_only=True)[0] == ["a", "b"]
    bad = copy.deepcopy(graph)
    bad["edges"][1]["kind"] = "corridor"  # a floor change without a vertical connector
    with pytest.raises(NetworkValidationError):
        validate_network(bad, registry)

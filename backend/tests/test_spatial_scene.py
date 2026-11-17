"""Only unit-test fabricated geometry; production must not contain it."""
from fastapi.testclient import TestClient
from app.main import app
from app.indoor_network import load_network, validate_network, NetworkValidationError
from app.spatial_scene import publish_scene, snap_to_reviewed_node
import copy
import pytest


def graph():
    lon, lat = -79.38, 43.646
    source = {"sources": [{"id": "test-survey-only", "routable_geometry_provided": True, "redistribution_authorized": True}]}
    nodes = [
        {"id": name, "name": name, "kind": "junction", "level": level,
         "lon": lon + dx, "lat": lat, "position_status": "VERIFIED_JUNCTION", "source_ids": ["test-survey-only"]}
        for name, dx, level in (("a", 0, -1), ("b", .0001, -1), ("c", .0001, -2))
    ]
    edges = [
        {"id": "ab", "from": "a", "to": "b", "kind": "corridor", "length_m": 10,
         "accessible": True, "verified_on": "2026-11-16", "review_status": "VERIFIED",
         "source_id": "test-survey-only", "geometry": [[lon, lat], [lon + .0001, lat]],
         "direction": "BOTH", "operational_status": "CONFIRMED_OPEN"},
        {"id": "bc", "from": "b", "to": "c", "kind": "elevator", "length_m": 3,
         "accessible": True, "verified_on": "2026-11-16", "review_status": "VERIFIED",
         "source_id": "test-survey-only", "geometry": [[lon + .0001, lat], [lon + .0001, lat]],
         "direction": "BOTH", "operational_status": "UNKNOWN"},
    ]
    return validate_network({"schema_version": "1.0", "nodes": nodes, "edges": edges}, source)


def test_production_never_serves_fictional_corridors():
    c = TestClient(app)
    body = c.get('/api/v2/indoor/scene').json()
    assert body['status'] == 'NO_LICENSED_INDOOR_GEOMETRY'
    assert body['feature_count'] == 0 and body['features'] == [] and body['nodes'] == []
    assert body['can_place_pin'] is False
    bad_pin = c.get('/api/v2/indoor/snap?lon=-79.38&lat=43.646&level=-1').json()
    assert bad_pin['node'] is None and bad_pin['status'] == 'NO_VERIFIED_WALKING_AREA'


def test_licensed_test_fixture_projects_floor_specific_features():
    scene = publish_scene(graph())
    assert scene['levels'] == [-2, -1] and scene['feature_count'] == 2
    assert scene['features'][0]['properties']['source_id'] == 'test-survey-only'
    assert len(scene['nodes']) == 3
    assert snap_to_reviewed_node(graph(), -79.38, 43.646, -1)['node']['id'] == 'a'
    assert snap_to_reviewed_node(graph(), -79.2, 43.646, -1)['node'] is None
    assert snap_to_reviewed_node(graph(), -79.38, 43.646, 9)['node'] is None


def test_closure_removed_from_visual_and_pin_network():
    fixture = graph()
    fixture['edges'][0]['operational_status'] = 'CONFIRMED_CLOSED'
    scene = publish_scene(fixture)
    assert scene['feature_count'] == 1
    assert {n['id'] for n in scene['nodes']} == {'b', 'c'}
    assert snap_to_reviewed_node(fixture, -79.38, 43.646, -1)['node'] is None


def test_unlicensed_geometry_never_passes_validation():
    g = copy.deepcopy(graph())
    with pytest.raises(NetworkValidationError):
        validate_network(g, {'sources': [{'id': 'test-survey-only', 'routable_geometry_provided': False}]})

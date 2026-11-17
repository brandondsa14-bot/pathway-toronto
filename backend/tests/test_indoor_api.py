from fastapi.testclient import TestClient
from app.main import app
import app.indoor_api as api

c = TestClient(app)


def test_coverage_reports_no_verified_graph():
    r = c.get('/api/v2/indoor/coverage')
    assert r.status_code == 200
    data = r.json()
    assert data['verified_edge_count'] == 0
    assert data['available_levels'] == []
    assert any(p['id'] == 'cibc_square' for p in data['places'])
    assert all(not p['has_verified_entry'] for p in data['places'])


def test_cibc_to_nathan_phillips_not_invented():
    r = c.get('/api/v2/indoor/route', params={'start': 'cibc_square', 'end': 'nathan_phillips_square', 'accessible_only': 'true'})
    assert r.status_code == 200
    data = r.json()
    assert data['status'] == 'DATA_NOT_AVAILABLE'
    assert data['route'] is None
    assert data['requested']['indoor_only'] is True
    assert data['requested']['accessible_only'] is True
    assert 'closest PATH exit' in data['message']


def test_unknown_place_fails_closed():
    r = c.get('/api/v2/indoor/route', params={'start': 'fictional_corridor', 'end': 'union_station'})
    assert r.status_code == 404
    assert r.json()['detail']['status'] == 'UNKNOWN_PLACE'


def test_demo_does_not_leak_into_indoor_routes():
    v1 = c.get('/api/v1/route', params={'start': 'union', 'end': 'rbp', 'mode': 'demo'})
    assert v1.json()['status'] == 'ILLUSTRATIVE_ONLY'
    v2 = c.get('/api/v2/indoor/route', params={'start': 'union_station', 'end': 'royal_bank_plaza'})
    assert v2.json()['status'] == 'DATA_NOT_AVAILABLE'
    assert v2.json()['route'] is None


def test_verified_test_only_graph_can_produce_steps(monkeypatch):
    # Inject a synthetic, **unit-test-only** graph. It never becomes application data.
    monkeypatch.setattr(api, 'load_network', lambda: {
        'network_id': 'unit-test-only',
        'nodes': [
            {'id': 'a', 'name': 'Test entry', 'kind': 'entrance', 'level': -1, 'position_status': 'VERIFIED_ENTRY'},
            {'id': 'b', 'name': 'Test junction', 'kind': 'junction', 'level': -1, 'position_status': 'VERIFIED_JUNCTION'},
        ],
        'edges': [
            {'id': 't1', 'from': 'a', 'to': 'b', 'kind': 'corridor', 'length_m': 42.0, 'accessible': True, 'geometry': [[-79.38, 43.64], [-79.379, 43.64]], 'verified_on': '2026-11-16', 'source_id': 'unit-test-only'}
        ],
    })
    r = c.get('/api/v2/indoor/route', params={'start': 'a', 'end': 'b', 'accessible_only': 'true'})
    assert r.status_code == 200
    body = r.json()
    assert body['status'] == 'VERIFIED_SEGMENTS_ROUTE'
    assert body['route']['distance_m'] == 42.0
    assert body['route']['floor_changes'] == 0
    assert len(body['route']['steps']) == 1

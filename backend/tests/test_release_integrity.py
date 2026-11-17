from fastapi.testclient import TestClient
from app.main import app
from app.spatial_scene import publish_scene
from app.indoor_network import load_network


def test_production_data_fail_closed_api_contract():
    client = TestClient(app)
    coverage = client.get('/api/v2/indoor/coverage').json()
    scene = client.get('/api/v2/indoor/scene').json()
    assert coverage['verified_edge_count'] == len(scene['features']) == 0
    assert coverage['available_levels'] == scene['levels'] == []
    assert scene['nodes'] == [] and scene['can_place_pin'] is False
    response = client.get('/api/v2/indoor/route', params={'start':'cibc_square','end':'nathan_phillips_square'})
    assert response.status_code == 200
    assert response.json()['status'] == 'DATA_NOT_AVAILABLE'
    assert response.json()['route'] is None
    assert response.json()['verified_edge_count'] == 0
    invalid = client.get('/api/v2/indoor/route', params={'start':'union_station','end':'tim-rbp'})
    assert invalid.status_code == 404
    assert invalid.json()['detail']['status'] == 'UNKNOWN_PLACE'


def test_source_names_are_not_geometry():
    network = load_network()
    scene = publish_scene(network)
    assert len(network['nodes']) == 6
    assert not network['edges'] and not scene['features']
    assert all(n['level'] is None and n['lat'] is None and n['lon'] is None for n in network['nodes'])

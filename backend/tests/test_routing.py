from fastapi.testclient import TestClient
from app.main import app
from app.routing import astar
c=TestClient(app)

def test_verified_route_refuses_to_invent_geometry():
    r=c.get('/api/v1/route',params={'start':'union','end':'rbp'})
    assert r.status_code==422 and 'not available' in r.json()['detail']

def test_source_descriptions_have_provenance_and_no_fake_coordinates():
    r=c.get('/api/v1/entrances')
    assert r.status_code==200
    assert len(r.json()['entrances'])>=3
    assert all(item['coordinate'] is None and item['source_id'] for item in r.json()['entrances'])
    assert r.json()['verified_corridor_edges']==[]

def test_demo_shortest_weighted_path():
    r=c.get('/api/v1/route',params={'mode':'demo','start':'union','end':'commerce'})
    assert r.status_code==200
    assert r.json()['nodes']==['union','rbp','brookfield','commerce']
    assert r.json()['total_cost']==350
    assert r.json()['cost_unit']=='synthetic_units'

def test_restrictions_can_block_stairs():
    r=c.get('/api/v1/route',params={'mode':'demo','start':'union','end':'td','accessible':'true'})
    assert r.status_code==200
    assert r.json()['nodes']==['union','rbp','brookfield','commerce','td']
    assert r.json()['total_cost']==450

def test_prevent_made_up_walking_times():
    data=c.get('/api/v1/route',params={'mode':'demo','start':'union','end':'rbp'}).json()
    assert 'walking_time' not in data and 'metres' not in data['cost_unit']

def test_disconnected_graph():
    ns=[{'id':'a'},{'id':'b'}]
    assert astar(ns,[],'a','b') is None

def test_identical_start_end():
    data=c.get('/api/v1/route',params={'mode':'demo','start':'rbp','end':'rbp'}).json()
    assert data['nodes']==['rbp'] and data['total_cost']==0

def test_bad_edge_cost_rejected():
    import pytest
    with pytest.raises(ValueError):astar([{'id':'a'},{'id':'b'}],[{'from':'a','to':'b','cost':-1}],'a','b')

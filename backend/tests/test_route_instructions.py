import copy
import pytest
from fastapi.testclient import TestClient
from app.main import app
import app.indoor_api as api
from app.indoor_network import validate_network, shortest_indoor_route, NetworkValidationError
from app.route_instructions import route_steps

SOURCE = {'sources': [{'id':'unit-test-original-not-production','routable_geometry_provided':True,'redistribution_authorized':True}]}


def fixture():
    coords = {'a': (-79.3800, 43.6400, -1), 'b': (-79.3799, 43.6400, -1), 'c': (-79.3799, 43.6401, -2)}
    nodes = [{'id':ident,'name':ident.upper(), 'kind':'junction','level':z,'lon':lon,'lat':lat,'position_status':'VERIFIED_JUNCTION','source_ids':['unit-test-original-not-production']} for ident,(lon,lat,z) in coords.items()]
    def edge(eid,a,b,kind,length,accessible=True,direction='BOTH',operation='UNKNOWN'):
        return {'id':eid,'from':a,'to':b,'kind':kind,'length_m':length,'accessible':accessible,'review_status':'VERIFIED','verified_on':'2026-11-16',
          'source_id':'unit-test-original-not-production','geometry':[[coords[a][0],coords[a][1]],[coords[b][0],coords[b][1]]], 'direction':direction,'operational_status':operation}
    return {'network_id':'TEST_ONLY_DO_NOT_DEPLOY','schema_version':'1.0','nodes':nodes,'edges':[edge('ab','a','b','corridor',10),edge('bc','b','c','elevator',15)]}, edge


def test_direction_and_floor_instructions_include_reversed_line():
    graph,_ = fixture()
    validated=validate_network(graph, SOURCE)
    ids,edges=shortest_indoor_route(validated,'c','a')
    assert ids == ['c','b','a']
    steps=route_steps({n['id']:n for n in graph['nodes']},ids,edges)
    assert 'elevator' in steps[0]['instruction']
    assert 'from level -2 to level -1' in steps[0]['instruction']
    assert steps[0]['geometry'] == list(reversed(graph['edges'][1]['geometry']))
    assert steps[1]['geometry'] == list(reversed(graph['edges'][0]['geometry']))
    assert sum(step['length_m'] for step in steps)==25


def test_closed_edge_blocks_all_routing():
    graph,_=fixture()
    graph['edges'][1]['operational_status']='CONFIRMED_CLOSED'
    validate_network(graph,SOURCE)
    assert shortest_indoor_route(graph,'a','c') is None
    assert shortest_indoor_route(graph,'a','b')[0]==['a','b']


def test_one_way_transition_prevents_wrong_direction():
    graph,_=fixture()
    graph['edges'][1]['direction']='FORWARD'
    validate_network(graph,SOURCE)
    assert shortest_indoor_route(graph,'a','c')[0]==['a','b','c']
    assert shortest_indoor_route(graph,'c','a') is None


def test_unsupported_accessibility_and_avoiding_floor_changes():
    graph,_=fixture()
    assert shortest_indoor_route(graph,'a','c',accessible_only=True)[0]==['a','b','c']
    assert shortest_indoor_route(graph,'a','c',avoid_floor_changes=True) is None
    graph['edges'][1]['accessible']=None
    assert shortest_indoor_route(graph,'a','c',accessible_only=True) is None


def test_rejects_bad_direction_and_geometry_endpoint_mismatch():
    graph,_=fixture()
    graph['edges'][0]['direction']='UNKNOWN'
    with pytest.raises(NetworkValidationError, match='travel direction'):
        validate_network(graph,SOURCE)
    graph,_=fixture()
    graph['edges'][0]['geometry'][0]=[-79.90, 43.64]
    with pytest.raises(NetworkValidationError, match='endpoint coordinates'):
        validate_network(graph,SOURCE)


def test_reverse_api_serializes_reverse_lines_and_no_time(monkeypatch):
    graph,_=fixture()
    monkeypatch.setattr(api,'load_network',lambda:graph)
    response=TestClient(app).get('/api/v2/indoor/route',params={'start':'c','end':'a','accessible_only':True})
    assert response.status_code==200
    data=response.json()
    assert data['status']=='VERIFIED_SEGMENTS_ROUTE'
    assert data['route']['distance_m']==25
    assert data['route']['time_minutes'] is None
    assert data['route']['steps'][0]['geometry'][0]==graph['edges'][1]['geometry'][-1]


def test_health_reports_real_coverage_zero():
    payload=TestClient(app).get('/health').json()
    assert payload['verified_indoor_edges']==0
    assert 'synthetic' in payload['data_mode']

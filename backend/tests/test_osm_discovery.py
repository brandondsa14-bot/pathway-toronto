"""All example OSM objects below are fabricated test fixtures, NOT Toronto POIs."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from app.main import app
from app import osm_candidates
from app.indoor_network import validate_network, NetworkValidationError
from app.route_instructions import route_steps

IMPORTER = Path(__file__).resolve().parents[2] / "tools" / "import_osm_path_candidates.py"
spec = importlib.util.spec_from_file_location("test_osm_importer", IMPORTER)
assert spec and spec.loader
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


def synthetic_overpass():
    return {"elements": [
        {"type":"node","id":100,"lat":43.647,"lon":-79.380,"tags":{"amenity":"toilets","level":"-1","name":"Sample toilet"}},
        {"type":"node","id":101,"lat":43.648,"lon":-79.381,"tags":{"shop":"books","name":"Sample bookshop"}},
        {"type":"node","id":102,"lat":43.6471,"lon":-79.3801,"tags":{"highway":"steps","conveying":"yes","level":"-0.5"}},
        {"type":"node","id":103,"lat":43.648,"lon":-79.38,"tags":{"railway":"subway_entrance","level":"-2"}},
        {"type":"node","id":104,"lat":43.641,"lon":-79.38,"tags":{"amenity":"cafe","level":"-1;0"}},
        {"type":"node","id":105,"lat":44.00,"lon":-79.38,"tags":{"amenity":"cafe"}},
        {"type":"way","id":106,"center":{"lat":43.65,"lon":-79.38},"tags":{"building":"yes","name":"Example Building"},
         "geometry":[{"lon":-79.3802,"lat":43.6498},{"lon":-79.3798,"lat":43.6498},{"lon":-79.3798,"lat":43.6502},{"lon":-79.3802,"lat":43.6498}]},
    ]}


def test_osm_parser_categorizes_amenities_and_half_levels():
    snapshot = importer.parse_elements(synthetic_overpass(),"2026-11-17T00:00:00Z")
    items = {i['id']: i for i in snapshot['items']}
    assert len(items) == 6
    assert items['osm:node:100']['category'] == 'Washrooms'
    assert items['osm:node:100']['floor'] == -1
    assert items['osm:node:102']['category'] == 'Escalators'
    assert items['osm:node:102']['floor'] == -0.5
    assert items['osm:node:103']['category'] == 'Subway entrances'
    assert items['osm:node:104']['floor'] is None
    assert items['osm:way:106']['position_quality'] == 'OSM_FEATURE_CENTROID'
    assert len(items['osm:way:106']['geometry']) == 4
    assert all(i['verification_status'] == 'COMMUNITY_MAPPED_UNVERIFIED' for i in items.values())
    assert all('openstreetmap.org' in i['source_url'] for i in items.values())
    assert 'mappedin' not in json.dumps(snapshot).lower()


def test_discovery_search_filters_and_does_not_claim_verified_routes(tmp_path, monkeypatch):
    path = tmp_path / 'osm_candidates.json'
    path.write_text(json.dumps(importer.parse_elements(synthetic_overpass(), "2026-11-17T00:00:00Z")))
    monkeypatch.setattr(osm_candidates, 'SNAPSHOT_PATH', path)
    data = osm_candidates.load_snapshot()
    assert osm_candidates.explore_catalog(data, q='Sample',category='Shopping')['total']==1
    assert osm_candidates.explore_catalog(data, level='-0.5')['total']==1
    assert osm_candidates.explore_catalog(data, category='Washrooms', scope='POSSIBLE_PATH')['total']==1
    result = TestClient(app).get('/api/v2/indoor/explore',params={'level':'-2'}).json()
    assert result['returned'] == 1
    assert result['items'][0]['category'] == 'Subway entrances'
    # Imported candidates must NOT appear in the source-verified route network.
    route = TestClient(app).get('/api/v2/indoor/route',params={'start':'osm:node:100','end':'osm:node:103'})
    assert route.status_code == 404
    assert route.json()['detail']['status'] == 'UNKNOWN_PLACE'


def test_no_snapshot_is_explicit_not_fake(tmp_path, monkeypatch):
    monkeypatch.setattr(osm_candidates,'SNAPSHOT_PATH',tmp_path/'none.json')
    payload=TestClient(app).get('/api/v2/indoor/explore').json()
    assert payload['status']=='NO_OSM_SNAPSHOT'
    assert payload['total']==0 and payload['items']==[]


def test_reject_false_verified_claims(tmp_path):
    data=importer.parse_elements(synthetic_overpass(),'now')
    data['items'][0]['verification_status']='VERIFIED'
    path=tmp_path/'bad.json'
    path.write_text(json.dumps(data))
    with pytest.raises(ValueError,match='may not claim'):
        osm_candidates.load_snapshot(path)


def test_half_floor_is_allowed_only_in_source_reviewed_network():
    sources={'sources':[{'id':'test-only','redistribution_authorized':True,'routable_geometry_provided':True}]}
    lat,lon=43.646,-79.380
    nodes=[{'id':ident,'name':ident,'kind':'junction','position_status':'VERIFIED_JUNCTION',
        'source_ids':['test-only'],'lat':lat,'lon':lon,'level':level}
        for ident,level in [('a',-0.5),('b',-1.0)]]
    edge={'id':'e','from':'a','to':'b','kind':'elevator','review_status':'VERIFIED','verified_on':'2026-11-17',
      'direction':'BOTH','operational_status':'CONFIRMED_OPEN','accessible':True,'source_id':'test-only',
      'length_m':4,'geometry':[[lon,lat],[lon,lat]]}
    network={'schema_version':'1.0','nodes':nodes,'edges':[edge]}
    assert validate_network(network,sources)['nodes'][0]['level']==-0.5
    nodes[0]['level']=-0.25
    with pytest.raises(NetworkValidationError,match='floor'):
        validate_network(network,sources)


def test_true_geometry_turns_not_invented_street_names():
    nodes={name:{'name':name,'level':-1} for name in ('a','b','c')}
    def edge(name,a,b,geometry):
        return {'id':name,'from':a,'to':b,'geometry':geometry,'kind':'corridor','length_m':12,
            'accessible':True,'verified_on':'2026-11-17','source_id':'test-only','operational_status':'CONFIRMED_OPEN'}
    e1=edge('ab','a','b',[[-79.38,43.64],[-79.3799,43.64]]) # east
    e2=edge('bc','b','c',[[-79.3799,43.64],[-79.3799,43.6401]]) # north
    steps=route_steps(nodes,['a','b','c'],[e1,e2])
    assert steps[1]['turn']=='TURN_LEFT'
    assert 'Turn left' in steps[1]['instruction']
    assert 'Street' not in steps[1]['instruction']
    reverse=route_steps(nodes,['c','b','a'],[e2,e1])
    assert reverse[1]['turn']=='TURN_RIGHT'

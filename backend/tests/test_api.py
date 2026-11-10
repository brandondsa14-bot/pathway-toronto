from fastapi.testclient import TestClient
from app.main import app
c=TestClient(app)

def test_health():
    r=c.get('/health'); assert r.status_code==200 and r.json()['status']=='ok'

def test_legacy_route_still_works():
    r=c.get('/api/route',params={'start':'union','end':'rbp'});assert r.status_code==200
    assert r.json()['status']=='ILLUSTRATIVE_ONLY'

def test_unknown_demo_node():
    assert c.get('/api/v1/route',params={'start':'wrong','end':'rbp','mode':'demo'}).status_code==404

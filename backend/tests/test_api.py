from fastapi.testclient import TestClient
from app.main import app
client=TestClient(app)
def test_health():assert client.get('/health').json()['status']=='ok'
def test_route():
    r=client.get('/api/route',params={'start':'union','end':'commerce'})
    assert r.status_code==200
    assert r.json()['nodes']==['union','rbp','brookfield','commerce']
    assert r.json()['status']=='ILLUSTRATIVE_ONLY'
def test_invalid_node():assert client.get('/api/route',params={'start':'fake','end':'union'}).status_code==404

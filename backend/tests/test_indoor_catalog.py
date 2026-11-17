import copy
import json
from fastapi.testclient import TestClient
import pytest
from app.indoor_catalog import CATALOG_PATH, load_catalog, search_catalog
from app.main import app

client = TestClient(app)


def test_production_directory_has_no_surveyed_units():
    data = load_catalog()
    assert len(data["destinations"]) == 4
    assert all(d["level"] is None and d["lat"] is None and d["lon"] is None for d in data["destinations"])
    assert all(not d["navigation_ready"] for d in data["destinations"])


def test_search_filters_and_official_sources():
    assert [r["id"] for r in search_catalog("Mos Mos")] == ["mos-rbp"]
    assert [r["id"] for r in search_catalog(category="Fast food")] == ["wendys-rbp"]
    assert search_catalog("Not a tenant") == []


def test_catalog_api_is_searchable_but_does_not_claim_routes():
    response = client.get('/api/v2/indoor/catalog', params={'q':'Tim Hortons'})
    assert response.status_code == 200
    body = response.json()
    assert body['count'] == 1 and body['total'] == 4
    assert body['destinations'][0]['id'] == 'tim-rbp'
    assert body['destinations'][0]['location_status'] == 'BUILDING_LISTED_ONLY'
    assert body['destinations'][0]['navigation_ready'] is False
    blocked = client.get('/api/v2/indoor/route', params={'start':'union_station','end':'tim-rbp'})
    assert blocked.status_code == 404
    assert blocked.json()['detail']['status'] == 'UNKNOWN_PLACE'


def test_rejects_unverified_store_promoted_to_route(tmp_path):
    raw = json.loads(CATALOG_PATH.read_text())
    raw['destinations'][0]['level'] = -1
    raw['destinations'][0]['navigation_ready'] = True
    testfile = tmp_path / 'catalog.json'
    testfile.write_text(json.dumps(raw))
    with pytest.raises(ValueError, match="Unverified business"):
        load_catalog(testfile)


def test_rejects_invalid_link_scheme(tmp_path):
    raw = json.loads(CATALOG_PATH.read_text())
    raw['destinations'][0]['directory_url'] = 'javascript:alert(1)'
    testfile = tmp_path / 'catalog.json'
    testfile.write_text(json.dumps(raw))
    with pytest.raises(ValueError, match="Invalid HTTPS"):
        load_catalog(testfile)

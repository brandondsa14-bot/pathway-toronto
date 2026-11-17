import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.runtime_config import DEV_ORIGINS, allowed_origins


def test_local_origin_allowlist(monkeypatch):
    monkeypatch.delenv('PATHWAY_ALLOWED_ORIGINS', raising=False)
    monkeypatch.delenv('PATHWAY_ENV', raising=False)
    assert 'http://localhost:3000' in allowed_origins()
    assert 'http://localhost:3002' in allowed_origins()
    assert '*' not in allowed_origins()


def test_production_requires_https_explicit_origins(monkeypatch):
    monkeypatch.setenv('PATHWAY_ENV', 'production')
    monkeypatch.delenv('PATHWAY_ALLOWED_ORIGINS', raising=False)
    with pytest.raises(ValueError): allowed_origins()
    for bad in ('*', 'http://example.com', 'https://example.com/other', 'https://a.com?token=hidden'):
        monkeypatch.setenv('PATHWAY_ALLOWED_ORIGINS', bad)
        with pytest.raises(ValueError): allowed_origins()
    monkeypatch.setenv('PATHWAY_ALLOWED_ORIGINS','https://test.example.com,https://test.example.com')
    assert allowed_origins()==['https://test.example.com']


def test_security_headers_and_development_cors():
    c=TestClient(app)
    r=c.get('/api/v2/indoor/scene', headers={'Origin':'http://localhost:3000'})
    assert r.status_code==200
    assert r.headers['access-control-allow-origin']=='http://localhost:3000'
    assert r.headers['x-content-type-options']=='nosniff'
    assert r.headers['cache-control']=='no-store'
    assert r.headers['permissions-policy'].startswith('camera=()')
    remote=c.get('/health',headers={'Origin':'https://untrusted.example.org'})
    assert remote.headers.get('access-control-allow-origin') is None

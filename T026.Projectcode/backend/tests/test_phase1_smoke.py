"""Phase 1 smoke tests.

These verify the application boots, public endpoints respond, and
protected endpoints correctly reject unauthenticated/invalid requests.
Tests for registration, item creation, and matching are added in the
phases that implement those features.
"""


def test_root_ok(client):
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_health_ok(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "healthy"}


def test_dashboard_stats_requires_auth(client):
    res = client.get("/api/dashboard/stats")
    assert res.status_code == 401


def test_auth_me_requires_auth(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_dashboard_stats_rejects_invalid_token(client):
    res = client.get(
        "/api/dashboard/stats",
        headers={"Authorization": "Bearer not-a-real-jwt"},
    )
    assert res.status_code == 401


def test_openapi_docs_available(client):
    res = client.get("/openapi.json")
    assert res.status_code == 200
    paths = res.json()["paths"]
    assert "/api/dashboard/stats" in paths
    assert "/api/auth/me" in paths

"""Phase 2 tests: Lost/Found Reporting API.

These cover authentication/authorization guarding and request validation,
which don't require a live Supabase connection (consistent with
test_phase1_smoke.py's approach in this sandbox). Full create/read/update
flows against a real database should be exercised manually against a real
Supabase project — see the "How to manually test" section in the delivery
notes.
"""

import time

import jwt

TEST_JWT_SECRET = "test-jwt-secret-for-pytest"  # matches conftest.py
SAMPLE_ITEM_ID = "11111111-1111-1111-1111-111111111111"


def _make_token(sub: str = SAMPLE_ITEM_ID) -> str:
    payload = {
        "sub": sub,
        "email": "tester@example.com",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


AUTH_HEADER = {"Authorization": f"Bearer {_make_token()}"}

VALID_ITEM_PAYLOAD = {
    "report_type": "LOST",
    "item_name": "Blue backpack",
    "category": "Bags",
    "description": "A blue backpack with a broken zipper on the front pocket.",
    "location": "Main library, 2nd floor",
    "date_reported": "2026-01-01",
    "image_url": "https://example.supabase.co/storage/v1/object/public/item-images/demo.jpg",
}


# --- Authentication guarding -------------------------------------------------


def test_create_item_requires_auth(client):
    res = client.post("/api/items", json=VALID_ITEM_PAYLOAD)
    assert res.status_code == 401


def test_get_my_items_requires_auth(client):
    res = client.get("/api/items/mine")
    assert res.status_code == 401


def test_get_item_requires_auth(client):
    res = client.get(f"/api/items/{SAMPLE_ITEM_ID}")
    assert res.status_code == 401


def test_update_item_status_requires_auth(client):
    res = client.patch(f"/api/items/{SAMPLE_ITEM_ID}/status", json={"status": "RECOVERED"})
    assert res.status_code == 401


def test_endpoints_reject_invalid_token(client):
    headers = {"Authorization": "Bearer not-a-real-jwt"}
    assert client.post("/api/items", json=VALID_ITEM_PAYLOAD, headers=headers).status_code == 401
    assert client.get("/api/items/mine", headers=headers).status_code == 401
    assert client.get(f"/api/items/{SAMPLE_ITEM_ID}", headers=headers).status_code == 401


# --- Request validation (runs before any Supabase call is made) -------------


def test_create_item_rejects_missing_fields(client):
    res = client.post("/api/items", json={}, headers=AUTH_HEADER)
    assert res.status_code == 422


def test_create_item_rejects_invalid_category(client):
    payload = {**VALID_ITEM_PAYLOAD, "category": "Not-A-Real-Category"}
    res = client.post("/api/items", json=payload, headers=AUTH_HEADER)
    assert res.status_code == 422


def test_create_item_rejects_invalid_report_type(client):
    payload = {**VALID_ITEM_PAYLOAD, "report_type": "MISSING"}
    res = client.post("/api/items", json=payload, headers=AUTH_HEADER)
    assert res.status_code == 422


def test_create_item_rejects_invalid_date(client):
    payload = {**VALID_ITEM_PAYLOAD, "date_reported": "not-a-date"}
    res = client.post("/api/items", json=payload, headers=AUTH_HEADER)
    assert res.status_code == 422


def test_update_status_rejects_invalid_status(client):
    res = client.patch(
        f"/api/items/{SAMPLE_ITEM_ID}/status",
        json={"status": "LOST_FOREVER"},
        headers=AUTH_HEADER,
    )
    assert res.status_code == 422


def test_update_status_rejects_missing_body(client):
    res = client.patch(f"/api/items/{SAMPLE_ITEM_ID}/status", json={}, headers=AUTH_HEADER)
    assert res.status_code == 422


# --- Route registration -------------------------------------------------------


def test_items_routes_registered(client):
    res = client.get("/openapi.json")
    assert res.status_code == 200
    paths = res.json()["paths"]
    assert "/api/items" in paths
    assert "/api/items/mine" in paths
    assert "/api/items/{item_id}" in paths
    assert "/api/items/{item_id}/status" in paths

"""Phase 5 & 6 tests: Multi-Modal Matching and Notifications API.

Tests similarity calculations, date decay formulas, location fuzzy comparisons,
OpenAPI route registrations, and authentication protection.
"""

from datetime import date, timedelta
import math

from app.services.image_matching import cosine_similarity as img_cosine_sim
from app.services.text_matching import cosine_similarity as txt_cosine_sim
from app.services.hybrid_matching import (
    calculate_date_similarity,
    calculate_location_similarity,
)

SAMPLE_ITEM_ID = "11111111-1111-1111-1111-111111111111"


# --- Unit Tests: Similarity Calculations -------------------------------------


def test_cosine_similarity_identical_vectors():
    vec = [1.0, 2.0, 3.0, 4.0]
    sim = img_cosine_sim(vec, vec)
    assert round(sim, 2) == 100.0

    txt_sim = txt_cosine_sim(vec, vec)
    assert round(txt_sim, 2) == 100.0


def test_cosine_similarity_orthogonal_vectors():
    vec_a = [1.0, 0.0]
    vec_b = [0.0, 1.0]
    sim = img_cosine_sim(vec_a, vec_b)
    assert sim == 0.0


def test_cosine_similarity_empty_vectors():
    assert img_cosine_sim([], []) == 0.0
    assert img_cosine_sim([1.0], [1.0, 2.0]) == 0.0


def test_location_similarity():
    # Exact match
    assert calculate_location_similarity("Main Library", "Main Library") == 100.0
    assert calculate_location_similarity("main library", "MAIN LIBRARY") == 100.0

    # Substring / partial match
    sim = calculate_location_similarity("Library 2nd floor", "Library")
    assert sim > 50.0

    # Empty
    assert calculate_location_similarity("", "Library") == 0.0
    assert calculate_location_similarity(None, None) == 0.0


def test_date_similarity_decay():
    today = date(2026, 1, 15)

    # Same day should be 100.0
    assert calculate_date_similarity(today, today) == 100.0

    # 5 days apart should decay by 1/e (~36.78%)
    five_days_later = today + timedelta(days=5)
    sim_5 = calculate_date_similarity(today, five_days_later)
    assert math.isclose(sim_5, 100.0 * math.exp(-1), rel_tol=1e-2)

    # 14 days apart should be low (~6.08%)
    fourteen_days = today + timedelta(days=14)
    sim_14 = calculate_date_similarity(today, fourteen_days)
    assert sim_14 < 10.0


# --- Authentication Guarding Tests ------------------------------------------


def test_matching_routes_require_auth(client):
    res = client.get(f"/api/matching/item/{SAMPLE_ITEM_ID}")
    assert res.status_code == 401

    res_post = client.post(f"/api/matching/recalculate/{SAMPLE_ITEM_ID}")
    assert res_post.status_code == 401

    res_confirm = client.patch(f"/api/matching/{SAMPLE_ITEM_ID}/confirm")
    assert res_confirm.status_code == 401

    res_reject = client.patch(f"/api/matching/{SAMPLE_ITEM_ID}/reject")
    assert res_reject.status_code == 401


def test_matching_config_endpoint(client):
    res = client.get("/api/matching/config")
    assert res.status_code == 200
    data = res.json()
    assert "match_weight_image" in data
    assert "match_weight_text" in data
    assert "match_weight_location" in data
    assert "match_weight_date" in data
    assert data["match_threshold_strong"] == 80
    assert data["match_threshold_possible"] == 60


def test_notification_routes_require_auth(client):
    assert client.get("/api/notifications").status_code == 401
    assert client.patch(f"/api/notifications/{SAMPLE_ITEM_ID}/read").status_code == 401
    assert client.patch("/api/notifications/read-all").status_code == 401


def test_claims_routes_require_auth(client):
    assert client.post("/api/claims", json={"item_id": SAMPLE_ITEM_ID, "verification_details": "Test"}).status_code == 401
    assert client.get(f"/api/claims/item/{SAMPLE_ITEM_ID}").status_code == 401
    assert client.patch(f"/api/claims/{SAMPLE_ITEM_ID}/approve").status_code == 401
    assert client.patch(f"/api/claims/{SAMPLE_ITEM_ID}/reject").status_code == 401


def test_profile_update_requires_auth(client):
    assert client.patch("/api/auth/me", json={"full_name": "Updated Name"}).status_code == 401


# --- OpenAPI Registration Tests ---------------------------------------------


def test_matching_and_notification_routes_in_openapi(client):
    res = client.get("/openapi.json")
    assert res.status_code == 200
    paths = res.json()["paths"]

    assert "/api/matching/config" in paths
    assert "/api/matching/item/{item_id}" in paths
    assert "/api/matching/recalculate/{item_id}" in paths
    assert "/api/matching/{match_id}/confirm" in paths
    assert "/api/matching/{match_id}/reject" in paths
    assert "/api/notifications" in paths
    assert "/api/notifications/read-all" in paths
    assert "/api/notifications/{notification_id}/read" in paths
    assert "/api/claims" in paths
    assert "/api/claims/item/{item_id}" in paths
    assert "/api/claims/{claim_id}/approve" in paths
    assert "/api/claims/{claim_id}/reject" in paths
    assert "/api/auth/me" in paths


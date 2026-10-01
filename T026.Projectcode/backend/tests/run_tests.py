"""Standalone test runner using FastAPI TestClient and unittest."""

import os
import sys

# Set dummy test environment variables before importing app
os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_ANON_KEY"] = "test-anon-key"
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = "test-service-key"
os.environ["SUPABASE_JWT_SECRET"] = "test-jwt-secret-for-pytest"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import get_settings
get_settings.cache_clear()

from fastapi.testclient import TestClient
from app.main import app

from tests.test_phase1_smoke import (
    test_root_ok,
    test_health_ok,
    test_dashboard_stats_requires_auth,
    test_auth_me_requires_auth,
    test_dashboard_stats_rejects_invalid_token,
    test_openapi_docs_available,
)
from tests.test_phase2_items import (
    test_create_item_requires_auth,
    test_get_my_items_requires_auth,
    test_get_item_requires_auth,
    test_update_item_status_requires_auth,
    test_endpoints_reject_invalid_token,
    test_create_item_rejects_missing_fields,
    test_create_item_rejects_invalid_category,
    test_create_item_rejects_invalid_report_type,
    test_create_item_rejects_invalid_date,
    test_update_status_rejects_invalid_status,
    test_update_status_rejects_missing_body,
    test_items_routes_registered,
)
from tests.test_phase5_matching import (
    test_cosine_similarity_identical_vectors,
    test_cosine_similarity_orthogonal_vectors,
    test_cosine_similarity_empty_vectors,
    test_location_similarity,
    test_date_similarity_decay,
    test_matching_routes_require_auth,
    test_matching_config_endpoint,
    test_notification_routes_require_auth,
    test_claims_routes_require_auth,
    test_profile_update_requires_auth,
    test_matching_and_notification_routes_in_openapi,
)

if __name__ == "__main__":
    client = TestClient(app)
    tests = [
        # Phase 1
        ("test_root_ok", lambda: test_root_ok(client)),
        ("test_health_ok", lambda: test_health_ok(client)),
        ("test_dashboard_stats_requires_auth", lambda: test_dashboard_stats_requires_auth(client)),
        ("test_auth_me_requires_auth", lambda: test_auth_me_requires_auth(client)),
        ("test_dashboard_stats_rejects_invalid_token", lambda: test_dashboard_stats_rejects_invalid_token(client)),
        ("test_openapi_docs_available", lambda: test_openapi_docs_available(client)),

        # Phase 2
        ("test_create_item_requires_auth", lambda: test_create_item_requires_auth(client)),
        ("test_get_my_items_requires_auth", lambda: test_get_my_items_requires_auth(client)),
        ("test_get_item_requires_auth", lambda: test_get_item_requires_auth(client)),
        ("test_update_item_status_requires_auth", lambda: test_update_item_status_requires_auth(client)),
        ("test_endpoints_reject_invalid_token", lambda: test_endpoints_reject_invalid_token(client)),
        ("test_create_item_rejects_missing_fields", lambda: test_create_item_rejects_missing_fields(client)),
        ("test_create_item_rejects_invalid_category", lambda: test_create_item_rejects_invalid_category(client)),
        ("test_create_item_rejects_invalid_report_type", lambda: test_create_item_rejects_invalid_report_type(client)),
        ("test_create_item_rejects_invalid_date", lambda: test_create_item_rejects_invalid_date(client)),
        ("test_update_status_rejects_invalid_status", lambda: test_update_status_rejects_invalid_status(client)),
        ("test_update_status_rejects_missing_body", lambda: test_update_status_rejects_missing_body(client)),
        ("test_items_routes_registered", lambda: test_items_routes_registered(client)),

        # Phase 3 / 5 / 6 / 7
        ("test_cosine_similarity_identical_vectors", test_cosine_similarity_identical_vectors),
        ("test_cosine_similarity_orthogonal_vectors", test_cosine_similarity_orthogonal_vectors),
        ("test_cosine_similarity_empty_vectors", test_cosine_similarity_empty_vectors),
        ("test_location_similarity", test_location_similarity),
        ("test_date_similarity_decay", test_date_similarity_decay),
        ("test_matching_config_endpoint", lambda: test_matching_config_endpoint(client)),
        ("test_matching_routes_require_auth", lambda: test_matching_routes_require_auth(client)),
        ("test_notification_routes_require_auth", lambda: test_notification_routes_require_auth(client)),
        ("test_claims_routes_require_auth", lambda: test_claims_routes_require_auth(client)),
        ("test_profile_update_requires_auth", lambda: test_profile_update_requires_auth(client)),
        ("test_matching_and_notification_routes_in_openapi", lambda: test_matching_and_notification_routes_in_openapi(client)),
    ]

    passed = 0
    failed = 0
    print(f"Running {len(tests)} test cases across Phases 1, 2, 5, and 6...")
    for name, test_fn in tests:
        try:
            test_fn()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            failed += 1

    print(f"\nTest Results: {passed} passed, {failed} failed.")
    if failed > 0:
        sys.exit(1)

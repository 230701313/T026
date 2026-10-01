import os

import pytest
from fastapi.testclient import TestClient

# Set dummy config before importing the app so pydantic-settings doesn't
# fail on missing required values in a clean CI environment.
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret-for-pytest")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")

from app.main import app  # noqa: E402


@pytest.fixture
def client():
    return TestClient(app)

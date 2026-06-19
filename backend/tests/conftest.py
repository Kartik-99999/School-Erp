"""Shared test fixtures.

These tests run WITHOUT a database: `get_db` is overridden with a no-op so we can
exercise pure logic, request validation, and auth/role guards (the paths that
return before any query). DB-backed integration tests are a separate layer that
needs a throwaway Postgres — see tests/README.md.
"""

import pytest
from fastapi.testclient import TestClient

from app.core.limiter import limiter
from app.db.session import get_db
from app.main import app

# Disable rate limiting in tests so repeated guard/validation calls aren't 429'd.
limiter.enabled = False


@pytest.fixture(scope="session", autouse=True)
def _ensure_jwt_keys():
    """Ensure RS256 signing keys exist for the whole test session. Local runs read them
    from .env and CI exports an ephemeral pair; if neither is present (a bare checkout),
    mint a throwaway keypair so the JWT-signing tests still run."""
    from app.core.config import settings

    if settings.JWT_ALGORITHM == "RS256" and not settings.JWT_PRIVATE_KEY:
        from generate_jwt_keys import generate_pem

        settings.JWT_PRIVATE_KEY, settings.JWT_PUBLIC_KEY = generate_pem()
    yield


async def _no_db():
    # Endpoints under test return (401/400/422) before touching the session.
    yield None


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = _no_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

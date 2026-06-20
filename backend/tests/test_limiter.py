"""Rate-limiter storage selection + enforcement.

- ``storage_uri()`` picks Redis when ``REDIS_URL`` is set, else in-memory.
- the in-memory limiter actually returns 429 past the limit (slowapi is wired correctly).
- the Redis path drives a (fake) Redis, proving the shared cross-replica store is used.
"""

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core import limiter as limiter_module


def _app_with_limiter(lim: Limiter) -> FastAPI:
    app = FastAPI()
    app.state.limiter = lim
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    @app.get("/ping")
    @lim.limit("2/minute")
    async def ping(request: Request):  # slowapi requires the Request param
        return {"ok": True}

    return app


def test_storage_uri_memory_when_unset(monkeypatch):
    monkeypatch.setattr(limiter_module.settings, "REDIS_URL", None, raising=False)
    assert limiter_module.storage_uri() == "memory://"


def test_storage_uri_redis_when_set(monkeypatch):
    monkeypatch.setattr(limiter_module.settings, "REDIS_URL", "redis://cache:6379/0", raising=False)
    assert limiter_module.storage_uri() == "redis://cache:6379/0"
    # Constructing must not require a live server (slowapi builds the storage lazily).
    assert isinstance(limiter_module.build_limiter(), Limiter)


def test_in_memory_limiter_enforces_limit(monkeypatch):
    monkeypatch.setattr(limiter_module.settings, "REDIS_URL", None, raising=False)
    client = TestClient(_app_with_limiter(limiter_module.build_limiter()))
    assert client.get("/ping").status_code == 200
    assert client.get("/ping").status_code == 200
    assert client.get("/ping").status_code == 429  # 3rd call exceeds 2/minute


def test_redis_uri_resolves_to_redis_storage(monkeypatch):
    """REDIS_URL set => limits resolves our storage_uri() to a Redis-backed store (shared
    across replicas), not in-memory. Uses fakeredis for the client so no server is needed."""
    fakeredis = pytest.importorskip("fakeredis")
    import redis as redis_pkg
    from limits.storage import RedisStorage, storage_from_string

    fake = fakeredis.FakeStrictRedis()
    # limits' RedisStorage builds its client via redis.from_url(uri); point it at the fake.
    monkeypatch.setattr(redis_pkg, "from_url", lambda *a, **k: fake, raising=False)
    monkeypatch.setattr(
        limiter_module.settings, "REDIS_URL", "redis://localhost:6379/0", raising=False
    )
    storage = storage_from_string(limiter_module.storage_uri())
    assert isinstance(storage, RedisStorage)


def test_memory_uri_resolves_to_memory_storage(monkeypatch):
    from limits.storage import MemoryStorage, storage_from_string

    monkeypatch.setattr(limiter_module.settings, "REDIS_URL", None, raising=False)
    assert isinstance(storage_from_string(limiter_module.storage_uri()), MemoryStorage)

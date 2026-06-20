"""Shared rate limiter (slowapi).

Endpoints import ``limiter`` and decorate with ``@limiter.limit(...)``; main.py registers
it on the app + the 429 handler. Keyed by client IP.

Storage backend (``limits`` under the hood):
  * ``REDIS_URL`` set  -> all replicas share ONE counter store, so a per-IP limit holds
    across the whole Container App (required once we run >1 replica).
  * ``REDIS_URL`` unset -> in-memory (``memory://``), per-process. Fine for local/dev/CI
    and single-replica, but each replica would then count independently.

slowapi builds the storage lazily (on first limited request), so constructing the limiter
with a Redis URI does not open a connection at import time.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings


def storage_uri() -> str:
    """The limits storage URI: shared Redis when configured, else in-memory."""
    return settings.REDIS_URL or "memory://"


def build_limiter() -> Limiter:
    """Construct a Limiter bound to the configured storage (Redis or in-memory)."""
    return Limiter(key_func=get_remote_address, storage_uri=storage_uri())


limiter = build_limiter()

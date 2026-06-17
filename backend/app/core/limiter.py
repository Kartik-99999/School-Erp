"""Shared rate limiter (slowapi). Endpoints import `limiter` and decorate with
`@limiter.limit(...)`; main.py registers it on the app + the 429 handler.
Keyed by client IP; for multi-instance deployments point `storage_uri` at Redis.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

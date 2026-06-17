import hashlib

from app.api.v1.endpoints.auth import _hash_token
from app.crud.crud_audit import _content_hash


def test_content_hash_deterministic():
    a = _content_hash("s", "u", "auth.login", "User", "e", "summary")
    b = _content_hash("s", "u", "auth.login", "User", "e", "summary")
    assert a == b
    assert len(a) == 64  # sha256 hex


def test_content_hash_detects_tampering():
    base = _content_hash("s", "u", "auth.login", "User", "e", "summary")
    assert base != _content_hash("s", "u", "auth.logout", "User", "e", "summary")
    assert base != _content_hash("s", "u", "auth.login", "User", "e", "edited")


def test_content_hash_handles_none_fields():
    assert len(_content_hash(None, None, "x", None, None, None)) == 64


def test_hash_token_is_sha256():
    assert _hash_token("abc") == hashlib.sha256(b"abc").hexdigest()
    assert len(_hash_token("abc")) == 64


def test_hash_token_distinct_inputs_distinct_hashes():
    assert _hash_token("token-a") != _hash_token("token-b")

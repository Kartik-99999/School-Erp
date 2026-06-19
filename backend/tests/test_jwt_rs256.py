"""RS256 JWT signing / verification.

Proves access + MFA tokens are signed with the RSA private key and verify with the
public key, and that tampered or HS256-signed tokens are rejected (no algorithm-confusion
bypass). Signing keys come from the autouse session fixture in conftest (or .env / CI env).
"""

import pytest
from jose import JWTError
from jose import jwt as jose_jwt

from app.core.config import settings
from app.core.jwt import create_access_token, create_mfa_token, decode_token, verify_mfa_token


def test_algorithm_defaults_to_rs256():
    assert settings.JWT_ALGORITHM == "RS256"


def test_keys_are_asymmetric_pems():
    assert "PRIVATE KEY" in settings.jwt_private_key
    assert "PUBLIC KEY" in settings.jwt_public_key
    assert settings.jwt_private_key != settings.jwt_public_key


def test_access_token_signed_with_private_verifies_with_public():
    token = create_access_token(subject="user-1", role="School Admin", school_id=None)
    # Header advertises RS256 (asymmetric), not HS256.
    assert jose_jwt.get_unverified_header(token)["alg"] == "RS256"
    payload = decode_token(token)  # verifies the signature with the public key
    assert payload["sub"] == "user-1"
    assert payload["role"] == "School Admin"
    # Verifying directly with the public key works too.
    assert jose_jwt.decode(token, settings.jwt_public_key, algorithms=["RS256"])["sub"] == "user-1"


def test_tampered_token_is_rejected():
    head, body, sig = create_access_token(subject="u", role="Super Admin").split(".")
    bad_sig = ("A" if sig[0] != "A" else "B") + sig[1:]
    with pytest.raises(JWTError):
        decode_token(f"{head}.{body}.{bad_sig}")


def test_hs256_forged_token_is_rejected():
    # A token signed with HS256 must be rejected under RS256-only verification (blocks the
    # algorithm-confusion bypass). (jose additionally refuses to sign HS256 with a PEM key,
    # so forging with the public key can't even be attempted — defense in depth.)
    forged = jose_jwt.encode(
        {"sub": "attacker", "role": "Super Admin"}, "attacker-hmac-secret", algorithm="HS256"
    )
    with pytest.raises(JWTError):
        decode_token(forged)
    assert verify_mfa_token(forged) is None


def test_mfa_token_rs256_roundtrip_and_purpose():
    token = create_mfa_token("user-9")
    assert jose_jwt.get_unverified_header(token)["alg"] == "RS256"
    assert verify_mfa_token(token) == "user-9"
    # An access token must not validate as an MFA token (purpose claim differs).
    assert verify_mfa_token(create_access_token(subject="user-9", role="Teacher")) is None

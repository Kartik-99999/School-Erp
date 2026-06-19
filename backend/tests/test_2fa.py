"""Two-factor auth (TOTP) tests.

Three layers:
  * pure logic (no DB): TOTP / recovery-code / MFA-token helpers — always run.
  * route + auth guards (no DB, TestClient): wiring and 401s.
  * end-to-end (DB-backed, httpx.AsyncClient over the ASGI app): the full
    login -> 2FA challenge -> verify flow, incl. recovery codes, one-time-use, and
    secret encryption-at-rest. Auto-skips when no Postgres is reachable.
"""

import base64
import uuid

import pytest
import pytest_asyncio
from cryptography.fernet import Fernet
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core import twofa
from app.core.config import settings
from app.core.jwt import create_access_token, create_mfa_token, verify_mfa_token
from app.main import app

API = settings.API_V1_STR


# --------------------------------------------------------------------------- #
# pure logic (no DB)
# --------------------------------------------------------------------------- #
def test_generate_secret_is_base32_and_distinct():
    s1, s2 = twofa.generate_secret(), twofa.generate_secret()
    assert s1 != s2
    assert len(s1) >= 16
    base64.b32decode(s1)  # raises if not valid base32


def test_verify_totp_accepts_current_and_rejects_others():
    secret = twofa.generate_secret()
    code = twofa.current_code(secret)
    assert twofa.verify_totp(secret, code) is True
    assert twofa.verify_totp(secret, f"  {code} ") is True  # trimmed/spaced
    assert twofa.verify_totp(secret, "abcdef") is False
    assert twofa.verify_totp(secret, "") is False
    assert twofa.verify_totp("", code) is False
    other = twofa.current_code(twofa.generate_secret())
    if other != code:  # different secrets ~never share a code
        assert twofa.verify_totp(secret, other) is False


def test_provisioning_uri_format():
    secret = twofa.generate_secret()
    uri = twofa.provisioning_uri(secret, "admin@demo.edu")
    assert uri.startswith("otpauth://totp/")
    assert f"secret={secret}" in uri
    assert "issuer=" in uri


def test_recovery_codes_unique_and_hash_normalization():
    codes = twofa.generate_recovery_codes()
    assert len(codes) == twofa.RECOVERY_CODE_COUNT
    assert len(set(codes)) == len(codes)
    c = codes[0]
    # Lookup hash is indifferent to case, the display hyphen, and surrounding space.
    assert twofa.hash_recovery_code(c) == twofa.hash_recovery_code(c.upper())
    assert twofa.hash_recovery_code(c) == twofa.hash_recovery_code(f"  {c}  ")
    assert twofa.hash_recovery_code(c) == twofa.hash_recovery_code(c.replace("-", ""))
    assert len(twofa.hash_recovery_code(c)) == 64
    assert twofa.hash_recovery_code("a") != twofa.hash_recovery_code("b")


def test_mfa_token_roundtrip_and_purpose():
    uid = str(uuid.uuid4())
    assert verify_mfa_token(create_mfa_token(uid)) == uid
    assert verify_mfa_token("garbage.token.here") is None
    # An access token must NOT validate as an MFA token (purpose claim differs).
    assert verify_mfa_token(create_access_token(subject=uid, role="School Admin")) is None


# --------------------------------------------------------------------------- #
# route + auth guards (no DB)
# --------------------------------------------------------------------------- #
def test_2fa_routes_registered():
    paths = {r.path for r in app.routes}
    for p in ("/setup", "/enable", "/disable", "/verify", "/status"):
        assert f"{API}/auth/2fa{p}" in paths


def test_2fa_management_endpoints_require_auth(client):
    assert client.get(f"{API}/auth/2fa/status").status_code == 401
    assert client.post(f"{API}/auth/2fa/setup").status_code == 401
    assert client.post(f"{API}/auth/2fa/enable", json={"code": "123456"}).status_code == 401
    assert client.post(f"{API}/auth/2fa/disable", json={"password": "x"}).status_code == 401


def test_2fa_verify_rejects_bad_mfa_token(client):
    r = client.post(f"{API}/auth/2fa/verify", json={"mfa_token": "not-a-token", "code": "123456"})
    assert r.status_code == 401


# --------------------------------------------------------------------------- #
# end-to-end (DB-backed)
# --------------------------------------------------------------------------- #
async def _reachable(uri: str) -> bool:
    eng = create_async_engine(uri)
    try:
        async with eng.connect() as c:
            await c.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
    finally:
        await eng.dispose()


@pytest_asyncio.fixture
async def owner_session():
    uri = settings.async_database_uri  # owner connection (bypasses RLS for setup/asserts)
    if not await _reachable(uri):
        pytest.skip("DB not reachable for 2FA end-to-end test")
    engine = create_async_engine(uri)
    Session = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as s:
        yield s
    await engine.dispose()


@pytest_asyncio.fixture
async def test_user(owner_session):
    """Provision a throwaway role + user; clean up (cascade) afterwards."""
    from app.core.security import get_password_hash
    from app.models.users import Role, User

    s = owner_session
    email = f"2fatest-{uuid.uuid4().hex[:8]}@example.com"
    password = "Sup3rSecret!"
    role = Role(name="2FA Test Role", permissions={})
    s.add(role)
    await s.flush()
    role_id = role.id
    user = User(
        email=email, hashed_password=get_password_hash(password), role_id=role_id, is_active=True
    )
    s.add(user)
    await s.commit()
    uid = user.id

    yield {"email": email, "password": password, "id": uid}

    # FK ON DELETE CASCADE clears refresh_tokens + two_factor_* when the user goes.
    await s.execute(text("DELETE FROM audit_logs WHERE actor_email = :e"), {"e": email})
    await s.execute(text("DELETE FROM users WHERE id = :i"), {"i": uid})
    await s.execute(text("DELETE FROM roles WHERE id = :r"), {"r": role_id})
    await s.commit()


async def _login(ac, email, password):
    return await ac.post(f"{API}/auth/login", data={"username": email, "password": password})


async def test_2fa_end_to_end(test_user, owner_session, monkeypatch):
    # Force encryption on regardless of ambient env (CI sets no PII key) so we can
    # assert the secret is ciphertext at rest.
    monkeypatch.setattr(settings, "PII_ENCRYPTION_KEY", Fernet.generate_key().decode())

    from app.db.session import engine as app_engine

    email, password, uid = test_user["email"], test_user["password"], test_user["id"]
    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # 1. Login without 2FA -> full tokens.
            r = await _login(ac, email, password)
            assert r.status_code == 200, r.text
            body = r.json()
            assert body.get("access_token") and not body.get("requires_2fa")
            auth = {"Authorization": f"Bearer {body['access_token']}"}

            # 2. Setup -> secret + provisioning URI; status is "pending".
            r = await ac.post(f"{API}/auth/2fa/setup", headers=auth)
            assert r.status_code == 200, r.text
            secret = r.json()["secret"]
            assert r.json()["provisioning_uri"].startswith("otpauth://")
            r = await ac.get(f"{API}/auth/2fa/status", headers=auth)
            assert r.json() == {"enabled": False, "pending": True, "recovery_codes_remaining": 0}

            # 3. Enable with a real TOTP -> one-time recovery codes.
            r = await ac.post(
                f"{API}/auth/2fa/enable", headers=auth, json={"code": twofa.current_code(secret)}
            )
            assert r.status_code == 200, r.text
            recovery_codes = r.json()["recovery_codes"]
            assert len(recovery_codes) == twofa.RECOVERY_CODE_COUNT

            # Secret is encrypted at rest (Fernet ciphertext, not the base32 secret).
            await owner_session.commit()  # fresh snapshot so we see the app's commit
            raw = (
                await owner_session.execute(
                    text("SELECT secret FROM two_factor_secrets WHERE user_id = :i"), {"i": uid}
                )
            ).scalar()
            assert raw != secret
            assert raw.startswith("gAAAAA")  # Fernet token marker

            # 4. Login now returns a 2FA challenge, not tokens.
            r = await _login(ac, email, password)
            assert r.status_code == 200, r.text
            challenge = r.json()
            assert challenge.get("requires_2fa") is True
            assert "access_token" not in challenge
            mfa_token = challenge["mfa_token"]

            # 5. Verify with a TOTP -> real tokens.
            r = await ac.post(
                f"{API}/auth/2fa/verify",
                json={"mfa_token": mfa_token, "code": twofa.current_code(secret)},
            )
            assert r.status_code == 200, r.text
            assert r.json().get("access_token")

            # 6. A bad code is rejected (non-numeric -> not a TOTP, not a recovery code).
            mfa_token = (await _login(ac, email, password)).json()["mfa_token"]
            r = await ac.post(
                f"{API}/auth/2fa/verify", json={"mfa_token": mfa_token, "code": "abc"}
            )
            assert r.status_code == 400, r.text

            # 7. A recovery code works once...
            mfa_token = (await _login(ac, email, password)).json()["mfa_token"]
            r = await ac.post(
                f"{API}/auth/2fa/verify",
                json={"mfa_token": mfa_token, "code": recovery_codes[0]},
            )
            assert r.status_code == 200, r.text
            assert r.json().get("recovery_code_used") is True

            # ...and not twice.
            mfa_token = (await _login(ac, email, password)).json()["mfa_token"]
            r = await ac.post(
                f"{API}/auth/2fa/verify",
                json={"mfa_token": mfa_token, "code": recovery_codes[0]},
            )
            assert r.status_code == 400, r.text

            # 8. Status reflects enabled + one recovery code consumed.
            mfa_token = (await _login(ac, email, password)).json()["mfa_token"]
            access = (
                await ac.post(
                    f"{API}/auth/2fa/verify",
                    json={"mfa_token": mfa_token, "code": twofa.current_code(secret)},
                )
            ).json()["access_token"]
            auth = {"Authorization": f"Bearer {access}"}
            st = (await ac.get(f"{API}/auth/2fa/status", headers=auth)).json()
            assert st["enabled"] is True
            assert st["recovery_codes_remaining"] == twofa.RECOVERY_CODE_COUNT - 1

            # 9. Disable needs the account password; then login issues tokens again.
            assert (
                await ac.post(f"{API}/auth/2fa/disable", headers=auth, json={"password": "wrong"})
            ).status_code == 400
            assert (
                await ac.post(f"{API}/auth/2fa/disable", headers=auth, json={"password": password})
            ).status_code == 200
            r = await _login(ac, email, password)
            assert r.json().get("access_token") and not r.json().get("requires_2fa")
    finally:
        await app_engine.dispose()

"""Two-factor auth (TOTP) endpoints.

Enrollment/management (authenticated, under /auth/2fa):
  GET    /status   -> is 2FA enabled / pending, recovery codes left
  POST   /setup    -> (re)generate an unconfirmed secret + provisioning URI (QR)
  POST   /enable   -> confirm a code, switch 2FA on, return one-time recovery codes
  POST   /disable  -> turn 2FA off (requires the account password)

Login step-2 (public, holds the short-lived MFA token from /auth/login):
  POST   /verify   -> exchange mfa_token + a TOTP/recovery code for access+refresh tokens

The tables have no school_id, so they carry no RLS policy (like refresh tokens) and are
reachable on the pre-context login path. Available to any authenticated user; primarily
intended for admin/staff accounts.
"""

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import delete, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.api.v1.endpoints.auth import _issue_login_tokens
from app.core import twofa
from app.core.config import settings
from app.core.jwt import verify_mfa_token
from app.core.limiter import limiter
from app.core.security import verify_password
from app.crud.crud_audit import record_audit
from app.models.two_factor import TwoFactorRecoveryCode, TwoFactorSecret
from app.models.users import User
from app.schemas.two_factor import (
    TwoFactorDisableRequest,
    TwoFactorEnableRequest,
    TwoFactorEnableResponse,
    TwoFactorSetupResponse,
    TwoFactorStatusResponse,
    TwoFactorVerifyLoginRequest,
)

router = APIRouter()


async def _get_secret(db: AsyncSession, user_id) -> TwoFactorSecret:
    return (
        (await db.execute(select(TwoFactorSecret).filter(TwoFactorSecret.user_id == user_id)))
        .scalars()
        .first()
    )


async def _unused_recovery_count(db: AsyncSession, user_id) -> int:
    return (
        await db.execute(
            select(func.count())
            .select_from(TwoFactorRecoveryCode)
            .filter(
                TwoFactorRecoveryCode.user_id == user_id,
                TwoFactorRecoveryCode.used_at.is_(None),
            )
        )
    ).scalar() or 0


@router.get("/status", response_model=TwoFactorStatusResponse)
async def two_factor_status(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    tfa = await _get_secret(db, current_user.id)
    enabled = bool(tfa and tfa.is_enabled)
    return TwoFactorStatusResponse(
        enabled=enabled,
        pending=bool(tfa and not tfa.is_enabled),
        recovery_codes_remaining=(
            await _unused_recovery_count(db, current_user.id) if enabled else 0
        ),
    )


@router.post("/setup", response_model=TwoFactorSetupResponse)
@limiter.limit("10/minute")
async def two_factor_setup(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Begin enrollment: (re)generate an UNCONFIRMED TOTP secret and return the
    otpauth:// provisioning URI for QR display. Inactive until /enable confirms a code."""
    tfa = await _get_secret(db, current_user.id)
    if tfa and tfa.is_enabled:
        raise HTTPException(
            status_code=409, detail="2FA is already enabled. Disable it before re-enrolling."
        )

    secret = twofa.generate_secret()
    if tfa:
        tfa.secret = secret
        tfa.is_enabled = False
        tfa.confirmed_at = None
        db.add(tfa)
    else:
        db.add(TwoFactorSecret(user_id=current_user.id, secret=secret, is_enabled=False))
    await db.commit()

    return TwoFactorSetupResponse(
        secret=secret,
        provisioning_uri=twofa.provisioning_uri(secret, current_user.email),
        issuer=settings.TOTP_ISSUER,
        account_name=current_user.email,
    )


@router.post("/enable", response_model=TwoFactorEnableResponse)
@limiter.limit("10/minute")
async def two_factor_enable(
    payload: TwoFactorEnableRequest,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Confirm enrollment: verify a code against the pending secret, switch 2FA on, and
    issue one-time recovery codes (returned once; only their hashes are stored)."""
    tfa = await _get_secret(db, current_user.id)
    if not tfa:
        raise HTTPException(status_code=400, detail="Start enrollment at /auth/2fa/setup first.")
    if tfa.is_enabled:
        raise HTTPException(status_code=409, detail="2FA is already enabled.")
    if not twofa.verify_totp(tfa.secret, payload.code):
        raise HTTPException(status_code=400, detail="Invalid or expired code.")

    tfa.is_enabled = True
    tfa.confirmed_at = datetime.now(timezone.utc)
    db.add(tfa)

    # Replace any prior recovery codes with a fresh set.
    await db.execute(
        delete(TwoFactorRecoveryCode).where(TwoFactorRecoveryCode.user_id == current_user.id)
    )
    codes = twofa.generate_recovery_codes()
    for c in codes:
        db.add(
            TwoFactorRecoveryCode(user_id=current_user.id, code_hash=twofa.hash_recovery_code(c))
        )

    await record_audit(
        db,
        action="auth.2fa_enabled",
        school_id=current_user.school_id,
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        entity_type="User",
        entity_id=current_user.id,
        summary=f"2FA (TOTP) enabled for {current_user.email}",
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return TwoFactorEnableResponse(enabled=True, recovery_codes=codes)


@router.post("/disable")
@limiter.limit("10/minute")
async def two_factor_disable(
    payload: TwoFactorDisableRequest,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """Turn 2FA off. Requires the account password (re-auth) so a hijacked but
    unprivileged session can't silently strip the second factor. Idempotent."""
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password.")

    tfa = await _get_secret(db, current_user.id)
    was_enabled = bool(tfa and tfa.is_enabled)

    await db.execute(
        delete(TwoFactorRecoveryCode).where(TwoFactorRecoveryCode.user_id == current_user.id)
    )
    await db.execute(delete(TwoFactorSecret).where(TwoFactorSecret.user_id == current_user.id))
    if was_enabled:
        await record_audit(
            db,
            action="auth.2fa_disabled",
            school_id=current_user.school_id,
            actor_user_id=current_user.id,
            actor_email=current_user.email,
            entity_type="User",
            entity_id=current_user.id,
            summary=f"2FA (TOTP) disabled for {current_user.email}",
            ip_address=request.client.host if request.client else None,
        )
    await db.commit()
    return {"success": True, "message": "2FA disabled." if was_enabled else "2FA was not enabled."}


@router.post("/verify")
@limiter.limit("10/minute")
async def two_factor_verify_login(
    payload: TwoFactorVerifyLoginRequest,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Login step 2: exchange the MFA challenge token plus a TOTP (or single-use
    recovery) code for real access + refresh tokens."""
    invalid_session = HTTPException(
        status_code=401, detail="Invalid or expired MFA session. Please sign in again."
    )
    user_id = verify_mfa_token(payload.mfa_token)
    if not user_id:
        raise invalid_session
    try:
        user_uuid = UUID(str(user_id))
    except (ValueError, TypeError):
        raise invalid_session

    user = (
        (await db.execute(select(User).filter(User.id == user_uuid, User.is_deleted == False)))
        .scalars()
        .first()
    )
    if not user or not user.is_active:
        raise invalid_session

    tfa = await _get_secret(db, user.id)
    if not tfa or not tfa.is_enabled:
        # 2FA was disabled between step 1 and step 2 — nothing to verify; issue tokens.
        return await _issue_login_tokens(db, user, request)

    code = (payload.code or "").strip()
    used_recovery = False
    if not twofa.verify_totp(tfa.secret, code):
        # Fall back to a single-use recovery code.
        rc = (
            (
                await db.execute(
                    select(TwoFactorRecoveryCode).filter(
                        TwoFactorRecoveryCode.user_id == user.id,
                        TwoFactorRecoveryCode.code_hash == twofa.hash_recovery_code(code),
                        TwoFactorRecoveryCode.used_at.is_(None),
                    )
                )
            )
            .scalars()
            .first()
        )
        if not rc:
            raise HTTPException(status_code=400, detail="Invalid 2FA code.")
        rc.used_at = datetime.now(timezone.utc)
        db.add(rc)  # persisted by the commit inside _issue_login_tokens
        used_recovery = True

    tokens = await _issue_login_tokens(db, user, request)
    if used_recovery:
        tokens["recovery_code_used"] = True
    return tokens

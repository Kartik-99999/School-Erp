import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.core.config import settings
from app.core.jwt import create_access_token
from app.core.limiter import limiter
from app.core.security import get_password_hash, verify_password
from app.crud.crud_audit import record_audit
from app.models.auth_tokens import PasswordResetToken, RefreshToken
from app.models.users import Role, User
from app.schemas.token import Token
from app.utils.email import send_email

RESET_TOKEN_TTL_MINUTES = 60


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def _new_refresh_token(db: AsyncSession, user_id) -> str:
    """Issue a refresh token: return the raw token, persist only its sha256 hash."""
    raw = secrets.token_urlsafe(48)
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=_hash_token(raw),
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    await db.commit()
    return raw


class PasswordResetRequest(BaseModel):
    user_id: UUID
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: str
    subdomain: Optional[str] = None


class ResetPasswordConfirm(BaseModel):
    token: str
    new_password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


router = APIRouter()


@router.post("/reset-password")
async def reset_password(
    req: PasswordResetRequest,
    db: AsyncSession = Depends(deps.get_db),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    # Verify the requester is an Admin or Super Admin
    if token_data.role not in ["School Admin", "Super Admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to reset passwords")

    user_query = select(User).filter(User.id == req.user_id)
    if token_data.role == "School Admin":
        user_query = user_query.filter(User.school_id == UUID(token_data.school_id))

    user_res = await db.execute(user_query)
    target_user = user_res.scalars().first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found in your school")

    target_user.hashed_password = get_password_hash(req.new_password)
    db.add(target_user)
    await db.commit()

    return {"success": True, "message": "Password updated successfully"}


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login_access_token(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    from app.models.staff import Staff
    from app.models.students import Student

    # 1. Fetch User (Try Email first)
    query = select(User).filter(User.email == form_data.username, User.is_deleted == False)
    result = await db.execute(query)
    user = result.scalars().first()

    # 2. Try Admission Number (Student)
    if not user:
        st_query = select(Student).filter(
            Student.admission_number == form_data.username, Student.is_deleted == False
        )
        st_result = await db.execute(st_query)
        student = st_result.scalars().first()
        if student and student.user_id:
            user_query = select(User).filter(User.id == student.user_id, User.is_deleted == False)
            user_res = await db.execute(user_query)
            user = user_res.scalars().first()

    # 3. Try Employee ID (Staff/Teacher)
    if not user:
        staff_query = select(Staff).filter(
            Staff.employee_id == form_data.username, Staff.is_deleted == False
        )
        staff_result = await db.execute(staff_query)
        staff = staff_result.scalars().first()
        if staff and staff.user_id:
            user_query = select(User).filter(User.id == staff.user_id, User.is_deleted == False)
            user_res = await db.execute(user_query)
            user = user_res.scalars().first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # 2. Fetch Role Name
    role_query = select(Role).filter(Role.id == user.role_id)
    role_res = await db.execute(role_query)
    role = role_res.scalars().first()
    role_name = role.name if role else "Student"

    # 3. Fetch School Subdomain if user belongs to a school
    subdomain = None
    if user.school_id:
        from app.models.school import School

        school_query = select(School).filter(School.id == user.school_id)
        school_res = await db.execute(school_query)
        school = school_res.scalars().first()
        if school:
            subdomain = school.subdomain

    # 4. Create tokens (short-lived access + rotating refresh)
    access_token = create_access_token(subject=user.id, role=role_name, school_id=user.school_id)
    refresh_token = await _new_refresh_token(db, user.id)

    # Record the sign-in (best-effort: last_login + audit). The token is already
    # issued, so bookkeeping must never block a valid login.
    try:
        user.last_login = datetime.now(timezone.utc)
        db.add(user)
        await record_audit(
            db,
            action="auth.login",
            school_id=user.school_id,
            actor_user_id=user.id,
            actor_email=user.email,
            actor_role=role_name,
            entity_type="User",
            entity_id=user.id,
            summary=f"{user.email} signed in as {role_name}",
            ip_address=request.client.host if request.client else None,
        )
        await db.commit()
    except Exception as e:  # noqa: BLE001 — never fail login over bookkeeping
        await db.rollback()
        print(f"[login] post-auth bookkeeping skipped: {type(e).__name__}: {e}")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "role": role_name,
        "school_id": str(user.school_id) if user.school_id else None,
        "subdomain": subdomain,
        "refresh_token": refresh_token,
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/refresh", response_model=Token)
@limiter.limit("30/minute")
async def refresh_access_token(
    req: RefreshRequest,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Exchange a valid refresh token for a new access token, rotating the refresh
    token (the presented one is revoked). 401 if unknown / expired / revoked."""
    token_hash = _hash_token(req.refresh_token.strip())
    rt = (
        (await db.execute(select(RefreshToken).filter(RefreshToken.token_hash == token_hash)))
        .scalars()
        .first()
    )
    now = datetime.now(timezone.utc)
    expires_at = rt.expires_at if rt else None
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not rt or rt.revoked_at is not None or expires_at < now:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = (
        (await db.execute(select(User).filter(User.id == rt.user_id, User.is_deleted == False)))
        .scalars()
        .first()
    )
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Rotate: revoke the presented token, then issue a fresh one (single commit).
    rt.revoked_at = now
    db.add(rt)
    new_refresh = await _new_refresh_token(db, user.id)

    role = (await db.execute(select(Role).filter(Role.id == user.role_id))).scalars().first()
    role_name = role.name if role else "Student"
    subdomain = None
    if user.school_id:
        from app.models.school import School

        school = (
            (await db.execute(select(School).filter(School.id == user.school_id))).scalars().first()
        )
        subdomain = school.subdomain if school else None

    access_token = create_access_token(subject=user.id, role=role_name, school_id=user.school_id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "role": role_name,
        "school_id": str(user.school_id) if user.school_id else None,
        "subdomain": subdomain,
        "refresh_token": new_refresh,
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/logout")
@limiter.limit("30/minute")
async def logout(
    req: LogoutRequest,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Revoke a refresh token (idempotent). The short-lived access token simply
    expires on its own."""
    token_hash = _hash_token(req.refresh_token.strip())
    rt = (
        (await db.execute(select(RefreshToken).filter(RefreshToken.token_hash == token_hash)))
        .scalars()
        .first()
    )
    if rt and rt.revoked_at is None:
        rt.revoked_at = datetime.now(timezone.utc)
        db.add(rt)
        await db.commit()
    return {"success": True}


@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(
    req: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Public: start a self-serve password reset. Always returns success — we
    never reveal whether an email exists. If it does, a single-use, 1-hour reset
    link is dispatched (currently via the mock email channel)."""
    email = (req.email or "").strip().lower()
    user = None
    if email:
        q = select(User).filter(User.email == email, User.is_deleted == False)
        if req.subdomain:
            # Scope to the tenant when a subdomain is supplied (defense in depth).
            from app.models.school import School

            school = (
                (
                    await db.execute(
                        select(School).filter(School.subdomain == req.subdomain.strip().lower())
                    )
                )
                .scalars()
                .first()
            )
            if school:
                q = q.filter(User.school_id == school.id)
        user = (await db.execute(q)).scalars().first()

    if user:
        raw_token = secrets.token_urlsafe(32)
        reset = PasswordResetToken(
            user_id=user.id,
            token_hash=_hash_token(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
        )
        db.add(reset)
        await record_audit(
            db,
            action="auth.password_reset_requested",
            school_id=user.school_id,
            actor_user_id=user.id,
            actor_email=user.email,
            entity_type="User",
            entity_id=user.id,
            summary=f"Password reset requested for {user.email}",
            ip_address=request.client.host if request.client else None,
        )
        await db.commit()
        sub = req.subdomain.strip().lower() if req.subdomain else None
        link = f"/reset-password?token={raw_token}" + (f"&subdomain={sub}" if sub else "")
        send_email(
            user.email,
            "Reset your Educore password",
            f"We received a request to reset your password. Use this link within "
            f"{RESET_TOKEN_TTL_MINUTES} minutes:\n{link}\n\nIf you didn't request this, ignore this email.",
        )

    return {
        "success": True,
        "message": "If an account exists for that email, a reset link has been sent.",
    }


@router.post("/reset-password/confirm")
@limiter.limit("10/minute")
async def reset_password_confirm(
    req: ResetPasswordConfirm,
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Public: complete a reset using the token from the email link."""
    if not req.new_password or len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    token_hash = _hash_token(req.token.strip())
    reset = (
        (
            await db.execute(
                select(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash)
            )
        )
        .scalars()
        .first()
    )

    now = datetime.now(timezone.utc)
    expires_at = reset.expires_at if reset else None
    # Postgres returns tz-aware datetimes; guard in case of naive storage.
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not reset or reset.used_at is not None or expires_at < now:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired.")

    user = (await db.execute(select(User).filter(User.id == reset.user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired.")

    user.hashed_password = get_password_hash(req.new_password)
    reset.used_at = now
    db.add(user)
    db.add(reset)
    await record_audit(
        db,
        action="auth.password_reset_completed",
        school_id=user.school_id,
        actor_user_id=user.id,
        actor_email=user.email,
        entity_type="User",
        entity_id=user.id,
        summary=f"Password reset completed for {user.email}",
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return {"success": True, "message": "Your password has been reset. You can now sign in."}

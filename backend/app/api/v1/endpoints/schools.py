import re
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.core.limiter import limiter
from app.core.security import get_password_hash
from app.crud.crud_audit import record_audit
from app.crud.crud_school import crud_school
from app.models.school import School
from app.models.setup import AcademicYear
from app.models.users import Role, User
from app.schemas.base import APIResponse

router = APIRouter()

# Subdomains we never let a tenant claim (reserved for the platform).
RESERVED_SUBDOMAINS = {"www", "app", "api", "admin", "core", "mail", "static", "assets", "educore"}
SUBDOMAIN_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$")
# Roles every new tenant starts with (School Admin gets full permissions).
DEFAULT_ROLES = ["School Admin", "Teacher", "Student", "Parent", "Accountant"]


class SchoolSignupRequest(BaseModel):
    school_name: str
    subdomain: str
    admin_name: str
    admin_email: str
    admin_password: str


@router.post("/signup")
@limiter.limit("5/hour")
async def signup_school(
    request: Request,
    payload: SchoolSignupRequest,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """Public self-serve onboarding: atomically provisions a tenant — the school,
    its default roles, and the first School Admin — in one transaction."""
    subdomain = (payload.subdomain or "").strip().lower()
    email = (payload.admin_email or "").strip().lower()

    # --- validation ---
    if not payload.school_name.strip():
        raise HTTPException(status_code=400, detail="School name is required.")
    if not SUBDOMAIN_RE.match(subdomain) or subdomain in RESERVED_SUBDOMAINS:
        raise HTTPException(
            status_code=400,
            detail="Subdomain must be 3–50 chars, lowercase letters/digits/hyphens, and not reserved.",
        )
    if "@" not in email:
        raise HTTPException(status_code=400, detail="A valid admin email is required.")
    if len(payload.admin_password or "") < 6:
        raise HTTPException(status_code=400, detail="Admin password must be at least 6 characters.")

    # --- uniqueness (subdomain is unique; user email is globally unique) ---
    if await crud_school.get_by_subdomain(db, subdomain=subdomain):
        raise HTTPException(status_code=409, detail="That subdomain is already taken.")
    if (await db.execute(select(User).filter(User.email == email))).scalars().first():
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    try:
        # 1. School
        school = School(
            name=payload.school_name.strip(),
            subdomain=subdomain,
            status="Trial",
            contact_email=email,
        )
        db.add(school)
        await db.flush()  # populate school.id

        # Scope the rest of this request to the new tenant so the strict RLS
        # policies (e.g. on academic_years) permit the seed inserts below (and any
        # post-commit refresh, via the after_begin listener reading session.info).
        # The signup route is public, so no tenant context exists until now.
        db.info["rls_tenant"] = str(school.id)
        await db.execute(
            text("SELECT set_config('app.current_tenant', :t, true)"),
            {"t": str(school.id)},
        )

        # 2. Seed default roles; keep the admin role to attach the first user.
        admin_role = None
        for role_name in DEFAULT_ROLES:
            perms = {"all": True} if role_name == "School Admin" else {}
            role = Role(school_id=school.id, name=role_name, permissions=perms)
            db.add(role)
            if role_name == "School Admin":
                admin_role = role
        await db.flush()  # populate admin_role.id

        # 3. First School Admin user
        admin_user = User(
            school_id=school.id,
            email=email,
            hashed_password=get_password_hash(payload.admin_password),
            role_id=admin_role.id,
        )
        db.add(admin_user)
        await db.flush()

        # 4. Seed a default active academic year (India Apr–Mar cycle) so the
        # admin can admit students immediately.
        today = date.today()
        start_year = today.year if today.month >= 4 else today.year - 1
        db.add(
            AcademicYear(
                school_id=school.id,
                name=f"{start_year}-{start_year + 1}",
                start_date=date(start_year, 4, 1),
                end_date=date(start_year + 1, 3, 31),
                is_active=True,
            )
        )

        await record_audit(
            db,
            action="school.signup",
            school_id=school.id,
            actor_user_id=admin_user.id,
            actor_email=email,
            actor_role="School Admin",
            entity_type="School",
            entity_id=school.id,
            summary=f"School '{school.name}' self-provisioned on subdomain '{subdomain}'",
        )
        await db.commit()
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Could not create school: {e}")

    return APIResponse(
        success=True,
        data={
            "subdomain": subdomain,
            "admin_email": email,
            "login_path": "/login",
        },
        message="School created. You can now sign in as the School Admin.",
    )


@router.get("/lookup/{subdomain}")
async def lookup_school(
    subdomain: str,
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Public: resolve a tenant by its subdomain.

    Used by the login page to confirm a school exists before rendering its
    portal (and to show the school's name/logo). Returns 404 for unknown or
    deleted subdomains. No authentication — only non-sensitive public fields
    are returned.
    """
    school = await crud_school.get_by_subdomain(db, subdomain=subdomain.strip().lower())
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return APIResponse(
        success=True,
        data={
            "id": str(school.id),
            "name": school.name,
            "logo_url": school.logo_url,
            "subdomain": school.subdomain,
            "status": school.status,
        },
    )

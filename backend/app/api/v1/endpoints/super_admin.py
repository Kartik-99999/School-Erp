from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.crud.crud_super_admin import (
    BillingHistory,
    crud_school_platform,
    crud_subscription_plan,
)
from app.models.school import School
from app.models.staff import Staff
from app.models.students import Student
from app.schemas.base import APIResponse
from app.schemas.super_admin import (
    BillingHistoryResponse,
    SchoolCreate,
    SchoolResponse,
    SchoolUpdate,
    SubscriptionPlanCreate,
    SubscriptionPlanResponse,
)

router = APIRouter()

# Dependency override for Super Admin: We DO NOT inject `school_id` into the tenant context here.
# Super admin views all data globally or filters explicitly by school_id.


def require_super_admin(token_data: deps.TokenData = Depends(deps.get_current_user_token_data)):
    if token_data.role != "Super Admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return token_data


async def get_super_admin_db(
    db: AsyncSession = Depends(deps.get_db), _=Depends(require_super_admin)
):
    from sqlalchemy import text

    # Platform Super Admin works across tenants: set the RLS bypass flag the
    # tenant_isolation policy honors (works whether the app connects as the owner
    # or the non-owner app role). Stashed on session.info so the after_begin
    # listener re-applies it to every transaction in this request (the app commits
    # mid-request); SET LOCAL is transaction-scoped so it can't leak via the pool.
    db.info["rls_bypass"] = True
    db.info.pop("rls_tenant", None)
    await db.execute(text("SELECT set_config('app.bypass_rls', 'on', true)"))
    return db


# --- SCHOOL MANAGEMENT ---
@router.post("/schools", response_model=APIResponse[SchoolResponse])
async def create_school(
    school_in: SchoolCreate,
    db: AsyncSession = Depends(get_super_admin_db),  # Global DB session with RLS off
):
    school = await crud_school_platform.create(db, obj_in=school_in)

    # Auto-provision School Admin Role and User
    import secrets
    import uuid

    from sqlalchemy import text

    from app.core.security import get_password_hash

    role_id = uuid.uuid4()
    await db.execute(
        text(
            "INSERT INTO roles (id, school_id, name, permissions) VALUES (:id, :s_id, 'School Admin', '{\"all\": true}')"
        ),
        {"id": role_id, "s_id": school.id},
    )

    admin_email = school_in.contact_email or f"admin@{school_in.subdomain}.educore.com"
    secure_password = secrets.token_urlsafe(16)
    await db.execute(
        text(
            "INSERT INTO users (id, school_id, email, hashed_password, role_id) VALUES (:id, :s_id, :email, :pw, :r_id)"
        ),
        {
            "id": uuid.uuid4(),
            "s_id": school.id,
            "email": admin_email,
            "pw": get_password_hash(secure_password),
            "r_id": role_id,
        },
    )
    await db.commit()

    return APIResponse(
        success=True,
        data=school,
        message=f"School created successfully! Default Admin Login: {admin_email}. Password: {secure_password}",
    )


@router.get("/schools", response_model=APIResponse[List[SchoolResponse]])
async def get_schools(db: AsyncSession = Depends(get_super_admin_db)):
    schools = await crud_school_platform.get_multi(db)

    # Enrich with stats
    data = []
    for s in schools:
        st_count = await db.execute(
            select(func.count(Student.id)).filter(
                Student.school_id == s.id, Student.status == "Active"
            )
        )
        sf_count = await db.execute(
            select(func.count(Staff.id)).filter(Staff.school_id == s.id, Staff.is_deleted == False)
        )

        resp = SchoolResponse.model_validate(s)
        resp.student_count = st_count.scalar_one()
        resp.staff_count = sf_count.scalar_one()
        data.append(resp)

    return APIResponse(success=True, data=data)


@router.put("/schools/{id}/status", response_model=APIResponse[SchoolResponse])
async def update_school_status(
    id: UUID,
    status: str,  # Active, Suspended, Trial
    db: AsyncSession = Depends(get_super_admin_db),
):
    school = await crud_school_platform.get(db, id=id)
    if not school:
        raise HTTPException(404)
    school.status = status
    db.add(school)
    await db.commit()
    return APIResponse(success=True, message=f"School status updated to {status}", data=school)


@router.put("/schools/{id}", response_model=APIResponse[SchoolResponse])
async def update_school(
    id: UUID, school_in: SchoolUpdate, db: AsyncSession = Depends(get_super_admin_db)
):
    school = await crud_school_platform.get(db, id=id)
    if not school:
        raise HTTPException(404, detail="School not found")

    school = await crud_school_platform.update(db, db_obj=school, obj_in=school_in)
    return APIResponse(success=True, message="School updated successfully", data=school)


@router.delete("/schools/{id}", response_model=APIResponse)
async def delete_school(id: UUID, db: AsyncSession = Depends(get_super_admin_db)):
    school = await crud_school_platform.get(db, id=id)
    if not school:
        raise HTTPException(404, detail="School not found")
    await crud_school_platform.remove(db, id=id)
    return APIResponse(success=True, message="School deleted successfully")


# --- SUBSCRIPTION PLANS ---
@router.post("/plans", response_model=APIResponse[SubscriptionPlanResponse])
async def create_plan(
    plan_in: SubscriptionPlanCreate, db: AsyncSession = Depends(get_super_admin_db)
):
    plan = await crud_subscription_plan.create(db, obj_in=plan_in)
    return APIResponse(success=True, data=plan)


@router.get("/plans", response_model=APIResponse[List[SubscriptionPlanResponse]])
async def get_plans(db: AsyncSession = Depends(get_super_admin_db)):
    # Pass school_id=None because this is a platform level table, not scoped to a specific school tenant
    # Using generic get_multi which by default selects all without school_id filter if not provided.
    query = select(crud_subscription_plan.model)
    plans = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=plans)


# --- BILLING HISTORY ---
@router.get("/billing", response_model=APIResponse[List[BillingHistoryResponse]])
async def get_billing_history(db: AsyncSession = Depends(get_super_admin_db)):
    query = (
        select(BillingHistory, School)
        .join(School, School.id == BillingHistory.school_id)
        .order_by(BillingHistory.created_at.desc())
    )
    results = await db.execute(query)

    data = []
    for bh, school in results:
        resp = BillingHistoryResponse.model_validate(bh)
        resp.school_name = school.name
        data.append(resp)

    return APIResponse(success=True, data=data)


@router.get("/dashboard-stats")
async def get_super_admin_stats(db: AsyncSession = Depends(get_super_admin_db)):
    total_schools = (await db.execute(select(func.count(School.id)))).scalar_one()
    active_schools = (
        await db.execute(select(func.count(School.id)).filter(School.status == "Active"))
    ).scalar_one()
    trial_schools = (
        await db.execute(select(func.count(School.id)).filter(School.status == "Trial"))
    ).scalar_one()
    total_revenue = (
        await db.execute(
            select(func.sum(BillingHistory.amount)).filter(BillingHistory.status == "Paid")
        )
    ).scalar_one() or 0

    return APIResponse(
        success=True,
        data={
            "total_schools": total_schools,
            "active_schools": active_schools,
            "trial_schools": trial_schools,
            "total_revenue": float(total_revenue),
        },
    )

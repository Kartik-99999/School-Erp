import json
import logging
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

import app.utils.pdf as pdf_module
from app.api import deps
from app.core.limiter import limiter
from app.crud.crud_audit import record_audit
from app.crud.crud_fees import (
    crud_fee_concession,
    crud_fee_payment,
    crud_fee_schedule,
    crud_student_fee_concession,
)
from app.crud.crud_setup import crud_fee_head, crud_fee_structure
from app.models.fees import FeePayment, FeeReceipt, FeeSchedule
from app.models.school import School
from app.models.setup import FeeHead, FeeStructure
from app.models.students import Student
from app.schemas.base import APIResponse
from app.schemas.fees import (
    BulkGenerateDuesRequest,
    FeeConcessionCreate,
    FeeConcessionResponse,
    FeeReceiptResponse,
    FeeScheduleResponse,
    OfflinePaymentCreate,
    PaymentAllocation,
    StudentFeeConcessionCreate,
    StudentFeeConcessionResponse,
)
from app.schemas.setup import (
    FeeHeadCreate,
    FeeHeadResponse,
    FeeStructureCreate,
    FeeStructureResponse,
    FeeStructureUpdate,
)
from app.utils.razorpay import (
    create_order,
    fetch_order,
    get_captured_amount,
    get_client,
    verify_payment,
    verify_webhook_signature,
)

router = APIRouter()

logger = logging.getLogger(__name__)


async def _resolve_payable_student_ids(db: AsyncSession, token_data: deps.TokenData) -> set:
    """Student/Parent may only pay their own (or their child's) dues."""
    if token_data.role == "Student":
        res = await db.execute(
            select(Student.id).filter(Student.user_id == UUID(token_data.user_id))
        )
        return set(res.scalars().all())
    if token_data.role == "Parent":
        from app.models.students import Parent

        parent = (
            (await db.execute(select(Parent).filter(Parent.user_id == UUID(token_data.user_id))))
            .scalars()
            .first()
        )
        if not parent:
            return set()
        res = await db.execute(select(Student.id).filter(Student.parent_id == parent.id))
        return set(res.scalars().all())
    return set()


# --- FEE TYPES / HEADS ---
@router.get("/types", response_model=APIResponse[List[dict]])
async def get_fee_types(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = select(FeeHead).filter(FeeHead.school_id == UUID(school_id))
    fee_heads = (await db.execute(query)).scalars().all()
    # Mock default_amount and frequency for the setup view
    result = []
    for fh in fee_heads:
        result.append(
            {
                "id": str(fh.id),
                "name": fh.name,
                "description": fh.description,
                "frequency": "Monthly",
                "default_amount": 0.00,
            }
        )
    return APIResponse(success=True, data=result)


class FeeTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    frequency: Optional[str] = "Monthly"
    default_amount: Optional[float] = 0.0


@router.post(
    "/types",
    response_model=APIResponse[dict],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_fee_type(
    in_data: FeeTypeCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    new_head = FeeHead(
        school_id=UUID(school_id), name=in_data.name, description=in_data.description
    )
    db.add(new_head)
    await db.commit()
    await db.refresh(new_head)
    return APIResponse(
        success=True,
        data={
            "id": str(new_head.id),
            "name": new_head.name,
            "description": new_head.description,
            "frequency": in_data.frequency,
            "default_amount": in_data.default_amount,
        },
    )


# --- FEE HEADS (catalog of fee names) ---
@router.get("/heads", response_model=APIResponse[List[FeeHeadResponse]])
async def get_fee_heads(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    rows = (
        (await db.execute(select(FeeHead).filter(FeeHead.school_id == UUID(school_id))))
        .scalars()
        .all()
    )
    return APIResponse(success=True, data=rows)


@router.post(
    "/heads",
    response_model=APIResponse[FeeHeadResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_fee_head(
    in_data: FeeHeadCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    obj = await crud_fee_head.create(db, obj_in=in_data, school_id=UUID(school_id))
    return APIResponse(success=True, data=obj)


# --- FEE STRUCTURES (per-class / per-grade amounts) ---
@router.get("/structures", response_model=APIResponse[List[FeeStructureResponse]])
async def get_fee_structures(
    class_id: Optional[UUID] = None,
    academic_year_id: Optional[UUID] = None,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    query = select(FeeStructure).filter(FeeStructure.school_id == UUID(school_id))
    if class_id:
        query = query.filter(FeeStructure.class_id == class_id)
    if academic_year_id:
        query = query.filter(FeeStructure.academic_year_id == academic_year_id)
    rows = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=rows)


@router.post(
    "/structures",
    response_model=APIResponse[FeeStructureResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def create_fee_structure(
    in_data: FeeStructureCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    # Upsert on (class, head, year) so re-saving a grade's fees updates instead of duplicating.
    existing = (
        (
            await db.execute(
                select(FeeStructure).filter(
                    FeeStructure.school_id == UUID(school_id),
                    FeeStructure.class_id == in_data.class_id,
                    FeeStructure.fee_head_id == in_data.fee_head_id,
                    FeeStructure.academic_year_id == in_data.academic_year_id,
                )
            )
        )
        .scalars()
        .first()
    )
    if existing:
        existing.amount = in_data.amount
        existing.frequency = in_data.frequency
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
        return APIResponse(success=True, data=existing, message="Fee structure updated")
    try:
        obj = await crud_fee_structure.create(db, obj_in=in_data, school_id=UUID(school_id))
    except IntegrityError:
        # Lost the race to a concurrent insert (uq_fee_structure_class_head_year).
        # Fetch the now-existing row and apply the requested amount instead.
        await db.rollback()
        existing = (
            (
                await db.execute(
                    select(FeeStructure).filter(
                        FeeStructure.school_id == UUID(school_id),
                        FeeStructure.class_id == in_data.class_id,
                        FeeStructure.fee_head_id == in_data.fee_head_id,
                        FeeStructure.academic_year_id == in_data.academic_year_id,
                    )
                )
            )
            .scalars()
            .first()
        )
        if not existing:
            raise
        existing.amount = in_data.amount
        existing.frequency = in_data.frequency
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
        return APIResponse(success=True, data=existing, message="Fee structure updated")
    return APIResponse(success=True, data=obj, message="Fee structure created")


@router.put(
    "/structures/{id}",
    response_model=APIResponse[FeeStructureResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
async def update_fee_structure(
    id: UUID,
    in_data: FeeStructureUpdate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    obj = (
        (
            await db.execute(
                select(FeeStructure).filter(
                    FeeStructure.id == id, FeeStructure.school_id == UUID(school_id)
                )
            )
        )
        .scalars()
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    for k, v in in_data.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return APIResponse(success=True, data=obj)


@router.delete(
    "/structures/{id}",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin"]))],
)
@limiter.limit("30/minute")
async def delete_fee_structure(
    id: UUID,
    request: Request,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    obj = (
        (
            await db.execute(
                select(FeeStructure).filter(
                    FeeStructure.id == id, FeeStructure.school_id == UUID(school_id)
                )
            )
        )
        .scalars()
        .first()
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    await db.delete(obj)
    await record_audit(
        db,
        action="fee.structure.deleted",
        school_id=UUID(school_id),
        actor_user_id=UUID(token_data.user_id),
        actor_role=token_data.role,
        entity_type="FeeStructure",
        entity_id=id,
        summary=f"Deleted fee structure {id} (amount {obj.amount})",
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()
    return APIResponse(success=True, message="Fee structure deleted")


# --- CONCESSIONS ---
@router.post(
    "/concessions",
    response_model=APIResponse[FeeConcessionResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin", "Accountant"]))],
)
async def create_concession(
    in_data: FeeConcessionCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    obj = await crud_fee_concession.create(db, obj_in=in_data, school_id=school_id)
    return APIResponse(success=True, data=obj)


@router.post("/concessions/assign", response_model=APIResponse[StudentFeeConcessionResponse])
async def assign_concession(
    in_data: StudentFeeConcessionCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    obj = await crud_student_fee_concession.create(db, obj_in=in_data, school_id=school_id)
    return APIResponse(success=True, data=obj)


# --- SCHEDULES & DUES ---
@router.post(
    "/dues/generate",
    response_model=APIResponse,
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin", "Accountant"]))],
)
async def generate_bulk_dues(
    req: BulkGenerateDuesRequest,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    try:
        count = await crud_fee_schedule.bulk_generate_dues(
            db, UUID(school_id), req.class_id, req.academic_year_id, req.due_date
        )
        return APIResponse(success=True, message=f"Successfully generated {count} due records.")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Bulk dues generation failed")
        raise HTTPException(
            status_code=400,
            detail="Could not generate dues. Verify the class and academic year, then retry.",
        )


@router.get("/dues", response_model=APIResponse[List[FeeScheduleResponse]])
async def get_dues(
    student_id: Optional[UUID] = None,
    class_id: Optional[UUID] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    query = select(FeeSchedule).filter(FeeSchedule.school_id == UUID(school_id))

    if token_data.role == "Parent":
        from app.models.students import Parent, Student

        parent_res = await db.execute(
            select(Parent).filter(Parent.user_id == UUID(token_data.user_id))
        )
        parent = parent_res.scalars().first()
        if not parent:
            return APIResponse(success=True, data=[])
        children_res = await db.execute(select(Student.id).filter(Student.parent_id == parent.id))
        child_ids = [c for c in children_res.scalars().all()]
        if not child_ids:
            return APIResponse(success=True, data=[])
        query = query.filter(FeeSchedule.student_id.in_(child_ids))
    if student_id:
        query = query.filter(FeeSchedule.student_id == student_id)
    if class_id:
        query = query.join(Student).filter(Student.current_class_id == class_id)
    if status:
        query = query.filter(FeeSchedule.status == status)

    schedules = (await db.execute(query)).scalars().all()
    return APIResponse(success=True, data=schedules)


# --- PAYMENTS ---
@router.post(
    "/payments/offline",
    response_model=APIResponse[FeeReceiptResponse],
    dependencies=[Depends(deps.require_roles(["School Admin", "Super Admin", "Accountant"]))],
)
@limiter.limit("60/minute")
async def record_offline_payment(
    payment_in: OfflinePaymentCreate,
    request: Request,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    try:
        receipt = await crud_fee_payment.process_payment(
            db, UUID(school_id), payment_in, UUID(token_data.user_id)
        )
        await record_audit(
            db,
            action="fee.payment.recorded",
            school_id=UUID(school_id),
            actor_user_id=UUID(token_data.user_id),
            actor_role=token_data.role,
            entity_type="FeeReceipt",
            entity_id=receipt.id,
            summary=f"Offline {receipt.payment_mode} payment of {receipt.total_amount} recorded ({receipt.receipt_number})",
            ip_address=request.client.host if request.client else None,
        )
        await db.commit()
        return APIResponse(success=True, data=receipt, message="Payment recorded successfully.")
    except HTTPException:
        raise
    except Exception:
        logger.exception("Recording offline payment failed")
        raise HTTPException(status_code=400, detail="Could not record the payment.")


class OnlinePaymentInitiate(BaseModel):
    amount: Decimal
    student_id: UUID
    allocations: List[PaymentAllocation]


class OnlinePaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    # Kept for backwards-compat with older clients but IGNORED — the order's `notes` are
    # the source of truth for student_id + allocations.
    student_id: Optional[UUID] = None
    allocations: Optional[List[PaymentAllocation]] = None


async def _load_school(db: AsyncSession, school_id) -> Optional[School]:
    return (await db.execute(select(School).filter(School.id == school_id))).scalars().first()


async def record_online_payment(
    db: AsyncSession, school: School, order_id: str, payment_id: str, captured_inr
) -> FeeReceipt:
    """Single source of truth for recording an online payment — shared by the browser
    `verify` callback and the async webhook. Uses the SCHOOL's own Razorpay client.

    Reads the validated intent (student_id / allocations) from the order's ``notes``,
    sanity-checks notes.school_id == the school the client belongs to, activates that
    tenant's RLS context manually (no JWT on the webhook path — admissions precedent),
    dedupes on the payment id (idempotent), caps the allocation at the captured amount,
    then records via the shared payment pipeline.
    """
    client = get_client(school.razorpay_key_id, school.razorpay_key_secret)
    order = fetch_order(client, order_id)
    notes = order.get("notes") or {}
    school_raw = notes.get("school_id")
    student_raw = notes.get("student_id")
    intent_raw = notes.get("intent")
    if not (school_raw and student_raw and intent_raw):
        raise HTTPException(status_code=400, detail="Order is missing its payment intent.")
    # The order's notes were stamped at initiate — it must belong to THIS school.
    if school_raw != str(school.id):
        raise HTTPException(status_code=400, detail="Order does not belong to this school.")
    try:
        student_uuid = UUID(student_raw)
        allocations = [
            PaymentAllocation(
                fee_schedule_id=UUID(item["fee_schedule_id"]),
                amount=Decimal(str(item["amount"])),
            )
            for item in json.loads(intent_raw)
        ]
    except (ValueError, KeyError, TypeError):
        raise HTTPException(status_code=400, detail="Order payment intent is malformed.")
    if not allocations:
        raise HTTPException(status_code=400, detail="Order has no fee allocations.")

    # Activate the tenant's RLS context (manual — no JWT on the webhook path). The
    # after_begin hook re-applies it across process_payment's commit.
    db.info["rls_tenant"] = str(school.id)
    await db.execute(
        text("SELECT set_config('app.current_tenant', :t, true)"), {"t": str(school.id)}
    )

    # Idempotency: a given Razorpay payment is recorded at most once.
    existing = (
        (
            await db.execute(
                select(FeeReceipt).filter(
                    FeeReceipt.school_id == school.id,
                    FeeReceipt.transaction_reference == payment_id,
                )
            )
        )
        .scalars()
        .first()
    )
    if existing:
        return existing

    # Never credit dues for more than the school actually captured.
    total_alloc = sum((a.amount for a in allocations), Decimal("0"))
    if total_alloc - Decimal(str(captured_inr)) > Decimal("0.01"):
        raise HTTPException(
            status_code=400, detail="Allocated amount exceeds the captured payment."
        )

    payment_in = OfflinePaymentCreate(
        student_id=student_uuid,
        payment_mode="Razorpay",
        transaction_reference=payment_id,
        remarks="Online payment via Razorpay",
        allocations=allocations,
    )
    try:
        # process_payment re-validates each schedule (tenant + student + remaining due),
        # locks rows FOR UPDATE, and commits.
        return await crud_fee_payment.process_payment(db, school.id, payment_in, None)
    except ValueError:
        logger.exception("Online payment intent rejected by process_payment")
        raise HTTPException(
            status_code=400, detail="Could not record the payment (dues may have changed)."
        )


@router.post(
    "/payments/online/initiate",
    dependencies=[
        Depends(
            deps.require_roles(["Student", "Parent", "School Admin", "Super Admin", "Accountant"])
        )
    ],
)
@limiter.limit("30/minute")
async def initiate_online_payment(
    payload: OnlinePaymentInitiate,
    request: Request,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    """Validate the intent and create a Razorpay order ON THE SCHOOL'S OWN ACCOUNT, with the
    intent in the order `notes`. Returns the order + the school's public key_id (the browser
    checkout must open with the school's key_id). 409 if the school hasn't configured online
    payments."""
    school = await _load_school(db, UUID(school_id))
    if not school or not school.razorpay_enabled:
        raise HTTPException(
            status_code=409, detail="Online payments are not configured for this school."
        )
    client = get_client(school.razorpay_key_id, school.razorpay_key_secret)

    # A student/parent may only pay their own (or their child's) dues.
    if token_data.role in ("Student", "Parent"):
        allowed = await _resolve_payable_student_ids(db, token_data)
        if payload.student_id not in allowed:
            raise HTTPException(status_code=403, detail="You can only pay your own dues.")

    if not payload.allocations:
        raise HTTPException(status_code=400, detail="No fee allocations provided.")
    # Every allocated schedule must belong to this student & tenant.
    sched_ids = [a.fee_schedule_id for a in payload.allocations]
    rows = (
        (
            await db.execute(
                select(FeeSchedule).filter(
                    FeeSchedule.id.in_(sched_ids),
                    FeeSchedule.school_id == UUID(school_id),
                )
            )
        )
        .scalars()
        .all()
    )
    found = {s.id: s for s in rows}
    for a in payload.allocations:
        sched = found.get(a.fee_schedule_id)
        if not sched or sched.student_id != payload.student_id:
            raise HTTPException(status_code=400, detail="Invalid fee schedule in allocations.")

    # Allocations must sum to the amount being collected.
    total_alloc = sum((a.amount for a in payload.allocations), Decimal("0"))
    if abs(total_alloc - payload.amount) > Decimal("0.01"):
        raise HTTPException(status_code=400, detail="Allocations must sum to the payment amount.")

    # Stash the full intent in the order notes (flat str->str map = the source of truth).
    notes = {
        "school_id": str(school_id),
        "student_id": str(payload.student_id),
        "intent": json.dumps(
            [
                {"fee_schedule_id": str(a.fee_schedule_id), "amount": str(a.amount)}
                for a in payload.allocations
            ]
        ),
    }
    order = create_order(
        client, payload.amount, receipt_id=f"fee_{payload.student_id}", notes=notes
    )
    return APIResponse(success=True, data={"order": order, "key_id": school.razorpay_key_id})


@router.post(
    "/payments/online/verify",
    response_model=APIResponse[FeeReceiptResponse],
    dependencies=[
        Depends(
            deps.require_roles(["Student", "Parent", "School Admin", "Super Admin", "Accountant"])
        )
    ],
)
@limiter.limit("30/minute")
async def verify_online_payment(
    payload: OnlinePaymentVerify,
    request: Request,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    """Browser callback: verify the payment signature with the SCHOOL's key_secret, then
    record from the order's notes via the shared recorder."""
    school = await _load_school(db, UUID(school_id))
    if not school or not school.razorpay_enabled:
        raise HTTPException(
            status_code=409, detail="Online payments are not configured for this school."
        )
    client = get_client(school.razorpay_key_id, school.razorpay_key_secret)
    if not verify_payment(
        client, payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature
    ):
        raise HTTPException(
            status_code=400, detail="Payment verification failed (signature mismatch)."
        )
    captured = get_captured_amount(client, payload.razorpay_payment_id)
    receipt = await record_online_payment(
        db, school, payload.razorpay_order_id, payload.razorpay_payment_id, captured
    )
    return APIResponse(success=True, data=receipt, message="Payment successful.")


@router.post("/payments/online/webhook/{school_id}")
async def razorpay_webhook(
    school_id: UUID, request: Request, db: AsyncSession = Depends(deps.get_db)
):
    """UNAUTHENTICATED per-school async payment confirmation. The {school_id} in the path is
    just a router; the real auth is the per-school HMAC — X-Razorpay-Signature verified
    against THIS school's own webhook secret, on the RAW body, BEFORE parsing (fail-closed
    400). 404 if the school is unknown or hasn't configured payments.

    200 once recorded; 400 on bad signature / malformed event (no retry); 5xx on a transient
    internal error (Razorpay retries). Idempotent — a duplicate, or one racing the browser
    verify, is a no-op."""
    school = await _load_school(db, school_id)
    if (
        not school
        or not school.razorpay_webhook_secret
        or not (school.razorpay_key_id and school.razorpay_key_secret)
    ):
        raise HTTPException(status_code=404, detail="Unknown or unconfigured school.")

    raw = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    client = get_client(school.razorpay_key_id, school.razorpay_key_secret)
    if not verify_webhook_signature(client, raw, signature, school.razorpay_webhook_secret):
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    try:
        event = json.loads(raw)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Malformed webhook body.")

    if event.get("event") not in ("payment.captured", "order.paid"):
        return {"status": "ignored"}  # ack unhandled events so Razorpay doesn't retry

    payload_obj = event.get("payload") or {}
    payment_entity = (payload_obj.get("payment") or {}).get("entity") or {}
    order_entity = (payload_obj.get("order") or {}).get("entity") or {}
    payment_id = payment_entity.get("id")
    order_id = payment_entity.get("order_id") or order_entity.get("id")
    captured_paise = payment_entity.get("amount")
    if captured_paise is None:
        captured_paise = order_entity.get("amount_paid")
    if not (order_id and payment_id and captured_paise is not None):
        raise HTTPException(status_code=400, detail="Webhook missing order/payment fields.")

    try:
        await record_online_payment(db, school, order_id, payment_id, float(captured_paise) / 100.0)
    except HTTPException:
        # Business/validation rejection (bad notes, cap, wrong school) or order-fetch 502 —
        # surface as-is: 4xx => Razorpay won't retry, 5xx => it retries.
        raise
    except Exception:
        logger.exception("Razorpay webhook processing failed")
        raise HTTPException(status_code=500, detail="Temporary error processing the webhook.")
    return {"status": "ok"}


@router.get(
    "/payment-options",
    dependencies=[
        Depends(
            deps.require_roles(["Student", "Parent", "School Admin", "Super Admin", "Accountant"])
        )
    ],
)
async def get_payment_options(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    """Parent-facing: which fee-collection methods this school has enabled + their display
    data. External + bank are DISPLAY/REDIRECT only (no auto-receipt — offline reconciliation);
    only Razorpay auto-records via its webhook."""
    school = (
        (await db.execute(select(School).filter(School.id == UUID(school_id)))).scalars().first()
    )
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    bank_on = bool(school.bank_transfer_enabled)
    data = {
        "razorpay": {
            "enabled": bool(school.razorpay_enabled and school.razorpay_key_id),
            "key_id": school.razorpay_key_id if school.razorpay_enabled else None,
        },
        "external": {
            "enabled": bool(school.external_payment_enabled and school.external_payment_url),
            "url": school.external_payment_url if school.external_payment_enabled else None,
        },
        "bank": {
            "enabled": bank_on,
            "bank_name": school.bank_name if bank_on else None,
            "account_number": school.bank_account_number if bank_on else None,
            "ifsc": school.bank_ifsc if bank_on else None,
            "branch": school.bank_branch if bank_on else None,
            "account_holder": school.bank_account_holder if bank_on else None,
            "upi_id": school.bank_upi_id if bank_on else None,
        },
    }
    return APIResponse(success=True, data=data)


@router.get("/receipts", response_model=APIResponse[List[FeeReceiptResponse]])
async def get_receipts(
    student_id: Optional[UUID] = None,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    query = select(FeeReceipt).filter(FeeReceipt.school_id == UUID(school_id))

    if token_data.role == "Parent":
        from app.models.students import Parent, Student

        parent_res = await db.execute(
            select(Parent).filter(Parent.user_id == UUID(token_data.user_id))
        )
        parent = parent_res.scalars().first()
        if not parent:
            return APIResponse(success=True, data=[])
        children_res = await db.execute(select(Student.id).filter(Student.parent_id == parent.id))
        child_ids = [c for c in children_res.scalars().all()]
        if not child_ids:
            return APIResponse(success=True, data=[])
        query = query.filter(FeeReceipt.student_id.in_(child_ids))
    if student_id:
        query = query.filter(FeeReceipt.student_id == student_id)
    query = query.order_by(FeeReceipt.created_at.desc())
    receipts = (await db.execute(query)).scalars().all()

    # Populate each receipt's allocations in ONE batched query (no N+1, no ORM
    # relationship) so FeeReceiptResponse.allocations isn't silently empty.
    receipt_ids = [r.id for r in receipts]
    if receipt_ids:
        pays = (
            (await db.execute(select(FeePayment).filter(FeePayment.receipt_id.in_(receipt_ids))))
            .scalars()
            .all()
        )
        by_receipt: dict = {}
        for p in pays:
            by_receipt.setdefault(p.receipt_id, []).append(p)
        for r in receipts:
            r.allocations = by_receipt.get(r.id, [])
    return APIResponse(success=True, data=receipts)


# Register Receipt PDF Template
pdf_module.TEMPLATES[
    "fee_receipt.html"
] = """
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 14px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .details { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { font-weight: bold; font-size: 16px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>FEE RECEIPT</h2>
        <p>Receipt No: {{ receipt.receipt_number }} | Date: {{ receipt.payment_date }}</p>
    </div>
    <div class="details">
        <p><strong>Student Name:</strong> {{ student.first_name }} {{ student.last_name }}</p>
        <p><strong>Admission No:</strong> {{ student.admission_number }}</p>
        <p><strong>Payment Mode:</strong> {{ receipt.payment_mode }} {% if receipt.transaction_reference %} (Ref: {{ receipt.transaction_reference }}) {% endif %}</p>
    </div>
    <table>
        <tr>
            <th>Description</th>
            <th>Amount Paid (INR)</th>
        </tr>
        {% for p in allocations %}
        <tr>
            <td>Fee Installment (Allocated)</td>
            <td>{{ p.amount_allocated }}</td>
        </tr>
        {% endfor %}
        <tr class="total">
            <td>Total Received</td>
            <td>{{ receipt.total_amount }}</td>
        </tr>
    </table>
    <p><em>Thank you for your payment.</em></p>
</body>
</html>
"""


@router.get(
    "/receipts/{id}/pdf",
    dependencies=[
        Depends(
            deps.require_roles(["School Admin", "Super Admin", "Accountant", "Student", "Parent"])
        )
    ],
)
async def generate_receipt_pdf(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    # Tenant-scoped: never serve another school's receipt (this is financial +
    # minor PII). Without the school_id filter any authenticated user could fetch
    # any receipt by id.
    receipt = (
        (
            await db.execute(
                select(FeeReceipt).filter(
                    FeeReceipt.id == id,
                    FeeReceipt.school_id == UUID(school_id),
                )
            )
        )
        .scalars()
        .first()
    )
    if not receipt:
        raise HTTPException(404)

    # Student/Parent may only download their own (or their child's) receipts.
    if token_data.role in ("Student", "Parent"):
        allowed = await _resolve_payable_student_ids(db, token_data)
        if receipt.student_id not in allowed:
            raise HTTPException(status_code=403, detail="You can only access your own receipts.")

    student = (
        (await db.execute(select(Student).filter(Student.id == receipt.student_id)))
        .scalars()
        .first()
    )
    allocs = (
        (await db.execute(select(FeePayment).filter(FeePayment.receipt_id == id))).scalars().all()
    )

    context = {"receipt": receipt, "student": student, "allocations": allocs}
    pdf_bytes = pdf_module.generate_pdf("fee_receipt.html", context)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Receipt_{receipt.receipt_number}.pdf"
        },
    )


@router.get(
    "/receipts/{id}/html",
    dependencies=[
        Depends(
            deps.require_roles(["School Admin", "Super Admin", "Accountant", "Student", "Parent"])
        )
    ],
)
async def generate_receipt_html(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
):
    """Same data + tenant/ownership scoping as the PDF receipt, returned as HTML so the
    mobile WebView can render it inline on Android (which can't display PDFs natively)."""
    receipt = (
        (
            await db.execute(
                select(FeeReceipt).filter(FeeReceipt.id == id, FeeReceipt.school_id == UUID(school_id))
            )
        )
        .scalars()
        .first()
    )
    if not receipt:
        raise HTTPException(404)
    if token_data.role in ("Student", "Parent"):
        allowed = await _resolve_payable_student_ids(db, token_data)
        if receipt.student_id not in allowed:
            raise HTTPException(status_code=403, detail="You can only access your own receipts.")

    student = (
        (await db.execute(select(Student).filter(Student.id == receipt.student_id))).scalars().first()
    )
    allocs = (
        (await db.execute(select(FeePayment).filter(FeePayment.receipt_id == id))).scalars().all()
    )
    html = pdf_module.render_html(
        "fee_receipt.html", {"receipt": receipt, "student": student, "allocations": allocs}
    )
    return Response(content=html, media_type="text/html")

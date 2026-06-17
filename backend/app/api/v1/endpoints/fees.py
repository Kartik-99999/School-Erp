import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

import app.utils.pdf as pdf_module
from app.api import deps
from app.core.config import settings
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
from app.utils.razorpay import create_order, verify_payment

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
    amount: float,
    student_id: UUID,
    request: Request,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
):
    # Creates a Razorpay order; returns the public key_id so the browser
    # checkout widget can be opened. (Raises 502 if Razorpay isn't configured.)
    order = create_order(amount, receipt_id=f"fee_{student_id}")
    return APIResponse(success=True, data={"order": order, "key_id": settings.RAZORPAY_KEY_ID})


class OnlinePaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    student_id: UUID
    allocations: List[PaymentAllocation]


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
    # 1. Verify the Razorpay signature (fail-closed).
    if not verify_payment(
        payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature
    ):
        raise HTTPException(
            status_code=400, detail="Payment verification failed (signature mismatch)."
        )

    # 2. A student/parent may only settle their own dues.
    if token_data.role in ("Student", "Parent"):
        allowed = await _resolve_payable_student_ids(db, token_data)
        if payload.student_id not in allowed:
            raise HTTPException(status_code=403, detail="You can only pay your own dues.")

    # 3. Every allocated schedule must belong to this student & tenant.
    sched_ids = [a.fee_schedule_id for a in payload.allocations]
    if not sched_ids:
        raise HTTPException(status_code=400, detail="No fee allocations provided.")
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

    # 3b. Idempotency — a given Razorpay payment may only be recorded once.
    dup = (
        (
            await db.execute(
                select(FeeReceipt).filter(
                    FeeReceipt.school_id == UUID(school_id),
                    FeeReceipt.transaction_reference == payload.razorpay_payment_id,
                )
            )
        )
        .scalars()
        .first()
    )
    if dup:
        raise HTTPException(status_code=409, detail="This payment has already been recorded.")

    # 3c. Never credit dues for more than Razorpay actually captured.
    from app.utils.razorpay import get_captured_amount

    total_alloc = round(sum(float(a.amount) for a in payload.allocations), 2)
    captured = round(get_captured_amount(payload.razorpay_payment_id), 2)
    if total_alloc - captured > 0.01:
        raise HTTPException(
            status_code=400, detail="Allocated amount exceeds the captured payment."
        )

    # 4. Record the receipt + allocations (reuses the offline payment pipeline).
    payment_in = OfflinePaymentCreate(
        student_id=payload.student_id,
        payment_mode="Razorpay",
        transaction_reference=payload.razorpay_payment_id,
        remarks="Online payment via Razorpay",
        allocations=payload.allocations,
    )
    try:
        receipt = await crud_fee_payment.process_payment(db, UUID(school_id), payment_in, None)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Processing online payment failed")
        raise HTTPException(status_code=400, detail="Could not process the payment.")
    return APIResponse(success=True, data=receipt, message="Payment successful.")


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

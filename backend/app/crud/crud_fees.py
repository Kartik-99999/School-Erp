from decimal import Decimal
from typing import Dict
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.crud.base import CRUDBase
from app.models.fees import (
    ChequeBounce,
    FeeConcession,
    FeePayment,
    FeeReceipt,
    FeeSchedule,
    StudentFeeConcession,
)
from app.models.school import School
from app.models.setup import FeeStructure
from app.models.students import Parent, Student
from app.schemas.fees import (
    FeeScheduleCreate,
    OfflinePaymentCreate,
)
from app.utils.twilio import send_whatsapp_if_enabled


async def create_adhoc_due(db, school_id, student_id, amount, label, due_date=None):
    """Create a one-off fee due (e.g. hostel/transport) not tied to a class fee structure.
    Stages the row (the caller commits). Returns None if amount<=0 or no active year."""
    if amount is None or amount <= 0:
        return None
    from datetime import date as _date

    from app.models.setup import AcademicYear

    ay = (
        (
            await db.execute(
                select(AcademicYear).filter(
                    AcademicYear.school_id == school_id, AcademicYear.is_active == True
                )
            )
        )
        .scalars()
        .first()
    )
    if not ay:
        return None
    # Idempotency: don't double-bill — reuse an existing unpaid due with the same label.
    existing = (
        (
            await db.execute(
                select(FeeSchedule).filter(
                    FeeSchedule.school_id == school_id,
                    FeeSchedule.student_id == student_id,
                    FeeSchedule.label == label,
                    FeeSchedule.status != "Paid",
                )
            )
        )
        .scalars()
        .first()
    )
    if existing:
        return existing
    due = FeeSchedule(
        school_id=school_id,
        student_id=student_id,
        fee_structure_id=None,
        academic_year_id=ay.id,
        due_date=due_date or _date.today(),
        base_amount=amount,
        concession_amount=0,
        net_due_amount=amount,
        amount_paid=0,
        status="Pending",
        label=label,
    )
    db.add(due)
    await db.flush()
    return due


class CRUDSimple(CRUDBase):
    pass


crud_fee_concession = CRUDSimple(FeeConcession)
crud_student_fee_concession = CRUDSimple(StudentFeeConcession)
crud_cheque_bounce = CRUDSimple(ChequeBounce)


class CRUDFeeSchedule(CRUDBase[FeeSchedule, FeeScheduleCreate, dict]):
    async def bulk_generate_dues(
        self,
        db: AsyncSession,
        school_id: UUID,
        class_id: UUID,
        academic_year_id: UUID,
        due_date: str,
    ):
        # 1. Get Fee Structures for Class
        structures = (
            (
                await db.execute(
                    select(FeeStructure).filter(
                        FeeStructure.school_id == school_id,
                        FeeStructure.class_id == class_id,
                        FeeStructure.academic_year_id == academic_year_id,
                    )
                )
            )
            .scalars()
            .all()
        )
        if not structures:
            raise ValueError("No fee structures defined for this class and academic year.")

        # 2. Get Students
        students = (
            (
                await db.execute(
                    select(Student).filter(
                        Student.school_id == school_id,
                        Student.current_class_id == class_id,
                        Student.status == "Active",
                    )
                )
            )
            .scalars()
            .all()
        )
        student_ids = [s.id for s in students]
        structure_ids = [s.id for s in structures]

        # Prefetch every student's concessions in ONE query (grouped by student)
        # instead of a query per student.
        concessions_by_student: Dict[UUID, list] = {}
        if student_ids:
            conc_rows = (
                await db.execute(
                    select(StudentFeeConcession.student_id, FeeConcession)
                    .join(FeeConcession, FeeConcession.id == StudentFeeConcession.concession_id)
                    .filter(
                        StudentFeeConcession.student_id.in_(student_ids),
                        StudentFeeConcession.academic_year_id == academic_year_id,
                    )
                )
            ).all()
            for sid, conc in conc_rows:
                concessions_by_student.setdefault(sid, []).append(conc)

        # Prefetch the (student, structure) pairs already billed for this due date in
        # ONE query, so duplicate-skipping doesn't cost a query per pair.
        already_billed = set()
        if student_ids:
            existing_rows = (
                await db.execute(
                    select(FeeSchedule.student_id, FeeSchedule.fee_structure_id).filter(
                        FeeSchedule.student_id.in_(student_ids),
                        FeeSchedule.fee_structure_id.in_(structure_ids),
                        FeeSchedule.due_date == due_date,
                    )
                )
            ).all()
            already_billed = {(sid, fsid) for sid, fsid in existing_rows}

        # 3. Generate Dues
        generated_count = 0
        for student in students:
            concessions = concessions_by_student.get(student.id, [])

            for struct in structures:
                # Skip if already generated for this structure and due date
                if (student.id, struct.id) in already_billed:
                    continue

                # Calc Concession (simplified: apply max applicable concession)
                conc_amount = Decimal("0")
                for c in concessions:
                    amt = struct.amount * c.value / 100 if c.type == "Percentage" else c.value
                    if amt > conc_amount:
                        conc_amount = amt

                if conc_amount > struct.amount:
                    conc_amount = struct.amount

                net_due = struct.amount - conc_amount

                new_due = FeeSchedule(
                    school_id=school_id,
                    student_id=student.id,
                    fee_structure_id=struct.id,
                    academic_year_id=academic_year_id,
                    due_date=due_date,
                    base_amount=struct.amount,
                    concession_amount=conc_amount,
                    net_due_amount=net_due,
                    amount_paid=0,
                    status="Pending",
                )
                db.add(new_due)
                generated_count += 1

        await db.commit()
        return generated_count


class CRUDFeePayment(CRUDBase[FeeReceipt, dict, dict]):
    async def _generate_receipt_number(self, db: AsyncSession, school_code: str) -> str:
        # Gap-free, collision-free sequential number from a Postgres sequence.
        seq = (await db.execute(text("SELECT nextval('global_receipt_seq')"))).scalar_one()
        return f"RCPT/{school_code}/{str(seq).zfill(6)}"

    async def process_payment(
        self,
        db: AsyncSession,
        school_id: UUID,
        payment_in: OfflinePaymentCreate,
        user_id: UUID = None,
    ) -> FeeReceipt:

        school = (await db.execute(select(School).filter(School.id == school_id))).scalars().first()
        school_code = (
            "".join([word[0] for word in school.name.split()[:3]]).upper() if school else "SCH"
        )

        total_paid = sum((alloc.amount for alloc in payment_in.allocations), Decimal("0"))

        receipt = FeeReceipt(
            school_id=school_id,
            student_id=payment_in.student_id,
            receipt_number=await self._generate_receipt_number(db, school_code),
            total_amount=total_paid,
            payment_mode=payment_in.payment_mode,
            transaction_reference=payment_in.transaction_reference,
            remarks=payment_in.remarks,
            created_by=user_id,
            status="Success",
        )
        db.add(receipt)
        await db.flush()

        # Sort by schedule id so concurrent multi-allocation payments always lock
        # rows in the same order — avoids deadlocks between overlapping payments.
        for alloc in sorted(payment_in.allocations, key=lambda a: str(a.fee_schedule_id)):
            # Lock the schedule row (SELECT ... FOR UPDATE) so two concurrent
            # payments against the same due can't both read the old amount_paid
            # and overwrite each other (lost-update race).
            sched = (
                (
                    await db.execute(
                        select(FeeSchedule)
                        .filter(FeeSchedule.id == alloc.fee_schedule_id)
                        .with_for_update()
                    )
                )
                .scalars()
                .first()
            )
            # The due must exist and belong to THIS school AND student — never let
            # a payment be applied to another tenant's or another student's due.
            if (
                not sched
                or sched.school_id != school_id
                or sched.student_id != payment_in.student_id
            ):
                raise ValueError("Invalid fee schedule in allocations.")

            remaining_due = sched.net_due_amount - sched.amount_paid
            if alloc.amount > remaining_due:
                raise ValueError(
                    f"Allocated amount {alloc.amount} exceeds the remaining due balance of {remaining_due} for this fee schedule."
                )

            sched.amount_paid = sched.amount_paid + alloc.amount
            if sched.amount_paid >= sched.net_due_amount:
                sched.status = "Paid"
            else:
                sched.status = "Partial"
            db.add(sched)

            # Record the allocation against the receipt (only after validation).
            payment = FeePayment(
                school_id=school_id,
                receipt_id=receipt.id,
                fee_schedule_id=alloc.fee_schedule_id,
                amount_allocated=alloc.amount,
            )
            db.add(payment)

        await db.commit()
        await db.refresh(receipt)

        # Re-load the allocations onto the receipt so the API response
        # (FeeReceiptResponse.allocations) is populated. There is no ORM
        # relationship, so without this the field silently serializes as [].
        receipt.allocations = (
            (await db.execute(select(FeePayment).filter(FeePayment.receipt_id == receipt.id)))
            .scalars()
            .all()
        )

        # Notify Parent
        student = (
            (await db.execute(select(Student).filter(Student.id == payment_in.student_id)))
            .scalars()
            .first()
        )
        if student:
            parent = (
                (await db.execute(select(Parent).filter(Parent.id == student.parent_id)))
                .scalars()
                .first()
            )
            if parent and (parent.father_phone or parent.mother_phone):
                phone = parent.father_phone or parent.mother_phone
                msg = f"Receipt Alert: We have received a payment of ₹{total_paid} against receipt no. {receipt.receipt_number} for {student.first_name}. Thank you."
                send_whatsapp_if_enabled(school, phone, msg)

        return receipt


crud_fee_schedule = CRUDFeeSchedule(FeeSchedule)
crud_fee_payment = CRUDFeePayment(FeeReceipt)

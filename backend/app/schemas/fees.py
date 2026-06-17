from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# Concessions
class FeeConcessionBase(BaseModel):
    name: str
    type: str  # 'Percentage' or 'Fixed'
    value: Decimal


class FeeConcessionCreate(FeeConcessionBase):
    pass


class FeeConcessionResponse(FeeConcessionBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class StudentFeeConcessionBase(BaseModel):
    student_id: UUID
    concession_id: UUID


class StudentFeeConcessionCreate(StudentFeeConcessionBase):
    academic_year_id: UUID


class StudentFeeConcessionResponse(StudentFeeConcessionBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


# Schedules (Dues)
class FeeScheduleBase(BaseModel):
    student_id: UUID
    fee_structure_id: Optional[UUID] = None
    label: Optional[str] = None
    academic_year_id: UUID
    due_date: date
    base_amount: Decimal
    concession_amount: Decimal = Decimal("0")
    net_due_amount: Decimal
    amount_paid: Decimal = Decimal("0")
    status: str = "Pending"
    late_fine_applied: Decimal = Decimal("0")


class FeeScheduleCreate(FeeScheduleBase):
    pass


class FeeScheduleResponse(FeeScheduleBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class BulkGenerateDuesRequest(BaseModel):
    academic_year_id: UUID
    class_id: UUID
    due_date: date


# Payments & Receipts
class PaymentAllocation(BaseModel):
    fee_schedule_id: UUID
    amount: Decimal


class OfflinePaymentCreate(BaseModel):
    student_id: UUID
    payment_mode: str
    transaction_reference: Optional[str] = None
    remarks: Optional[str] = None
    allocations: List[PaymentAllocation]


class FeePaymentResponse(BaseModel):
    id: UUID
    fee_schedule_id: UUID
    amount_allocated: Decimal
    model_config = ConfigDict(from_attributes=True)


class FeeReceiptResponse(BaseModel):
    id: UUID
    student_id: UUID
    receipt_number: str
    total_amount: Decimal
    payment_mode: str
    transaction_reference: Optional[str]
    payment_date: datetime
    status: str
    allocations: List[FeePaymentResponse] = []
    model_config = ConfigDict(from_attributes=True)

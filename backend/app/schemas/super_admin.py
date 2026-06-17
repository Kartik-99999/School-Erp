from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class SchoolBase(BaseModel):
    name: str
    subdomain: str
    logo_url: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    board_affiliation: Optional[str] = None
    status: str = "Trial"
    grading_system: Optional[str] = "percentage"


class SchoolCreate(SchoolBase):
    subscription_plan_id: Optional[UUID] = None
    subscription_expires_at: Optional[datetime] = None


class SchoolUpdate(BaseModel):
    name: Optional[str] = None
    subdomain: Optional[str] = None
    status: Optional[str] = None
    grading_system: Optional[str] = None
    subscription_plan_id: Optional[UUID] = None
    subscription_expires_at: Optional[datetime] = None


class SchoolSettingsUpdate(BaseModel):
    """Fields a School Admin may edit on their own school (no subdomain/status/billing)."""

    name: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    board_affiliation: Optional[str] = None
    grading_system: Optional[str] = None


class SchoolResponse(SchoolBase):
    id: UUID
    subscription_plan_id: Optional[UUID] = None
    subscription_expires_at: Optional[datetime] = None
    created_at: datetime
    # Aggregated stats for super admin view
    student_count: Optional[int] = 0
    staff_count: Optional[int] = 0
    model_config = ConfigDict(from_attributes=True)


class SubscriptionPlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    price_monthly: float
    price_annual: float
    features: Dict[str, Any] = {}


class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass


class SubscriptionPlanResponse(SubscriptionPlanBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class BillingHistoryResponse(BaseModel):
    id: UUID
    school_id: UUID
    amount: float
    currency: str
    status: str
    invoice_url: Optional[str] = None
    created_at: datetime
    school_name: Optional[str] = None  # Enriched
    model_config = ConfigDict(from_attributes=True)

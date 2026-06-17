from typing import List

# Note: subscription_plans and billing_history were defined in db/schema.sql but not explicitly modeled in python yet.
# We will create quick models for them here to complete the CRUD.
from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func

from app.crud.base import CRUDBase
from app.models.base import Base
from app.models.school import School


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    name = Column(String(100), nullable=False)
    description = Column(Text)
    price_monthly = Column(Numeric(10, 2), nullable=False)
    price_annual = Column(Numeric(10, 2), nullable=False)
    features = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    is_deleted = Column(Boolean, default=False)


class BillingHistory(Base):
    __tablename__ = "billing_history"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id", ondelete="CASCADE"))
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(50), nullable=False)
    invoice_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


from app.schemas.super_admin import SchoolCreate, SchoolUpdate


class CRUDSchoolPlatform(CRUDBase[School, SchoolCreate, SchoolUpdate]):
    async def get_multi(self, db: AsyncSession, *, skip: int = 0, limit: int = 100) -> List[School]:
        query = select(self.model).filter(self.model.is_deleted == False).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()


class CRUDSimple(CRUDBase):
    pass


crud_school_platform = CRUDSchoolPlatform(School)
crud_subscription_plan = CRUDSimple(SubscriptionPlan)
crud_billing_history = CRUDSimple(BillingHistory)

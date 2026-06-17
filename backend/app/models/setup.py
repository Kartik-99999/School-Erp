from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class AcademicYear(Base):
    __tablename__ = "academic_years"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(50), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    is_deleted = Column(Boolean, default=False)


class SchoolSetting(Base):
    __tablename__ = "school_settings"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    setting_key = Column(String(100), nullable=False)
    setting_value = Column(JSON, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class ClassModel(Base):
    __tablename__ = "classes"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(50), nullable=False)
    numeric_value = Column(Integer)
    level = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    is_deleted = Column(Boolean, default=False)


class Section(Base):
    __tablename__ = "sections"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    # FK resolves by table name (string), so there is no circular-import risk;
    # the DB (schema.sql) already enforces this — keep the ORM in sync.
    class_id = Column(
        UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    is_deleted = Column(Boolean, default=False)


class Subject(Base):
    __tablename__ = "subjects"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(50))
    type = Column(String(50), default="Theory")
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    is_deleted = Column(Boolean, default=False)


class ClassSubject(Base):
    __tablename__ = "class_subjects"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    class_id = Column(UUID(as_uuid=True), nullable=False)
    subject_id = Column(UUID(as_uuid=True), nullable=False)


class FeeHead(Base):
    __tablename__ = "fee_heads"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class FeeStructure(Base):
    __tablename__ = "fee_structures"
    # One amount per (class, fee head, year) per school — backs the upsert in
    # POST /fees/structures and blocks duplicate rows from concurrent requests.
    __table_args__ = (
        UniqueConstraint(
            "school_id",
            "class_id",
            "fee_head_id",
            "academic_year_id",
            name="uq_fee_structure_class_head_year",
        ),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    academic_year_id = Column(UUID(as_uuid=True), nullable=False)
    class_id = Column(UUID(as_uuid=True), nullable=False)
    fee_head_id = Column(UUID(as_uuid=True), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    frequency = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())

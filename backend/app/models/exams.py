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
    Text,
    Time,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class GradeScale(Base):
    __tablename__ = "grade_scales"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(100), nullable=False)  # e.g., Default A1-E
    rules = Column(
        JSON, nullable=False
    )  # e.g., [{"min": 91, "max": 100, "grade": "A1", "points": 10}, ...]
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class ExamType(Base):
    __tablename__ = "exam_types"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(100), nullable=False)  # Unit Test, Half Yearly, Annual
    weightage_percent = Column(Numeric(5, 2))
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class Exam(Base):
    __tablename__ = "exams"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    academic_year_id = Column(UUID(as_uuid=True), nullable=False)
    exam_type_id = Column(
        UUID(as_uuid=True), ForeignKey("exam_types.id", ondelete="CASCADE"), nullable=False
    )
    class_id = Column(
        UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String(200), nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(String(50), default="Scheduled")  # Scheduled, Marks Entry, Published
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class ExamSchedule(Base):
    __tablename__ = "exam_schedules"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False
    )
    exam_date = Column(Date, nullable=False)
    start_time = Column(Time)
    end_time = Column(Time)
    max_marks = Column(Numeric(5, 2), nullable=False)
    passing_marks = Column(Numeric(5, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class StudentMark(Base):
    __tablename__ = "student_marks"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    exam_schedule_id = Column(
        UUID(as_uuid=True), ForeignKey("exam_schedules.id", ondelete="CASCADE"), nullable=False
    )
    student_id = Column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    marks_obtained = Column(Numeric(5, 2))
    is_absent = Column(Boolean, default=False)
    remarks = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class Result(Base):
    __tablename__ = "results"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    exam_id = Column(
        UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    total_marks = Column(Numeric(7, 2))
    obtained_marks = Column(Numeric(7, 2))
    percentage = Column(Numeric(5, 2))
    grade = Column(String(10))
    status = Column(String(20))  # Pass, Fail
    rank = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class ReportCardRemark(Base):
    __tablename__ = "report_card_remarks"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    result_id = Column(
        UUID(as_uuid=True), ForeignKey("results.id", ondelete="CASCADE"), nullable=False
    )
    teacher_remark = Column(Text)
    principal_remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())

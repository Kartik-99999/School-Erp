from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


class TimetablePeriod(Base):
    __tablename__ = "timetable_periods"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(50), nullable=False)  # e.g., Period 1, Break, Period 2
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_break = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class TimetableSlot(Base):
    __tablename__ = "timetable_slots"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    academic_year_id = Column(UUID(as_uuid=True), nullable=False)
    class_id = Column(
        UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    section_id = Column(
        UUID(as_uuid=True), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False
    )
    period_id = Column(
        UUID(as_uuid=True), ForeignKey("timetable_periods.id", ondelete="CASCADE"), nullable=False
    )
    day_of_week = Column(String(20), nullable=False)  # Monday, Tuesday, etc.
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class SyllabusChapter(Base):
    __tablename__ = "syllabus_chapters"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    academic_year_id = Column(UUID(as_uuid=True), nullable=False)
    class_id = Column(
        UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    subject_id = Column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False
    )
    chapter_name = Column(String(255), nullable=False)
    description = Column(Text)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class SyllabusProgress(Base):
    __tablename__ = "syllabus_progress"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    chapter_id = Column(
        UUID(as_uuid=True), ForeignKey("syllabus_chapters.id", ondelete="CASCADE"), nullable=False
    )
    section_id = Column(
        UUID(as_uuid=True), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False
    )
    completion_date = Column(Date, nullable=False)
    marked_by_teacher_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class Homework(Base):
    __tablename__ = "homework"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    academic_year_id = Column(UUID(as_uuid=True), nullable=False)
    class_id = Column(
        UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    section_id = Column(
        UUID(as_uuid=True), ForeignKey("sections.id", ondelete="CASCADE"), nullable=False
    )
    subject_id = Column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False
    )
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("staff.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    due_date = Column(Date, nullable=False)
    attachment_url = Column(Text)
    status = Column(String(50), default="Assigned")  # Assigned, Reviewed
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class HomeworkSubmission(Base):
    __tablename__ = "homework_submissions"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    homework_id = Column(
        UUID(as_uuid=True), ForeignKey("homework.id", ondelete="CASCADE"), nullable=False
    )
    student_id = Column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    submitted_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    file_url = Column(Text)
    status = Column(String(50), default="Submitted")  # Submitted, Graded
    grade = Column(String(20))
    feedback = Column(Text)

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.crypto import EncryptedString
from app.models.base import Base


class Parent(Base):
    __tablename__ = "parents"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    father_name = Column(String(200))
    father_phone = Column(String(50))
    father_email = Column(String(255))
    father_occupation = Column(String(100))
    father_religion = Column(String(50))
    father_category = Column(String(50))
    father_nationality = Column(String(50))
    father_aadhaar = Column(EncryptedString)
    mother_name = Column(String(200))
    mother_phone = Column(String(50))
    mother_email = Column(String(255))
    mother_occupation = Column(String(100))
    mother_religion = Column(String(50))
    mother_category = Column(String(50))
    mother_nationality = Column(String(50))
    mother_aadhaar = Column(EncryptedString)
    guardian_name = Column(String(200))
    guardian_phone = Column(String(50))
    guardian_email = Column(String(255))
    guardian_relation = Column(String(100))
    guardian_religion = Column(String(50))
    guardian_category = Column(String(50))
    guardian_nationality = Column(String(50))
    guardian_aadhaar = Column(EncryptedString)
    primary_contact_email = Column(String(255))  # used for the Parent portal login
    address = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    is_deleted = Column(Boolean, default=False)


class Student(Base):
    __tablename__ = "students"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("parents.id"), nullable=False)
    admission_number = Column(String(100))
    roll_number = Column(Integer)
    date_of_joining = Column(Date)  # date the student joined the school
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    dob = Column(Date, nullable=False)
    gender = Column(String(20))
    blood_group = Column(String(10))
    nationality = Column(String(50), default="Indian")
    religion = Column(String(50))
    category = Column(String(50))  # General, OBC, SC, ST
    mother_tongue = Column(String(50))
    # Government / academic identifiers (India)
    apaar_id = Column(EncryptedString)  # Automated Permanent Academic Account Registry
    aadhaar_no = Column(EncryptedString)  # national ID
    pen_number = Column(EncryptedString)  # Permanent Education Number
    photo_url = Column(Text)
    current_class_id = Column(UUID(as_uuid=True))
    current_section_id = Column(UUID(as_uuid=True))
    academic_year_id = Column(UUID(as_uuid=True))
    status = Column(String(50), default="Active")  # Active, Transferred Out, Passed Out, Dropout
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
    is_deleted = Column(Boolean, default=False)


class StudentMedical(Base):
    __tablename__ = "student_medical"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    student_id = Column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    allergies = Column(Text)
    chronic_conditions = Column(Text)
    doctor_name = Column(String(100))
    doctor_phone = Column(String(50))
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )


class StudentDocument(Base):
    __tablename__ = "student_documents"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False)
    student_id = Column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    document_type = Column(String(100))
    document_url = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

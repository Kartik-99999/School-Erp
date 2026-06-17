"""Co-curricular modules: Houses (with a points ledger), Clubs, and Sports.

Self-contained — student links live in dedicated membership tables, so the core
`students` table is untouched. A student belongs to at most one House
(unique student per school) but may join many Clubs and Sports.
"""

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import Base


# --- Houses -------------------------------------------------------------------
class House(Base):
    __tablename__ = "houses"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String(100), nullable=False)  # e.g. "Red House"
    color = Column(String(20))  # hex or name, for UI
    motto = Column(String(255))
    house_master = Column(String(150))  # staff/teacher name (free text)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class HousePoint(Base):
    """Append-only points ledger; a house's total is the SUM of its entries."""

    __tablename__ = "house_points"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    house_id = Column(
        UUID(as_uuid=True), ForeignKey("houses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    points = Column(Integer, nullable=False)  # may be negative (deduction)
    reason = Column(String(255))
    awarded_by = Column(UUID(as_uuid=True))  # user id
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class HouseMembership(Base):
    __tablename__ = "house_memberships"
    __table_args__ = (
        UniqueConstraint("school_id", "student_id", name="uq_house_membership_student"),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    house_id = Column(
        UUID(as_uuid=True), ForeignKey("houses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


# --- Clubs --------------------------------------------------------------------
class Club(Base):
    __tablename__ = "clubs"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String(120), nullable=False)  # e.g. "Robotics Club"
    category = Column(String(60))  # Academic / Arts / Technology / Service ...
    description = Column(Text)
    in_charge = Column(String(150))  # staff/teacher name (free text)
    meeting_day = Column(String(20))  # e.g. "Friday"
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class ClubMembership(Base):
    __tablename__ = "club_memberships"
    __table_args__ = (UniqueConstraint("club_id", "student_id", name="uq_club_membership"),)
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    club_id = Column(
        UUID(as_uuid=True), ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(40), default="Member")  # Member / Lead / President
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


# --- Sports -------------------------------------------------------------------
class Sport(Base):
    __tablename__ = "sports"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String(120), nullable=False)  # e.g. "Football"
    category = Column(String(40))  # Team / Individual
    coach = Column(String(150))  # coach name (free text)
    season = Column(String(40))  # e.g. "Winter"
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())


class SportMembership(Base):
    __tablename__ = "sport_memberships"
    __table_args__ = (UniqueConstraint("sport_id", "student_id", name="uq_sport_membership"),)
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    school_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    sport_id = Column(
        UUID(as_uuid=True), ForeignKey("sports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    team = Column(String(60))  # e.g. "U-16 A"
    position = Column(String(60))  # e.g. "Goalkeeper"
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())

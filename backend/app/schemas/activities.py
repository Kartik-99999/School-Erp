from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# --- shared -------------------------------------------------------------------
class MemberResponse(BaseModel):
    """A student shown within a house/club/sport roster."""

    membership_id: UUID
    student_id: UUID
    name: str
    admission_number: Optional[str] = None
    extra: Optional[str] = None  # role (club), position/team (sport)


# --- Houses -------------------------------------------------------------------
class HouseBase(BaseModel):
    name: str
    color: Optional[str] = None
    motto: Optional[str] = None
    house_master: Optional[str] = None


class HouseCreate(HouseBase):
    pass


class HouseUpdate(HouseBase):
    pass


class HouseResponse(HouseBase):
    id: UUID
    points: int = 0
    member_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class HousePointCreate(BaseModel):
    points: int  # may be negative
    reason: Optional[str] = None


# --- Clubs --------------------------------------------------------------------
class ClubBase(BaseModel):
    name: str
    category: Optional[str] = None
    description: Optional[str] = None
    in_charge: Optional[str] = None
    meeting_day: Optional[str] = None


class ClubCreate(ClubBase):
    pass


class ClubUpdate(ClubBase):
    pass


class ClubResponse(ClubBase):
    id: UUID
    member_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class ClubMemberCreate(BaseModel):
    student_id: UUID
    role: Optional[str] = "Member"


# --- Sports -------------------------------------------------------------------
class SportBase(BaseModel):
    name: str
    category: Optional[str] = None
    coach: Optional[str] = None
    season: Optional[str] = None
    description: Optional[str] = None


class SportCreate(SportBase):
    pass


class SportUpdate(SportBase):
    pass


class SportResponse(SportBase):
    id: UUID
    member_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class SportMemberCreate(BaseModel):
    student_id: UUID
    team: Optional[str] = None
    position: Optional[str] = None


# --- membership add (houses) --------------------------------------------------
class HouseMemberCreate(BaseModel):
    student_id: UUID


class RosterResponse(BaseModel):
    members: List[MemberResponse]

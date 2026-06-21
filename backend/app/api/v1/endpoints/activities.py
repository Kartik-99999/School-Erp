"""Co-curricular endpoints: Houses (+ points ledger), Clubs, and Sports.

Mounted at /activities. Reads require an authenticated tenant user; writes are
restricted to School Admin / Super Admin. Everything is scoped to the caller's
school_id.
"""

import io
from typing import Any, List
from uuid import UUID

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models.activities import (
    Club,
    ClubMembership,
    House,
    HouseMembership,
    HousePoint,
    Sport,
    SportMembership,
)
from app.api.v1.endpoints.students import _authorize_student_access
from app.models.students import Parent, Student
from app.schemas.activities import (
    ClubCreate,
    ClubMemberCreate,
    ClubResponse,
    ClubUpdate,
    HouseCreate,
    HouseMemberCreate,
    HousePointCreate,
    HouseResponse,
    HouseUpdate,
    MemberResponse,
    SportCreate,
    SportMemberCreate,
    SportResponse,
    SportUpdate,
)
from app.schemas.base import APIResponse

router = APIRouter()

_admin = deps.require_roles(["School Admin", "Super Admin"])


async def _student_in_school(db: AsyncSession, student_id: UUID, school_uuid: UUID) -> Student:
    student = (
        (
            await db.execute(
                select(Student).filter(Student.id == student_id, Student.school_id == school_uuid)
            )
        )
        .scalars()
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in this school")
    return student


def _member(membership_id, student: Student, extra=None) -> MemberResponse:
    return MemberResponse(
        membership_id=membership_id,
        student_id=student.id,
        name=f"{student.first_name} {student.last_name}".strip(),
        admission_number=student.admission_number,
        extra=extra,
    )


async def _student_activities(db: AsyncSession, school_uuid: UUID, student_id: UUID) -> dict:
    """The house (with points), clubs, and sports a student belongs to."""
    house = None
    hm = (
        await db.execute(
            select(HouseMembership, House)
            .join(House, House.id == HouseMembership.house_id)
            .filter(
                HouseMembership.student_id == student_id,
                HouseMembership.school_id == school_uuid,
            )
        )
    ).first()
    if hm:
        _, h = hm
        pts = (
            await db.execute(
                select(func.coalesce(func.sum(HousePoint.points), 0)).filter(
                    HousePoint.house_id == h.id
                )
            )
        ).scalar_one()
        house = {"id": str(h.id), "name": h.name, "color": h.color, "points": int(pts)}

    crows = (
        await db.execute(
            select(ClubMembership, Club)
            .join(Club, Club.id == ClubMembership.club_id)
            .filter(
                ClubMembership.student_id == student_id, ClubMembership.school_id == school_uuid
            )
        )
    ).all()
    clubs = [{"id": str(c.id), "name": c.name, "role": m.role} for m, c in crows]

    srows = (
        await db.execute(
            select(SportMembership, Sport)
            .join(Sport, Sport.id == SportMembership.sport_id)
            .filter(
                SportMembership.student_id == student_id,
                SportMembership.school_id == school_uuid,
            )
        )
    ).all()
    sports = [
        {"id": str(s.id), "name": s.name, "team": m.team, "position": m.position} for m, s in srows
    ]
    return {"house": house, "clubs": clubs, "sports": sports}


@router.get("/student/{student_id}", response_model=APIResponse[dict])
async def student_activities(
    student_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    student = (
        (
            await db.execute(
                select(Student).filter(
                    Student.id == student_id, Student.school_id == UUID(school_id)
                )
            )
        )
        .scalars()
        .first()
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    await _authorize_student_access(db, token_data, school_id, student)
    return APIResponse(
        success=True, data=await _student_activities(db, UUID(school_id), student.id)
    )


@router.get("/me", response_model=APIResponse[dict])
async def my_activities(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    student = (
        (await db.execute(select(Student).filter(Student.user_id == UUID(token_data.user_id))))
        .scalars()
        .first()
    )
    if not student:
        return APIResponse(success=True, data={"house": None, "clubs": [], "sports": []})
    return APIResponse(
        success=True, data=await _student_activities(db, UUID(school_id), student.id)
    )


@router.get("/my-children", response_model=APIResponse[List[dict]])
async def my_children_activities(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    """Parent view: each of the caller's children with their house/clubs/sports."""
    school_uuid = UUID(school_id)
    parent = (
        (await db.execute(select(Parent).filter(Parent.user_id == UUID(token_data.user_id))))
        .scalars()
        .first()
    )
    if not parent:
        return APIResponse(success=True, data=[])
    children = (
        (
            await db.execute(
                select(Student).filter(
                    Student.parent_id == parent.id, Student.school_id == school_uuid
                )
            )
        )
        .scalars()
        .all()
    )
    out = []
    for ch in children:
        out.append(
            {
                "student": {
                    "id": str(ch.id),
                    "name": f"{ch.first_name} {ch.last_name}".strip(),
                    "admission_number": ch.admission_number,
                },
                "activities": await _student_activities(db, school_uuid, ch.id),
            }
        )
    return APIResponse(success=True, data=out)


# =============================================================================
# HOUSES
# =============================================================================
@router.get("/houses", response_model=APIResponse[List[HouseResponse]])
async def list_houses(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    school_uuid = UUID(school_id)
    houses = (
        (
            await db.execute(
                select(House).filter(House.school_id == school_uuid).order_by(House.name)
            )
        )
        .scalars()
        .all()
    )
    # Aggregate points + member counts in one query each (no per-house fan-out).
    points = dict(
        (
            await db.execute(
                select(HousePoint.house_id, func.coalesce(func.sum(HousePoint.points), 0))
                .filter(HousePoint.school_id == school_uuid)
                .group_by(HousePoint.house_id)
            )
        ).all()
    )
    counts = dict(
        (
            await db.execute(
                select(HouseMembership.house_id, func.count())
                .filter(HouseMembership.school_id == school_uuid)
                .group_by(HouseMembership.house_id)
            )
        ).all()
    )
    data = []
    for h in houses:
        resp = HouseResponse.model_validate(h)
        resp.points = int(points.get(h.id, 0))
        resp.member_count = int(counts.get(h.id, 0))
        data.append(resp)
    return APIResponse(success=True, data=data)


@router.post("/houses", response_model=APIResponse[HouseResponse], dependencies=[Depends(_admin)])
async def create_house(
    payload: HouseCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    house = House(school_id=UUID(school_id), **payload.model_dump())
    db.add(house)
    await db.commit()
    await db.refresh(house)
    return APIResponse(
        success=True, data=HouseResponse.model_validate(house), message="House created"
    )


@router.put(
    "/houses/{id}", response_model=APIResponse[HouseResponse], dependencies=[Depends(_admin)]
)
async def update_house(
    id: UUID,
    payload: HouseUpdate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    house = (
        (await db.execute(select(House).filter(House.id == id, House.school_id == UUID(school_id))))
        .scalars()
        .first()
    )
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    for k, v in payload.model_dump().items():
        setattr(house, k, v)
    await db.commit()
    await db.refresh(house)
    return APIResponse(
        success=True, data=HouseResponse.model_validate(house), message="House updated"
    )


@router.delete("/houses/{id}", response_model=APIResponse, dependencies=[Depends(_admin)])
async def delete_house(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    house = (
        (await db.execute(select(House).filter(House.id == id, House.school_id == UUID(school_id))))
        .scalars()
        .first()
    )
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    await db.delete(house)
    await db.commit()
    return APIResponse(success=True, message="House deleted")


@router.post(
    "/houses/{id}/points", response_model=APIResponse[HouseResponse], dependencies=[Depends(_admin)]
)
async def award_house_points(
    id: UUID,
    payload: HousePointCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
    token_data: deps.TokenData = Depends(deps.get_current_user_token_data),
) -> Any:
    school_uuid = UUID(school_id)
    house = (
        (await db.execute(select(House).filter(House.id == id, House.school_id == school_uuid)))
        .scalars()
        .first()
    )
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    db.add(
        HousePoint(
            school_id=school_uuid,
            house_id=id,
            points=payload.points,
            reason=payload.reason,
            awarded_by=UUID(token_data.user_id),
        )
    )
    await db.commit()
    total = (
        await db.execute(
            select(func.coalesce(func.sum(HousePoint.points), 0)).filter(HousePoint.house_id == id)
        )
    ).scalar_one()
    resp = HouseResponse.model_validate(house)
    resp.points = int(total)
    return APIResponse(success=True, data=resp, message="Points updated")


@router.get("/houses/{id}/members", response_model=APIResponse[List[MemberResponse]])
async def house_members(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    rows = (
        await db.execute(
            select(HouseMembership, Student)
            .join(Student, Student.id == HouseMembership.student_id)
            .filter(HouseMembership.house_id == id, HouseMembership.school_id == UUID(school_id))
            .order_by(Student.first_name)
        )
    ).all()
    return APIResponse(success=True, data=[_member(m.id, s) for m, s in rows])


@router.post("/houses/{id}/members", response_model=APIResponse, dependencies=[Depends(_admin)])
async def assign_house_member(
    id: UUID,
    payload: HouseMemberCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    school_uuid = UUID(school_id)
    house = (
        (await db.execute(select(House).filter(House.id == id, House.school_id == school_uuid)))
        .scalars()
        .first()
    )
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    await _student_in_school(db, payload.student_id, school_uuid)

    # One house per student: drop any existing membership, then assign.
    existing = (
        (
            await db.execute(
                select(HouseMembership).filter(
                    HouseMembership.school_id == school_uuid,
                    HouseMembership.student_id == payload.student_id,
                )
            )
        )
        .scalars()
        .first()
    )
    if existing:
        existing.house_id = id
    else:
        db.add(HouseMembership(school_id=school_uuid, house_id=id, student_id=payload.student_id))
    await db.commit()
    return APIResponse(success=True, message="Student assigned to house")


@router.delete(
    "/houses/{id}/members/{student_id}", response_model=APIResponse, dependencies=[Depends(_admin)]
)
async def remove_house_member(
    id: UUID,
    student_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    row = (
        (
            await db.execute(
                select(HouseMembership).filter(
                    HouseMembership.house_id == id,
                    HouseMembership.student_id == student_id,
                    HouseMembership.school_id == UUID(school_id),
                )
            )
        )
        .scalars()
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Membership not found")
    await db.delete(row)
    await db.commit()
    return APIResponse(success=True, message="Student removed from house")


# =============================================================================
# CLUBS
# =============================================================================
@router.get("/clubs", response_model=APIResponse[List[ClubResponse]])
async def list_clubs(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    school_uuid = UUID(school_id)
    clubs = (
        (await db.execute(select(Club).filter(Club.school_id == school_uuid).order_by(Club.name)))
        .scalars()
        .all()
    )
    counts = dict(
        (
            await db.execute(
                select(ClubMembership.club_id, func.count())
                .filter(ClubMembership.school_id == school_uuid)
                .group_by(ClubMembership.club_id)
            )
        ).all()
    )
    data = []
    for c in clubs:
        resp = ClubResponse.model_validate(c)
        resp.member_count = int(counts.get(c.id, 0))
        data.append(resp)
    return APIResponse(success=True, data=data)


@router.post("/clubs", response_model=APIResponse[ClubResponse], dependencies=[Depends(_admin)])
async def create_club(
    payload: ClubCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    club = Club(school_id=UUID(school_id), **payload.model_dump())
    db.add(club)
    await db.commit()
    await db.refresh(club)
    return APIResponse(success=True, data=ClubResponse.model_validate(club), message="Club created")


@router.put("/clubs/{id}", response_model=APIResponse[ClubResponse], dependencies=[Depends(_admin)])
async def update_club(
    id: UUID,
    payload: ClubUpdate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    club = (
        (await db.execute(select(Club).filter(Club.id == id, Club.school_id == UUID(school_id))))
        .scalars()
        .first()
    )
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    for k, v in payload.model_dump().items():
        setattr(club, k, v)
    await db.commit()
    await db.refresh(club)
    return APIResponse(success=True, data=ClubResponse.model_validate(club), message="Club updated")


@router.delete("/clubs/{id}", response_model=APIResponse, dependencies=[Depends(_admin)])
async def delete_club(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    club = (
        (await db.execute(select(Club).filter(Club.id == id, Club.school_id == UUID(school_id))))
        .scalars()
        .first()
    )
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    await db.delete(club)
    await db.commit()
    return APIResponse(success=True, message="Club deleted")


@router.get("/clubs/{id}/members", response_model=APIResponse[List[MemberResponse]])
async def club_members(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    rows = (
        await db.execute(
            select(ClubMembership, Student)
            .join(Student, Student.id == ClubMembership.student_id)
            .filter(ClubMembership.club_id == id, ClubMembership.school_id == UUID(school_id))
            .order_by(Student.first_name)
        )
    ).all()
    return APIResponse(success=True, data=[_member(m.id, s, m.role) for m, s in rows])


@router.post("/clubs/{id}/members", response_model=APIResponse, dependencies=[Depends(_admin)])
async def add_club_member(
    id: UUID,
    payload: ClubMemberCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    school_uuid = UUID(school_id)
    club = (
        (await db.execute(select(Club).filter(Club.id == id, Club.school_id == school_uuid)))
        .scalars()
        .first()
    )
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    await _student_in_school(db, payload.student_id, school_uuid)
    dup = (
        (
            await db.execute(
                select(ClubMembership).filter(
                    ClubMembership.club_id == id, ClubMembership.student_id == payload.student_id
                )
            )
        )
        .scalars()
        .first()
    )
    if dup:
        raise HTTPException(status_code=409, detail="Student is already in this club")
    db.add(
        ClubMembership(
            school_id=school_uuid,
            club_id=id,
            student_id=payload.student_id,
            role=payload.role or "Member",
        )
    )
    await db.commit()
    return APIResponse(success=True, message="Student added to club")


@router.delete(
    "/clubs/{id}/members/{membership_id}",
    response_model=APIResponse,
    dependencies=[Depends(_admin)],
)
async def remove_club_member(
    id: UUID,
    membership_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    row = (
        (
            await db.execute(
                select(ClubMembership).filter(
                    ClubMembership.id == membership_id,
                    ClubMembership.club_id == id,
                    ClubMembership.school_id == UUID(school_id),
                )
            )
        )
        .scalars()
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Membership not found")
    await db.delete(row)
    await db.commit()
    return APIResponse(success=True, message="Student removed from club")


# =============================================================================
# SPORTS
# =============================================================================
@router.get("/sports", response_model=APIResponse[List[SportResponse]])
async def list_sports(
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    school_uuid = UUID(school_id)
    sports = (
        (
            await db.execute(
                select(Sport).filter(Sport.school_id == school_uuid).order_by(Sport.name)
            )
        )
        .scalars()
        .all()
    )
    counts = dict(
        (
            await db.execute(
                select(SportMembership.sport_id, func.count())
                .filter(SportMembership.school_id == school_uuid)
                .group_by(SportMembership.sport_id)
            )
        ).all()
    )
    data = []
    for s in sports:
        resp = SportResponse.model_validate(s)
        resp.member_count = int(counts.get(s.id, 0))
        data.append(resp)
    return APIResponse(success=True, data=data)


@router.post("/sports", response_model=APIResponse[SportResponse], dependencies=[Depends(_admin)])
async def create_sport(
    payload: SportCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    sport = Sport(school_id=UUID(school_id), **payload.model_dump())
    db.add(sport)
    await db.commit()
    await db.refresh(sport)
    return APIResponse(
        success=True, data=SportResponse.model_validate(sport), message="Sport created"
    )


@router.put(
    "/sports/{id}", response_model=APIResponse[SportResponse], dependencies=[Depends(_admin)]
)
async def update_sport(
    id: UUID,
    payload: SportUpdate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    sport = (
        (await db.execute(select(Sport).filter(Sport.id == id, Sport.school_id == UUID(school_id))))
        .scalars()
        .first()
    )
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found")
    for k, v in payload.model_dump().items():
        setattr(sport, k, v)
    await db.commit()
    await db.refresh(sport)
    return APIResponse(
        success=True, data=SportResponse.model_validate(sport), message="Sport updated"
    )


@router.delete("/sports/{id}", response_model=APIResponse, dependencies=[Depends(_admin)])
async def delete_sport(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    sport = (
        (await db.execute(select(Sport).filter(Sport.id == id, Sport.school_id == UUID(school_id))))
        .scalars()
        .first()
    )
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found")
    await db.delete(sport)
    await db.commit()
    return APIResponse(success=True, message="Sport deleted")


@router.get("/sports/{id}/members", response_model=APIResponse[List[MemberResponse]])
async def sport_members(
    id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    rows = (
        await db.execute(
            select(SportMembership, Student)
            .join(Student, Student.id == SportMembership.student_id)
            .filter(SportMembership.sport_id == id, SportMembership.school_id == UUID(school_id))
            .order_by(Student.first_name)
        )
    ).all()
    return APIResponse(
        success=True,
        data=[
            _member(m.id, s, " · ".join(filter(None, [m.team, m.position])) or None)
            for m, s in rows
        ],
    )


@router.post("/sports/{id}/members", response_model=APIResponse, dependencies=[Depends(_admin)])
async def add_sport_member(
    id: UUID,
    payload: SportMemberCreate,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    school_uuid = UUID(school_id)
    sport = (
        (await db.execute(select(Sport).filter(Sport.id == id, Sport.school_id == school_uuid)))
        .scalars()
        .first()
    )
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found")
    await _student_in_school(db, payload.student_id, school_uuid)
    dup = (
        (
            await db.execute(
                select(SportMembership).filter(
                    SportMembership.sport_id == id,
                    SportMembership.student_id == payload.student_id,
                )
            )
        )
        .scalars()
        .first()
    )
    if dup:
        raise HTTPException(status_code=409, detail="Student is already in this sport")
    db.add(
        SportMembership(
            school_id=school_uuid,
            sport_id=id,
            student_id=payload.student_id,
            team=payload.team,
            position=payload.position,
        )
    )
    await db.commit()
    return APIResponse(success=True, message="Student added to sport")


@router.delete(
    "/sports/{id}/members/{membership_id}",
    response_model=APIResponse,
    dependencies=[Depends(_admin)],
)
async def remove_sport_member(
    id: UUID,
    membership_id: UUID,
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    row = (
        (
            await db.execute(
                select(SportMembership).filter(
                    SportMembership.id == membership_id,
                    SportMembership.sport_id == id,
                    SportMembership.school_id == UUID(school_id),
                )
            )
        )
        .scalars()
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Membership not found")
    await db.delete(row)
    await db.commit()
    return APIResponse(success=True, message="Student removed from sport")


# =============================================================================
# BULK MEMBER IMPORT (CSV with an `admission_number` column)
# =============================================================================
def _parse_member_csv(content: bytes):
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV format")
    if "admission_number" not in df.columns:
        raise HTTPException(status_code=400, detail="CSV must include an 'admission_number' column")
    return df


def _opt(row, key):
    v = row.get(key)
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    return s or None


async def _students_by_admission(db, school_uuid, adm_numbers):
    if not adm_numbers:
        return {}
    rows = (
        (
            await db.execute(
                select(Student).filter(
                    Student.school_id == school_uuid,
                    Student.admission_number.in_(adm_numbers),
                )
            )
        )
        .scalars()
        .all()
    )
    return {s.admission_number: s for s in rows}


@router.post(
    "/houses/{id}/members/bulk", response_model=APIResponse[dict], dependencies=[Depends(_admin)]
)
async def bulk_add_house_members(
    id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    school_uuid = UUID(school_id)
    house = (
        (await db.execute(select(House).filter(House.id == id, House.school_id == school_uuid)))
        .scalars()
        .first()
    )
    if not house:
        raise HTTPException(status_code=404, detail="House not found")

    df = _parse_member_csv(await file.read())
    adms = [str(a).strip() for a in df["admission_number"].dropna().tolist() if str(a).strip()]
    students = await _students_by_admission(db, school_uuid, adms)
    existing = {
        hm.student_id: hm
        for hm in (
            await db.execute(
                select(HouseMembership).filter(
                    HouseMembership.school_id == school_uuid,
                    HouseMembership.student_id.in_([s.id for s in students.values()]),
                )
            )
        )
        .scalars()
        .all()
    }
    added, moved, errors = 0, 0, []
    seen = set()
    for adm in adms:
        s = students.get(adm)
        if not s:
            errors.append({"admission_number": adm, "error": "student not found"})
            continue
        if s.id in seen:
            continue
        seen.add(s.id)
        ex = existing.get(s.id)
        if ex:
            if ex.house_id != id:
                ex.house_id = id
                moved += 1
        else:
            db.add(HouseMembership(school_id=school_uuid, house_id=id, student_id=s.id))
            added += 1
    await db.commit()
    return APIResponse(
        success=True,
        data={"added": added, "moved": moved, "errors": errors},
        message=f"{added} added, {moved} moved, {len(errors)} not found",
    )


@router.post(
    "/clubs/{id}/members/bulk", response_model=APIResponse[dict], dependencies=[Depends(_admin)]
)
async def bulk_add_club_members(
    id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    school_uuid = UUID(school_id)
    club = (
        (await db.execute(select(Club).filter(Club.id == id, Club.school_id == school_uuid)))
        .scalars()
        .first()
    )
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    df = _parse_member_csv(await file.read())
    adms = [str(r.get("admission_number")).strip() for _, r in df.iterrows()]
    students = await _students_by_admission(db, school_uuid, [a for a in adms if a])
    existing = {
        cm.student_id
        for cm in (await db.execute(select(ClubMembership).filter(ClubMembership.club_id == id)))
        .scalars()
        .all()
    }
    added, skipped, errors = 0, 0, []
    for _, row in df.iterrows():
        adm = str(row.get("admission_number")).strip()
        s = students.get(adm)
        if not s:
            errors.append({"admission_number": adm, "error": "student not found"})
            continue
        if s.id in existing:
            skipped += 1
            continue
        db.add(
            ClubMembership(
                school_id=school_uuid,
                club_id=id,
                student_id=s.id,
                role=_opt(row, "role") or "Member",
            )
        )
        existing.add(s.id)
        added += 1
    await db.commit()
    return APIResponse(
        success=True,
        data={"added": added, "skipped": skipped, "errors": errors},
        message=f"{added} added, {skipped} already members, {len(errors)} not found",
    )


@router.post(
    "/sports/{id}/members/bulk", response_model=APIResponse[dict], dependencies=[Depends(_admin)]
)
async def bulk_add_sport_members(
    id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(deps.set_tenant_context),
    school_id: str = Depends(deps.get_current_tenant_id),
) -> Any:
    school_uuid = UUID(school_id)
    sport = (
        (await db.execute(select(Sport).filter(Sport.id == id, Sport.school_id == school_uuid)))
        .scalars()
        .first()
    )
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found")

    df = _parse_member_csv(await file.read())
    adms = [str(r.get("admission_number")).strip() for _, r in df.iterrows()]
    students = await _students_by_admission(db, school_uuid, [a for a in adms if a])
    existing = {
        sm.student_id
        for sm in (await db.execute(select(SportMembership).filter(SportMembership.sport_id == id)))
        .scalars()
        .all()
    }
    added, skipped, errors = 0, 0, []
    for _, row in df.iterrows():
        adm = str(row.get("admission_number")).strip()
        s = students.get(adm)
        if not s:
            errors.append({"admission_number": adm, "error": "student not found"})
            continue
        if s.id in existing:
            skipped += 1
            continue
        db.add(
            SportMembership(
                school_id=school_uuid,
                sport_id=id,
                student_id=s.id,
                team=_opt(row, "team"),
                position=_opt(row, "position"),
            )
        )
        existing.add(s.id)
        added += 1
    await db.commit()
    return APIResponse(
        success=True,
        data={"added": added, "skipped": skipped, "errors": errors},
        message=f"{added} added, {skipped} already members, {len(errors)} not found",
    )

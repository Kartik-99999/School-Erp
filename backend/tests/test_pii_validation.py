"""Aadhaar (Verhoeff) + APAAR/PEN validation — pure logic and the schema wiring.

All no-DB, so they always run. Also guards the key design choice: validation lives on
INPUT schemas only, so response schemas keep reading legacy/imported rows (and mask them).
"""

import uuid
from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas.students import ParentCreate, StudentCreate, StudentResponse, StudentUpdate
from app.utils import validators as v


def _valid_aadhaar(prefix: str = "23412341234") -> str:
    """An 11-digit prefix (leading 2–9) plus its computed Verhoeff check digit."""
    return prefix + v.verhoeff_check_digit(prefix)


# --- Verhoeff + predicates --------------------------------------------------------
def test_verhoeff_roundtrip_and_tamper_detection():
    full = _valid_aadhaar()
    assert v.verhoeff_validate(full) is True
    # a wrong check digit fails
    assert v.verhoeff_validate(full[:-1] + str((int(full[-1]) + 1) % 10)) is False
    # an adjacent transposition (first two digits differ) is caught
    assert v.verhoeff_validate(full[1] + full[0] + full[2:]) is False


def test_is_valid_aadhaar():
    full = _valid_aadhaar()
    assert v.is_valid_aadhaar(full) is True
    assert v.is_valid_aadhaar(f"{full[:4]} {full[4:8]} {full[8:]}") is True  # spacing tolerated
    assert v.is_valid_aadhaar("123456789012") is False  # leading 1 + bad checksum
    assert v.is_valid_aadhaar("0" + full[1:]) is False  # leading 0 not issued
    assert v.is_valid_aadhaar(full[:-1]) is False  # 11 digits
    assert v.is_valid_aadhaar(full + "1") is False  # 13 digits
    assert v.is_valid_aadhaar("23412341234x") is False  # non-digit
    assert v.is_valid_aadhaar(full[:-1] + str((int(full[-1]) + 1) % 10)) is False  # bad checksum


def test_is_valid_apaar_and_pen():
    assert v.is_valid_apaar("123456789012") is True
    assert v.is_valid_apaar("12345") is False
    assert v.is_valid_apaar("12345678901a") is False
    assert v.is_valid_pen("STU12345") is True
    assert v.is_valid_pen("a" * 20) is True
    assert v.is_valid_pen("a" * 21) is False  # too long
    assert v.is_valid_pen("has space") is False
    assert v.is_valid_pen("sym!bol") is False


def test_clean_helpers():
    full = _valid_aadhaar()
    assert v.clean_aadhaar(None) is None
    assert v.clean_aadhaar("   ") is None
    assert v.clean_apaar("") is None
    assert v.clean_pen(None) is None
    assert v.clean_aadhaar(f"{full[:4]} {full[4:8]} {full[8:]}") == full  # normalized
    with pytest.raises(ValueError):
        v.clean_aadhaar("123456789012")
    with pytest.raises(ValueError):
        v.clean_apaar("123")
    with pytest.raises(ValueError):
        v.clean_pen("bad pen!")


# --- schema wiring ----------------------------------------------------------------
def _student(**kw) -> StudentCreate:
    base = dict(first_name="A", last_name="B", dob=date(2010, 1, 1), parent={})
    base.update(kw)
    return StudentCreate(**base)


def test_student_create_validates_and_normalizes():
    full = _valid_aadhaar()
    assert _student(aadhaar_no=full).aadhaar_no == full
    assert _student(aadhaar_no=f"{full[:4]} {full[4:8]} {full[8:]}").aadhaar_no == full
    assert _student(apaar_id="123456789012").apaar_id == "123456789012"
    assert _student().aadhaar_no is None  # omitted
    assert _student(aadhaar_no="").aadhaar_no is None  # blank -> None
    for bad in ["123456789012", "23412341234", "notanumber"]:
        with pytest.raises(ValidationError):
            _student(aadhaar_no=bad)
    with pytest.raises(ValidationError):
        _student(apaar_id="123")  # not 12 digits


def test_parent_create_validates_aadhaar():
    with pytest.raises(ValidationError):
        _student(parent={"father_aadhaar": "111122223333"})
    full = _valid_aadhaar()
    assert _student(parent={"father_aadhaar": full}).parent.father_aadhaar == full
    # ParentCreate directly
    assert ParentCreate(mother_aadhaar=full).mother_aadhaar == full


def test_student_update_validates():
    full = _valid_aadhaar()
    assert StudentUpdate(aadhaar_no=full).aadhaar_no == full
    assert StudentUpdate().aadhaar_no is None
    with pytest.raises(ValidationError):
        StudentUpdate(aadhaar_no="111111111111")


def test_response_schema_not_validated_reads_legacy_and_masks():
    # The crucial guard: responses must read invalid/legacy rows back and only mask.
    sr = StudentResponse.model_validate(
        {
            "first_name": "A",
            "last_name": "B",
            "dob": date(2010, 1, 1),
            "aadhaar_no": "123456789012",  # not Verhoeff-valid (legacy/imported)
            "apaar_id": "NOTVALID",
            "id": uuid.uuid4(),
            "school_id": uuid.uuid4(),
            "parent_id": uuid.uuid4(),
        }
    )
    assert sr.model_dump()["aadhaar_no"] == "••••••••9012"

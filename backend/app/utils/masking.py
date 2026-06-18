"""Masking helpers for sensitive government identifiers (Aadhaar / APAAR / PEN).

Stored values are never altered; identifiers are masked only when serialized to API
responses (see schemas.students). `drop_masked_pii` lets update endpoints ignore a
masked value that an edit form round-tripped back, so the real ID is never clobbered.
"""

from typing import Optional

MASK_CHAR = "•"  # bullet

# Response/update field names that hold government IDs.
PII_FIELDS = frozenset(
    {
        "aadhaar_no",
        "apaar_id",
        "pen_number",
        "father_aadhaar",
        "mother_aadhaar",
        "guardian_aadhaar",
    }
)


def mask_pii(value: Optional[str]) -> Optional[str]:
    """Reveal only the last 4 characters: '123456789012' -> '________9012'."""
    if not value:
        return value
    s = str(value).strip()
    if len(s) <= 4:
        return MASK_CHAR * len(s)
    return MASK_CHAR * (len(s) - 4) + s[-4:]


def is_masked(value) -> bool:
    """True if the value looks like a masked display value (contains the mask char)."""
    return isinstance(value, str) and MASK_CHAR in value


def drop_masked_pii(data: dict) -> dict:
    """Drop PII keys whose value is a round-tripped mask, so a masked value submitted
    from an edit form can never overwrite the stored identifier."""
    return {k: v for k, v in data.items() if not (k in PII_FIELDS and is_masked(v))}

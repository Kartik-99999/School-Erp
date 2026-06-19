"""Validators for Indian student government identifiers (Aadhaar / APAAR / PEN).

Pure functions (no pydantic) so they unit-test trivially. The schema layer
(app/schemas/students.py) wraps the ``clean_*`` helpers as pydantic ``BeforeValidator``s
on the *input* schemas only — response schemas are intentionally left unvalidated so
legacy/imported rows always read back (and are masked on output).
"""

import re
from urllib.parse import urlparse

# --- Verhoeff algorithm (the trailing check digit on a 12-digit Aadhaar) ----------
# Dihedral group D5 multiplication table.
_D = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    (1, 2, 3, 4, 0, 6, 7, 8, 9, 5),
    (2, 3, 4, 0, 1, 7, 8, 9, 5, 6),
    (3, 4, 0, 1, 2, 8, 9, 5, 6, 7),
    (4, 0, 1, 2, 3, 9, 5, 6, 7, 8),
    (5, 9, 8, 7, 6, 0, 4, 3, 2, 1),
    (6, 5, 9, 8, 7, 1, 0, 4, 3, 2),
    (7, 6, 5, 9, 8, 2, 1, 0, 4, 3),
    (8, 7, 6, 5, 9, 3, 2, 1, 0, 4),
    (9, 8, 7, 6, 5, 4, 3, 2, 1, 0),
)
# Permutation table.
_P = (
    (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    (1, 5, 7, 6, 2, 8, 3, 0, 9, 4),
    (5, 8, 0, 3, 7, 9, 6, 1, 4, 2),
    (8, 9, 1, 6, 0, 4, 3, 5, 2, 7),
    (9, 4, 5, 3, 1, 2, 6, 8, 7, 0),
    (4, 2, 8, 6, 5, 7, 3, 9, 0, 1),
    (2, 7, 9, 3, 8, 0, 6, 4, 1, 5),
    (7, 0, 4, 6, 9, 1, 3, 2, 5, 8),
)
# Multiplicative inverse table.
_INV = (0, 4, 3, 2, 1, 5, 6, 7, 8, 9)


def verhoeff_validate(number: str) -> bool:
    """True if ``number`` (digit string incl. its trailing check digit) is Verhoeff-valid."""
    c = 0
    for i, ch in enumerate(reversed(number)):
        c = _D[c][_P[i % 8][int(ch)]]
    return c == 0


def verhoeff_check_digit(payload: str) -> str:
    """Compute the Verhoeff check digit for ``payload`` (digits WITHOUT a check digit)."""
    c = 0
    for i, ch in enumerate(reversed(payload)):
        c = _D[c][_P[(i + 1) % 8][int(ch)]]
    return str(_INV[c])


def _digits_only(value: str) -> str:
    """Drop spaces and hyphens (Aadhaar is often written '1234 5678 9012')."""
    return re.sub(r"[\s-]", "", value.strip())


# --- predicates -------------------------------------------------------------------
def is_valid_aadhaar(value: str) -> bool:
    """12 digits, first digit 2–9 (UIDAI never issues a 0/1 leading digit), and a
    valid Verhoeff checksum."""
    s = _digits_only(value)
    return len(s) == 12 and s.isdigit() and s[0] not in "01" and verhoeff_validate(s)


def is_valid_apaar(value: str) -> bool:
    """APAAR / 'One Nation One Student ID' is a 12-digit number."""
    s = _digits_only(value)
    return len(s) == 12 and s.isdigit()


def is_valid_pen(value: str) -> bool:
    """PEN (Permanent Education Number) format varies by board/state, so this is a
    deliberately lenient sanity check: alphanumeric, up to 20 chars."""
    s = value.strip()
    return 0 < len(s) <= 20 and s.isalnum()


# --- input normalizers (raise ValueError -> HTTP 422); used by the schema layer ----
def clean_aadhaar(value):
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    if not is_valid_aadhaar(s):
        raise ValueError("Invalid Aadhaar number (expected 12 digits with a valid checksum).")
    return _digits_only(s)


def clean_apaar(value):
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    if not is_valid_apaar(s):
        raise ValueError("Invalid APAAR ID (expected a 12-digit number).")
    return _digits_only(s)


def clean_pen(value):
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    if not is_valid_pen(s):
        raise ValueError("Invalid PEN (use up to 20 letters/digits, no spaces).")
    return s


# --- bank-transfer / external-payment fee options ---------------------------------
_IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")


def is_valid_ifsc(value: str) -> bool:
    """RBI IFSC: 4 letters + '0' + 6 alphanumerics (e.g. HDFC0001234)."""
    return bool(_IFSC_RE.fullmatch(value.strip().upper()))


def is_valid_bank_account(value: str) -> bool:
    """Indian bank account numbers are 9–18 digits (spaces tolerated)."""
    s = re.sub(r"\s", "", value.strip())
    return s.isdigit() and 9 <= len(s) <= 18


def is_valid_http_url(value: str) -> bool:
    """A syntactically valid http(s) URL (scheme + host)."""
    try:
        u = urlparse(value.strip())
    except (ValueError, TypeError):
        return False
    return u.scheme in ("http", "https") and bool(u.netloc)


def clean_ifsc(value):
    if value is None:
        return None
    s = str(value).strip().upper()
    if not s:
        return None
    if not is_valid_ifsc(s):
        raise ValueError("Invalid IFSC code (format: ABCD0XXXXXX, e.g. HDFC0001234).")
    return s


def clean_bank_account(value):
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    digits = re.sub(r"\s", "", s)
    if not (digits.isdigit() and 9 <= len(digits) <= 18):
        raise ValueError("Invalid bank account number (9–18 digits).")
    return digits


def clean_external_url(value):
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    if not is_valid_http_url(s):
        raise ValueError("Invalid payment URL (must be a valid http:// or https:// link).")
    return s

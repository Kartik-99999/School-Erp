"""API-level guard tests (no DB). These lock in the security fixes from this
session: protected endpoints must reject anonymous callers, and signup/reset
input validation must run before any DB access."""

import uuid

# --- auth required (oauth2 bearer) -------------------------------------------


def test_audit_requires_auth(client):
    assert client.get("/api/v1/audit").status_code == 401


def test_students_paged_requires_auth(client):
    assert client.get("/api/v1/students/paged").status_code == 401


def test_receipt_pdf_requires_auth(client):
    # The cross-tenant IDOR fix added a role guard + tenant filter; anonymous = 401.
    r = client.get(f"/api/v1/fees/receipts/{uuid.uuid4()}/pdf")
    assert r.status_code == 401


def test_exam_results_require_auth(client):
    # Exams read surface was unscoped; it now requires auth.
    assert client.get(f"/api/v1/exams/{uuid.uuid4()}/results").status_code == 401


# --- signup validation (runs before any DB query) ----------------------------


def _signup_body(**over):
    body = {
        "school_name": "Springfield High",
        "subdomain": "springfield",
        "admin_name": "Jane Doe",
        "admin_email": "jane@springfield.edu",
        "admin_password": "secret1",
    }
    body.update(over)
    return body


def test_signup_rejects_short_subdomain(client):
    assert (
        client.post("/api/v1/schools/signup", json=_signup_body(subdomain="ab")).status_code == 400
    )


def test_signup_rejects_reserved_subdomain(client):
    assert (
        client.post("/api/v1/schools/signup", json=_signup_body(subdomain="www")).status_code == 400
    )


def test_signup_rejects_subdomain_with_illegal_chars(client):
    # underscores/spaces are never valid (and aren't normalized away).
    assert (
        client.post("/api/v1/schools/signup", json=_signup_body(subdomain="big_school")).status_code
        == 400
    )


def test_signup_rejects_bad_email(client):
    assert (
        client.post(
            "/api/v1/schools/signup", json=_signup_body(admin_email="not-an-email")
        ).status_code
        == 400
    )


def test_signup_rejects_short_password(client):
    assert (
        client.post("/api/v1/schools/signup", json=_signup_body(admin_password="123")).status_code
        == 400
    )


# --- password reset validation -----------------------------------------------


def test_reset_password_rejects_short_password(client):
    r = client.post(
        "/api/v1/auth/reset-password/confirm", json={"token": "x", "new_password": "123"}
    )
    assert r.status_code == 400

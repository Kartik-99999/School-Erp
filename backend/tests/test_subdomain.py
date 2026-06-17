import pytest

from app.api.v1.endpoints.schools import DEFAULT_ROLES, RESERVED_SUBDOMAINS, SUBDOMAIN_RE


@pytest.mark.parametrize("good", ["springfield", "st-marys", "abc123", "a1-b2-c3", "x" * 50])
def test_valid_subdomains(good):
    assert SUBDOMAIN_RE.match(good)


@pytest.mark.parametrize(
    "bad", ["ab", "x", "-abc", "abc-", "AbC", "a_b", "a..b", "a b", "x" * 51, ""]
)
def test_invalid_subdomains(bad):
    assert not SUBDOMAIN_RE.match(bad)


def test_reserved_subdomains_blocked():
    for r in ("www", "api", "admin", "app"):
        assert r in RESERVED_SUBDOMAINS


def test_default_roles_seeded():
    assert DEFAULT_ROLES[0] == "School Admin"  # admin role created first (gets the user)
    assert {"Teacher", "Student", "Parent", "Accountant"}.issubset(set(DEFAULT_ROLES))

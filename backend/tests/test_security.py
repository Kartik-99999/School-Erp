from app.core.security import generate_random_password, get_password_hash, verify_password


def test_password_hash_roundtrip():
    h = get_password_hash("s3cret!")
    assert h != "s3cret!"  # never stored in plaintext
    assert verify_password("s3cret!", h)
    assert not verify_password("wrong", h)


def test_password_hash_is_salted():
    # bcrypt salts, so two hashes of the same password differ.
    assert get_password_hash("same") != get_password_hash("same")


def test_generate_random_password_length_and_charset():
    pw = generate_random_password(16)
    assert len(pw) == 16
    assert pw.isalnum()


def test_generate_random_password_is_random():
    assert generate_random_password() != generate_random_password()

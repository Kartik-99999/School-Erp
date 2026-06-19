"""Generate an RSA keypair for RS256 JWT signing.

Usage:
    python generate_jwt_keys.py          # human-readable PEM + the ready-to-paste .env lines
    python generate_jwt_keys.py --env    # ONLY the JWT_* env lines (pipe to .env / $GITHUB_ENV)

Examples:
    python generate_jwt_keys.py --env >> .env          # dev/local
    python generate_jwt_keys.py --env >> "$GITHUB_ENV"  # CI (ephemeral)

NEVER commit the private key. In env vars the PEM newlines are escaped as \\n and
un-escaped by app.core.config (Settings.jwt_private_key / jwt_public_key).
"""

import sys

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

_NL = "\n"
_ESC = "\\n"


def generate_pem(key_size: int = 2048):
    """Return (private_pem, public_pem) for a fresh RSA keypair."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=key_size)
    private_pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()
    public_pem = (
        key.public_key()
        .public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode()
    )
    return private_pem, public_pem


def env_lines(private_pem: str, public_pem: str):
    """The three JWT_* env lines, with PEM newlines escaped to \\n (single line each)."""
    return [
        "JWT_ALGORITHM=RS256",
        "JWT_PRIVATE_KEY=" + private_pem.strip().replace(_NL, _ESC),
        "JWT_PUBLIC_KEY=" + public_pem.strip().replace(_NL, _ESC),
    ]


def main():
    private_pem, public_pem = generate_pem()
    lines = env_lines(private_pem, public_pem)
    if "--env" in sys.argv[1:]:
        print(_NL.join(lines))
        return
    print(private_pem)
    print(public_pem)
    print("# --- paste into backend/.env (newlines escaped as \\n) ---")
    print(_NL.join(lines))


if __name__ == "__main__":
    main()

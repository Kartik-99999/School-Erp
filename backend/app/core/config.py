import secrets
from typing import List, Optional, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "School ERP SaaS API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Generated per-process if not supplied via environment. Set SECRET_KEY in
    # the environment / .env to keep issued tokens valid across restarts.
    SECRET_KEY: str = secrets.token_urlsafe(48)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # short-lived; clients refresh via /auth/refresh
    REFRESH_TOKEN_EXPIRE_DAYS: int = 8

    # Comma-separated list of allowed browser origins for CORS.
    BACKEND_CORS_ORIGINS: Union[str, List[str]] = "http://localhost:3001,http://127.0.0.1:3001"

    # Multi-tenant: tenants live on subdomains (e.g. dcmc.localhost:3001,
    # springfield.educore.com). A plain origin list can't cover every subdomain,
    # so allow any subdomain of localhost / 127.0.0.1 / the platform domain.
    BACKEND_CORS_ORIGIN_REGEX: str = (
        r"^https?://([a-z0-9-]+\.)*(localhost|127\.0\.0\.1|educore\.com)(:\d+)?$"
    )

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def _split_cors(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"  # owner/superuser — used for migrations & DDL
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "school_erp"
    POSTGRES_PORT: str = "5432"

    # Optional non-owner role the running APP connects as so Postgres RLS
    # actually applies (superusers/owners bypass RLS). Leave unset to keep
    # connecting as POSTGRES_USER (RLS bypassed). Set both after running
    # `enable_rls.py`. See PROJECT_HANDOFF.md §RLS.
    APP_DB_USER: Optional[str] = None
    APP_DB_PASSWORD: Optional[str] = None

    # --- Deployment / scale (production; all default to off/local-safe) ---
    # Shared rate-limit store so all replicas count against ONE counter (multi-replica
    # correctness). e.g. rediss://:<pwd>@<host>:6380/0. Unset -> slowapi uses in-memory
    # (single-process; fine for local/dev/CI). See app/core/limiter.py.
    REDIS_URL: Optional[str] = None

    # Set true when the app connects through PgBouncer in TRANSACTION pooling mode:
    # disables asyncpg's prepared-statement cache, which txn pooling can't support.
    # The per-transaction `SET LOCAL app.current_tenant` (RLS, see app/db/session.py)
    # stays correct under transaction pooling.
    DB_PGBOUNCER: bool = False

    # Require TLS to Postgres (most managed Postgres / PgBouncer front-ends enforce SSL).
    # Appends ssl=require to the asyncpg connection. Default off for local/CI.
    DB_SSL_REQUIRE: bool = False

    # SQLAlchemy connection pool, PER REPLICA/worker (size with PgBouncer in front).
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    # Third-party Integrations (Placeholders for local dev)
    CLOUDINARY_CLOUD_NAME: str = "demo"
    CLOUDINARY_API_KEY: str = "demo_key"
    CLOUDINARY_API_SECRET: str = "demo_secret"

    # Razorpay is configured PER-SCHOOL now (encrypted on the School row), not globally —
    # see app/models/school.py + app/utils/razorpay.get_client().

    TWILIO_ACCOUNT_SID: str = "AC_demo"
    TWILIO_AUTH_TOKEN: str = "demo_token"
    TWILIO_WHATSAPP_NUMBER: str = "whatsapp:+14155238886"

    # Email (SMTP). Leave SMTP_HOST blank to run in dev "mock" mode where emails are
    # logged instead of sent (so password reset / notices don't fail locally).
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None
    SMTP_USE_TLS: bool = True

    # Fernet key for encrypting PII (Aadhaar/APAAR/PEN) at rest. Blank => store plaintext
    # (dev). Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    PII_ENCRYPTION_KEY: Optional[str] = None

    # Label shown in authenticator apps when enrolling 2FA (the otpauth:// issuer).
    TOTP_ISSUER: str = "Educore School ERP"

    # JWT signing. RS256 (asymmetric) by default: sign with the RSA private key, verify
    # with the public key. Generate a keypair via `python generate_jwt_keys.py` and set
    # JWT_PRIVATE_KEY / JWT_PUBLIC_KEY (PEM; env newlines may be \n-escaped). SECRET_KEY is
    # kept for non-JWT use and as the HS256 fallback when JWT_ALGORITHM=HS256.
    JWT_ALGORITHM: str = "RS256"
    JWT_PRIVATE_KEY: Optional[str] = None
    JWT_PUBLIC_KEY: Optional[str] = None

    @property
    def jwt_private_key(self) -> str:
        """Key used to SIGN JWTs: the RSA private key PEM for RS256 (env newlines may be
        \\n-escaped), or the symmetric SECRET_KEY when JWT_ALGORITHM=HS256."""
        if self.JWT_ALGORITHM == "HS256":
            return self.SECRET_KEY
        if not self.JWT_PRIVATE_KEY:
            raise RuntimeError(
                "JWT_PRIVATE_KEY is required when JWT_ALGORITHM=RS256 — run "
                "`python generate_jwt_keys.py --env >> .env` and restart."
            )
        return self.JWT_PRIVATE_KEY.replace("\\n", "\n")

    @property
    def jwt_public_key(self) -> str:
        """Key used to VERIFY JWTs: the RSA public key PEM for RS256, or SECRET_KEY for HS256."""
        if self.JWT_ALGORITHM == "HS256":
            return self.SECRET_KEY
        if not self.JWT_PUBLIC_KEY:
            raise RuntimeError(
                "JWT_PUBLIC_KEY is required when JWT_ALGORITHM=RS256 — run "
                "`python generate_jwt_keys.py --env >> .env` and restart."
            )
        return self.JWT_PUBLIC_KEY.replace("\\n", "\n")

    def _with_ssl(self, uri: str) -> str:
        """Append ssl=require when DB_SSL_REQUIRE is set (asyncpg accepts the libpq
        sslmode strings). Central so every engine + bring-up script inherits it."""
        if self.DB_SSL_REQUIRE:
            return f"{uri}{'&' if '?' in uri else '?'}ssl=require"
        return uri

    @property
    def async_database_uri(self) -> str:
        """Owner connection (POSTGRES_USER) — used by migrations/DDL scripts."""
        return self._with_ssl(
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def app_database_uri(self) -> str:
        """Connection the running app uses. Falls back to the owner connection
        unless APP_DB_USER/APP_DB_PASSWORD are set (then RLS is enforced)."""
        if self.APP_DB_USER and self.APP_DB_PASSWORD:
            return self._with_ssl(
                f"postgresql+asyncpg://{self.APP_DB_USER}:{self.APP_DB_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        return self.async_database_uri

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()

from typing import List

from pydantic import BaseModel


class TwoFactorSetupResponse(BaseModel):
    """Returned by /auth/2fa/setup. ``provisioning_uri`` renders as the QR code; the
    raw ``secret`` is for manual entry. Not active until /auth/2fa/enable confirms a code."""

    secret: str
    provisioning_uri: str
    issuer: str
    account_name: str


class TwoFactorEnableRequest(BaseModel):
    code: str


class TwoFactorEnableResponse(BaseModel):
    enabled: bool
    recovery_codes: List[str]  # shown once; only hashes are stored


class TwoFactorStatusResponse(BaseModel):
    enabled: bool
    pending: bool  # a secret exists but hasn't been confirmed yet
    recovery_codes_remaining: int


class TwoFactorDisableRequest(BaseModel):
    password: str  # re-auth so a hijacked session can't silently remove 2FA


class TwoFactorVerifyLoginRequest(BaseModel):
    mfa_token: str  # the short-lived token returned by /auth/login when 2FA is on
    code: str  # a TOTP code or a single-use recovery code


class LoginChallengeResponse(BaseModel):
    """Body /auth/login returns (HTTP 200) instead of tokens when the account has 2FA."""

    requires_2fa: bool = True
    mfa_token: str
    token_type: str = "mfa"

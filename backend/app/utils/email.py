"""Email dispatch. Sends via SMTP when configured (settings.SMTP_HOST set);
otherwise logs the message (dev "mock" mode) so flows like password reset don't fail
locally. Synchronous (stdlib smtplib) to match existing call sites — switch to
aiosmtplib + await if volume grows."""

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to_address: str, subject: str, body: str) -> bool:
    """Send a plain-text email. Returns True on success (or in mock mode)."""
    if not settings.SMTP_HOST:
        # Unconfigured / dev: log instead of sending so callers don't fail.
        logger.info("[mock email] to=%s subject=%r", to_address, subject)
        return True

    try:
        msg = EmailMessage()
        msg["From"] = settings.SMTP_FROM or settings.SMTP_USER or "no-reply@localhost"
        msg["To"] = to_address
        msg["Subject"] = subject
        msg.set_content(body)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls()
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
            smtp.send_message(msg)
        return True
    except Exception:
        logger.exception("Email send failed (to=%s)", to_address)
        return False

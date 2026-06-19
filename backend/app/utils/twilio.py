from twilio.rest import Client

from app.core.config import settings


def send_whatsapp_message(to_number: str, message: str) -> bool:
    """
    Sends a WhatsApp message using Twilio.
    to_number format: +919876543210 (without whatsapp: prefix, it will be added)
    """
    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        # Ensure number has whatsapp prefix
        if not to_number.startswith("whatsapp:"):
            to_number = f"whatsapp:{to_number}"

        message = client.messages.create(
            from_=settings.TWILIO_WHATSAPP_NUMBER, body=message, to=to_number
        )
        return True
    except Exception as e:
        print(f"Twilio WhatsApp failed: {e}")
        return False


def send_whatsapp_if_enabled(school, to_number: str, message: str) -> bool:
    """Gate WhatsApp on the school's opt-in toggle, then send best-effort.

    Returns False (a no-op) unless ``school.whatsapp_enabled``. Any failure is logged and
    SWALLOWED — WhatsApp is a side-channel and must never break student creation, attendance
    marking, fee recording, or broadcasts. Returns True only if the message was sent.
    """
    if not school or not getattr(school, "whatsapp_enabled", False):
        return False
    try:
        return send_whatsapp_message(to_number, message)
    except Exception as e:  # noqa: BLE001 — best-effort; never propagate to the caller
        print(f"WhatsApp send skipped (error): {e}")
        return False

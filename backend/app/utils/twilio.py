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

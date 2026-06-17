def send_email(to_address: str, subject: str, body: str) -> bool:
    """
    Mock function for sending an email via SMTP.
    In a real app, this would use a library like aiosmtplib or an API like SendGrid/Postmark.
    """
    try:
        print("--- MOCK EMAIL DISPATCH ---")
        print(f"To: {to_address}")
        print(f"Subject: {subject}")
        print(f"Body: {body[:50]}...")
        print("---------------------------")
        return True
    except Exception as e:
        print(f"Email failed: {e}")
        return False

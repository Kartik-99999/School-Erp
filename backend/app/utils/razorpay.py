"""Per-tenant Razorpay helpers.

There is NO global client: each school collects fees into its OWN Razorpay account, so
every call uses a client built from that school's stored credentials. The platform never
holds funds. Secrets live (encrypted) on the School row; see app/models/school.py.
"""

import razorpay
from fastapi import HTTPException, status


def get_client(key_id: str, key_secret: str) -> razorpay.Client:
    """Build a Razorpay client from a school's own credentials. 409 if the school hasn't
    configured them (so callers surface a clean 'not configured' error)."""
    if not key_id or not key_secret:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Online payments are not configured for this school.",
        )
    return razorpay.Client(auth=(key_id, key_secret))


def create_order(
    client: razorpay.Client, amount_in_inr, receipt_id: str, notes: dict = None
) -> dict:
    """Create a Razorpay order on the school's account. ``notes`` (flat str->str, <=15 keys)
    carries the full payment intent so the browser callback and the webhook record from one
    source of truth."""
    try:
        data = {
            "amount": int(amount_in_inr * 100),  # paise
            "currency": "INR",
            "receipt": receipt_id,
            "payment_capture": 1,
        }
        if notes:
            data["notes"] = notes
        return client.order.create(data=data)
    except Exception as e:
        print(f"Razorpay order creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment gateway error. Verify the school's Razorpay credentials.",
        )


def fetch_order(client: razorpay.Client, order_id: str) -> dict:
    """Fetch an order to read its ``notes`` payment intent. Fail-closed: 502 if it can't be
    retrieved (the webhook treats 5xx as transient and is retried)."""
    try:
        return client.order.fetch(order_id)
    except Exception as e:
        print(f"Razorpay order fetch failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not fetch the Razorpay order.",
        )


def verify_payment(
    client: razorpay.Client,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> bool:
    """Verify a browser checkout's payment signature against the school's key_secret."""
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            }
        )
        return True
    except Exception as e:
        print(f"Razorpay verification failed: {e}")
        return False


def verify_webhook_signature(client: razorpay.Client, body, signature: str, secret: str) -> bool:
    """Verify a webhook payload against the SCHOOL's own webhook ``secret``. ``body`` is the
    RAW request bytes/str — verify BEFORE parsing. Returns False on any mismatch or if the
    secret/signature is missing (fail-closed)."""
    if not secret or not signature:
        return False
    try:
        if isinstance(body, (bytes, bytearray)):
            body = body.decode("utf-8")
        client.utility.verify_webhook_signature(body, signature, secret)
        return True
    except Exception as e:
        print(f"Razorpay webhook signature verification failed: {e}")
        return False


def get_captured_amount(client: razorpay.Client, payment_id: str) -> float:
    """Return the amount (INR) actually captured for a payment on the school's account.
    Fail-closed (502 if unconfirmable) so dues are never credited for more than collected."""
    try:
        payment = client.payment.fetch(payment_id)
        if payment.get("status") not in ("captured", "authorized"):
            raise ValueError(f"Payment not captured (status={payment.get('status')})")
        return float(payment.get("amount", 0)) / 100.0
    except Exception as e:
        print(f"Razorpay payment fetch failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not verify the captured payment amount with Razorpay.",
        )

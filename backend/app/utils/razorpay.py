import razorpay
from fastapi import HTTPException, status

from app.core.config import settings

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_order(amount_in_inr, receipt_id: str, notes: dict = None) -> dict:
    """Create a Razorpay order for the given amount (INR).

    ``notes`` is a flat str->str map (<=15 keys) that rides along on the order. We use it
    to carry the full payment intent (school_id / student_id / allocations) so BOTH the
    browser callback and the async webhook record from one source of truth.
    """
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
        # Fail loudly instead of returning a fake order id that can never be settled.
        print(f"Razorpay order creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment gateway error. Verify Razorpay credentials are configured.",
        )


def fetch_order(order_id: str) -> dict:
    """Fetch a Razorpay order to read its ``notes`` payment intent. Fail-closed: raises 502
    if it can't be retrieved (the webhook treats a 5xx as transient and is retried)."""
    try:
        return client.order.fetch(order_id)
    except Exception as e:
        print(f"Razorpay order fetch failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not fetch the Razorpay order.",
        )


def verify_payment(
    razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str
) -> bool:
    """Verify a browser checkout's payment signature (order_id|payment_id keyed)."""
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


def verify_webhook_signature(body, signature: str) -> bool:
    """Verify a Razorpay *webhook* payload against ``RAZORPAY_WEBHOOK_SECRET``.

    ``body`` is the RAW request bytes/str — verify BEFORE parsing. Returns False on any
    mismatch, or if the secret/signature is missing (fail-closed)."""
    secret = settings.RAZORPAY_WEBHOOK_SECRET
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


def get_captured_amount(payment_id: str) -> float:
    """Return the amount (INR) actually captured by Razorpay for a payment. Fail-closed
    (502 if unconfirmable) so dues are never credited for more than the money collected."""
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

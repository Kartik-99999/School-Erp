import razorpay
from fastapi import HTTPException, status

from app.core.config import settings

client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_order(amount_in_inr: float, receipt_id: str) -> dict:
    """
    Creates a Razorpay order for the given amount (in INR).
    """
    try:
        data = {
            "amount": int(amount_in_inr * 100),  # Amount in paise
            "currency": "INR",
            "receipt": receipt_id,
            "payment_capture": 1,
        }
        order = client.order.create(data=data)
        return order
    except Exception as e:
        # Fail loudly instead of returning a fake order id that can never be settled.
        print(f"Razorpay order creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment gateway error. Verify Razorpay credentials are configured.",
        )


def verify_payment(
    razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str
) -> bool:
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


def get_captured_amount(payment_id: str) -> float:
    """
    Return the amount (in INR) actually captured by Razorpay for a payment.
    Used to ensure dues are never credited for more than the money collected.
    Raises 502 if it can't be confirmed (fail-closed).
    """
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

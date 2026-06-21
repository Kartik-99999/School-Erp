import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";

export interface PaymentAllocation {
  fee_schedule_id: string;
  amount: number;
}
export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
}
export interface InitiateResult {
  order: RazorpayOrder;
  key_id: string | null;
}
export interface VerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  student_id?: string;
}

// Create a Razorpay order on the school's account (intent stashed server-side in the
// order notes). The browser/WebView checkout must open with the returned key_id.
export async function initiateOnlinePayment(
  amount: number,
  studentId: string,
  allocations: PaymentAllocation[]
): Promise<InitiateResult> {
  const res = await api.post("/fees/payments/online/initiate", {
    amount,
    student_id: studentId,
    allocations,
  });
  return (res.data?.data ?? res.data) as InitiateResult;
}

// Verify the signature server-side; the server records from the order notes.
export async function verifyOnlinePayment(payload: VerifyPayload): Promise<void> {
  if (DEV_FAKE_ROLE) return; // preview never reaches a real checkout
  await api.post("/fees/payments/online/verify", payload);
}

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

export interface PaymentOptions {
  razorpay: { enabled: boolean; key_id: string | null };
  external: { enabled: boolean; url: string | null };
  bank: {
    enabled: boolean;
    bank_name: string | null;
    account_number: string | null;
    ifsc: string | null;
    branch: string | null;
    account_holder: string | null;
    upi_id: string | null;
  };
}

// Which payment methods the school has enabled (Razorpay / external link / bank transfer).
export async function getPaymentOptions(): Promise<PaymentOptions> {
  if (DEV_FAKE_ROLE) {
    return {
      razorpay: { enabled: true, key_id: "rzp_test_demo" },
      external: { enabled: false, url: null },
      bank: { enabled: false, bank_name: null, account_number: null, ifsc: null, branch: null, account_holder: null, upi_id: null },
    };
  }
  const res = await api.get("/fees/payment-options");
  return (res.data?.data ?? res.data) as PaymentOptions;
}

// Android-safe receipt: fetch the server-rendered HTML (auth via the axios interceptor)
// and render it in a WebView (Android can't display PDFs inline).
export async function getReceiptHtml(receiptId: string): Promise<string> {
  const res = await api.get(`/fees/receipts/${receiptId}/html`, { responseType: "text" });
  return typeof res.data === "string" ? res.data : String(res.data ?? "");
}

import api from "../axios";

// All endpoints return the standard { success, data } envelope for the
// authenticated student's own records.
export const getMyFees = async () => (await api.get("/student-portal/fees")).data;
export const getMyAttendance = async () => (await api.get("/student-portal/attendance")).data;
export const getMyLibrary = async () => (await api.get("/student-portal/library")).data;
export const getMyFacilities = async () => (await api.get("/student-portal/facilities")).data;
export const getMyLeaves = async () => (await api.get("/student-portal/leaves")).data;

export interface LeaveApplyPayload {
  leave_type: string;
  from_date: string;
  to_date: string;
  reason: string;
}
export const applyLeave = async (payload: LeaveApplyPayload) =>
  (await api.post("/student-portal/leaves", payload)).data;

// --- Online fee payment (Razorpay) ---
export interface PaymentAllocation {
  fee_schedule_id: string;
  amount: number;
}

// The Razorpay order now CARRIES the validated intent (the server stashes the
// allocations in the order's notes), so allocations ride along here at initiate time.
export const initiateOnlinePayment = async (
  amount: number,
  studentId: string,
  allocations: PaymentAllocation[]
) =>
  (
    await api.post("/fees/payments/online/initiate", {
      amount,
      student_id: studentId,
      allocations,
    })
  ).data;

export interface OnlineVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  student_id: string;
}
// allocations are no longer sent — the server records from the order's notes
// (the same source of truth the async webhook uses).
export const verifyOnlinePayment = async (payload: OnlineVerifyPayload) =>
  (await api.post("/fees/payments/online/verify", payload)).data;


// --- Fee payment options (which methods the school has enabled, for the student/parent) ---
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

export const getPaymentOptions = async (): Promise<PaymentOptions> =>
  (await api.get("/fees/payment-options")).data.data;

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
export const initiateOnlinePayment = async (amount: number, studentId: string) =>
  (await api.post(`/fees/payments/online/initiate?amount=${amount}&student_id=${studentId}`)).data;

export interface OnlineVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  student_id: string;
  allocations: { fee_schedule_id: string; amount: number }[];
}
export const verifyOnlinePayment = async (payload: OnlineVerifyPayload) =>
  (await api.post("/fees/payments/online/verify", payload)).data;

import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface LeaveApplication {
  id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: string; // "Pending" | "Approved" | "Rejected"
  applied_at?: string | null;
}
export interface LeaveApplyPayload {
  leave_type: string;
  from_date: string;
  to_date: string;
  reason: string;
}

// A student's own leave applications. Backend /student-portal/leaves is self-only
// (apply + list use the authenticated student); a parent-for-child flow would need a
// new backend endpoint. The dev-mock keeps the screen previewable for both personas.
export async function getMyLeaves(studentId?: string): Promise<LeaveApplication[]> {
  if (DEV_FAKE_ROLE) return mock.leavesById[studentId ?? "s1"] ?? mock.leavesById.s1;
  const res = await api.get("/student-portal/leaves");
  return (res.data?.data ?? []) as LeaveApplication[];
}

export async function applyLeave(payload: LeaveApplyPayload): Promise<void> {
  if (DEV_FAKE_ROLE) return; // pretend success in preview
  await api.post("/student-portal/leaves", payload);
}

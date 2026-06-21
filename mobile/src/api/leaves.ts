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

// A student's own leaves, or (for a parent) a specific child's via ?student_id — the
// backend _resolve_student enforces student=self / parent=own-child / else 403. The
// dev-mock keeps the screen previewable for both personas.
export async function getMyLeaves(studentId?: string): Promise<LeaveApplication[]> {
  if (DEV_FAKE_ROLE) return mock.leavesById[studentId ?? "s1"] ?? mock.leavesById.s1;
  const res = await api.get(studentId ? `/student-portal/leaves?student_id=${studentId}` : "/student-portal/leaves");
  return (res.data?.data ?? []) as LeaveApplication[];
}

export async function applyLeave(payload: LeaveApplyPayload, studentId?: string): Promise<void> {
  if (DEV_FAKE_ROLE) return; // pretend success in preview
  await api.post(studentId ? `/student-portal/leaves?student_id=${studentId}` : "/student-portal/leaves", payload);
}

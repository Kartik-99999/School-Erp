import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_devTeacher";

export interface StudentLeave {
  id: string;
  student_name: string;
  admission_number?: string;
  leave_type: string;
  from_date?: string;
  to_date?: string;
  reason?: string;
  status: string;
  applied_at?: string;
}

// NOTE: the backend restricts /leaves/student-applications (list + approve/reject) to
// School Admin / Super Admin — NOT Teacher. Until the backend grants Teacher access (or
// the app adds an Admin persona), real-mode teacher calls will 403; the dev-mock keeps
// the screen previewable.
export async function getStudentLeaves(status = "Pending"): Promise<StudentLeave[]> {
  if (DEV_FAKE_ROLE) return mock.studentLeaves;
  const res = await api.get(`/leaves/student-applications${status ? `?status=${status}` : ""}`);
  return (res.data?.data ?? []) as StudentLeave[];
}

export async function setStudentLeaveStatus(id: string, status: "Approved" | "Rejected"): Promise<void> {
  if (DEV_FAKE_ROLE) return; // pretend success in preview
  await api.put(`/leaves/student-applications/${id}/status?status=${status}`);
}

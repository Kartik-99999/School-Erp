import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface LibraryIssue {
  id: string;
  book_title: string;
  author?: string;
  issue_date?: string;
  due_date?: string;
  return_date?: string | null;
  status: string; // "Issued" | "Overdue" | "Returned"
  fine_amount: number;
}
export interface LibraryData {
  issues: LibraryIssue[];
  summary: { active: number; total: number; total_fine: number };
}
const EMPTY: LibraryData = { issues: [], summary: { active: 0, total: 0, total_fine: 0 } };

// A student's issued books, due dates and fines.
// NOTE: backend /student-portal/library is self-only today (no ?student_id=), so real
// parent data isn't available yet; studentId is forwarded for forward-compat and the
// dev-mock keeps the screen previewable for both personas.
export async function getMyLibrary(studentId?: string): Promise<LibraryData> {
  if (DEV_FAKE_ROLE) return mock.library;
  const q = studentId ? `?student_id=${studentId}` : "";
  const res = await api.get(`/student-portal/library${q}`);
  return (res.data?.data ?? EMPTY) as LibraryData;
}

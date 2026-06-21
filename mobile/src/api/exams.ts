import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface ExamResult {
  exam_id: string;
  exam_name: string;
  obtained_marks: number;
  total_marks: number;
  percentage: number;
  grade?: string;
  rank?: number | null;
  status?: string; // "Pass" | "Fail"
}

// A student's published results across exams.
// Backend: GET /exams/student/me/results (self only) + /exams for human-friendly names.
// NOTE: a parent passes the child's id, but the backend exam-results route is self-only
// today (unlike /student-portal/{fees,attendance} which accept ?student_id=). Until a
// parent-scoped results endpoint exists, real parent data falls back to empty; the
// dev-mock keeps the screen previewable for both personas.
export async function getExamResults(studentId?: string): Promise<ExamResult[]> {
  if (DEV_FAKE_ROLE) return mock.examResults;
  const [resR, resE] = await Promise.all([
    api.get("/exams/student/me/results"),
    api.get("/exams").catch(() => ({ data: { data: [] } })),
  ]);
  const names: Record<string, string> = {};
  for (const e of (resE.data?.data ?? []) as any[]) names[String(e.id)] = e.name;
  return ((resR.data?.data ?? []) as any[]).map((r) => ({
    exam_id: String(r.exam_id ?? r.id ?? ""),
    exam_name: names[String(r.exam_id)] ?? r.exam_name ?? "Exam",
    obtained_marks: Number(r.obtained_marks ?? 0),
    total_marks: Number(r.total_marks ?? 0),
    percentage: Number(r.percentage ?? 0),
    grade: r.grade ?? undefined,
    rank: r.rank ?? null,
    status: r.status ?? undefined,
  }));
}

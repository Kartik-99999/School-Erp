import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface ExamResult {
  exam_id: string;
  exam_name: string;
  obtained_marks: number;
  total_marks: number;
  percentage: number;
  grade?: string | null;
  rank?: number | null;
  status?: string | null;
}

export interface ReportCardSubject {
  subject_id: string;
  subject_name: string;
  max_marks: number;
  passing_marks: number;
  obtained: number | null;
  is_absent: boolean;
  grade?: string | null;
}
export interface ReportCard {
  exam: { id: string; name: string; start_date?: string | null; end_date?: string | null };
  student: { id: string; name: string; admission_number?: string | null; class_name?: string | null };
  subjects: ReportCardSubject[];
  summary: {
    total_marks: number;
    obtained_marks: number;
    percentage: number;
    grade?: string | null;
    status?: string | null;
    rank?: number | null;
  };
}

// Published exam results (exam-level). Parent passes the child's id; student omits it.
// Backend /student-portal/report-cards is ownership-checked and parent-capable.
export async function getExamResults(studentId?: string): Promise<ExamResult[]> {
  if (DEV_FAKE_ROLE) return mock.examResultsById[studentId ?? "s1"] ?? mock.examResultsById.s1;
  const q = studentId ? `?student_id=${studentId}` : "";
  const res = await api.get(`/student-portal/report-cards${q}`);
  return (res.data?.data ?? []) as ExamResult[];
}

// Per-subject report card for one exam.
export async function getReportCard(examId: string, studentId?: string): Promise<ReportCard> {
  if (DEV_FAKE_ROLE) return mock.reportCardById[studentId ?? "s1"] ?? mock.reportCard;
  const q = studentId ? `?student_id=${studentId}` : "";
  const res = await api.get(`/student-portal/report-cards/${examId}${q}`);
  return res.data?.data as ReportCard;
}

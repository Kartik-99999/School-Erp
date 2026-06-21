import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface SyllabusChapter {
  id: string;
  chapter_name: string;
  description?: string | null;
  completed: boolean;
}
export interface SyllabusSubject {
  subject_id: string;
  subject_name: string;
  total: number;
  completed: number;
  percent: number;
  chapters: SyllabusChapter[];
}
export interface Syllabus {
  subjects: SyllabusSubject[];
  overall: { total: number; completed: number; percent: number };
}

// Parent passes the child's id (ownership-checked server-side); student omits it.
export async function getSyllabus(studentId?: string): Promise<Syllabus> {
  if (DEV_FAKE_ROLE) return mock.syllabus;
  const q = studentId ? `?student_id=${studentId}` : "";
  const res = await api.get(`/student-portal/syllabus${q}`);
  return (res.data?.data ?? { subjects: [], overall: { total: 0, completed: 0, percent: 0 } }) as Syllabus;
}

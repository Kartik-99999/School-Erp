import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface StudentProfile {
  name: string;
  admission_number?: string | null;
  roll_number?: number | null;
  class_name?: string | null;
  section_name?: string | null;
  blood_group?: string | null;
  photo_url?: string | null;
}

// A student reads their own profile (/students/me); a parent reads the selected child
// (/students/{id}). DEV returns a mock so both personas preview without a backend.
export async function getStudentProfile(studentId?: string): Promise<StudentProfile> {
  if (DEV_FAKE_ROLE) return mock.profileById[studentId ?? "s1"] ?? mock.profileById.s1;
  const res = await api.get(studentId ? `/students/${studentId}` : "/students/me");
  const p = (res.data?.data ?? {}) as any;
  return {
    name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.name || "Student",
    admission_number: p.admission_number ?? null,
    roll_number: p.roll_number ?? null,
    class_name: p.class_name ?? null,
    section_name: p.section_name ?? null,
    blood_group: p.blood_group ?? null,
    photo_url: p.photo_url ?? null,
  };
}

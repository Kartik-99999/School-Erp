import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface Child {
  id: string;
  name: string;
  classLabel: string;
  classId?: string;
  sectionId?: string;
}

// A parent's children (GET /students is parent-scoped to their own wards).
export async function getMyChildren(): Promise<Child[]> {
  if (DEV_FAKE_ROLE) return mock.children;
  const res = await api.get("/students");
  return ((res.data?.data ?? []) as any[]).map((s) => ({
    id: String(s.id),
    name: [s.first_name, s.last_name].filter(Boolean).join(" ") || s.name || "Student",
    classLabel: [s.class_name, s.section_name].filter(Boolean).join("-"),
    classId: s.current_class_id ? String(s.current_class_id) : undefined,
    sectionId: s.current_section_id ? String(s.current_section_id) : undefined,
  }));
}

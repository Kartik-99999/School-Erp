import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface AcademicYear {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

// Preview-only selection state so the picker reflects taps under DEV_FAKE_ROLE.
let devActive: string | null = "ay-2026";

export async function getAcademicYears(): Promise<AcademicYear[]> {
  if (DEV_FAKE_ROLE) return mock.academicYears;
  const res = await api.get("/academic-years/");
  return (res.data?.data ?? []) as AcademicYear[];
}

export async function getActiveYear(): Promise<string | null> {
  if (DEV_FAKE_ROLE) return devActive;
  const res = await api.get("/academic-years/active");
  return (res.data?.data?.active_academic_year_id ?? null) as string | null;
}

export async function setActiveYear(academic_year_id: string): Promise<void> {
  if (DEV_FAKE_ROLE) {
    devActive = academic_year_id;
    return;
  }
  await api.put("/academic-years/active", { academic_year_id });
}

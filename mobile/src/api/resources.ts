import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface Resource {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  external_url?: string | null;
  created_at?: string;
}

// School/class-targeted study material and circulars. The backend scopes by the caller's
// audience, so no student_id is needed (same call for student and parent).
export async function getResources(category?: string): Promise<Resource[]> {
  if (DEV_FAKE_ROLE) return mock.resources;
  const q = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await api.get(`/resources${q}`);
  return (res.data?.data ?? []) as Resource[];
}

import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";

export interface NoticeCreateInput {
  title: string;
  body: string;
  category: string; // "Notice" | "Circular"
  target_audience: string; // "All" | "Students" | "Parents" | "Teachers"
  target_class_id?: string | null;
}

// Teachers may post notices (backend allows Teacher on POST /communication/notices).
export async function createNotice(input: NoticeCreateInput): Promise<void> {
  if (DEV_FAKE_ROLE) return; // pretend success in preview
  await api.post("/communication/notices", {
    title: input.title,
    body: input.body,
    category: input.category,
    target_audience: input.target_audience,
    target_class_id: input.target_class_id || null,
    is_pinned: false,
  });
}

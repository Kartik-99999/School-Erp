import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface SchoolEvent {
  id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string;
  event_type: string;
}

// Upcoming school calendar — school-wide, same call for student and parent.
export async function getEvents(): Promise<SchoolEvent[]> {
  if (DEV_FAKE_ROLE) return mock.events;
  const res = await api.get("/communication/events");
  return (res.data?.data ?? []) as SchoolEvent[];
}

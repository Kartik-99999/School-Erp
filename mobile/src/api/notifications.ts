import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface AppNotification {
  id: string;
  title: string;
  body?: string | null;
  type: string; // notice | absence | fee | general
  ref_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export async function getNotifications(): Promise<AppNotification[]> {
  if (DEV_FAKE_ROLE) return mock.notifications;
  const res = await api.get("/notifications");
  return (res.data?.data ?? []) as AppNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  if (DEV_FAKE_ROLE) return;
  await api.post(`/notifications/${id}/read`);
}

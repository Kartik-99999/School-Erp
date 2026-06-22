import api from "../axios";

export interface AppNotification {
  id: string;
  title: string;
  body?: string | null;
  type: string; // notice | absence | fee | general
  ref_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export const getNotifications = async (): Promise<AppNotification[]> =>
  (await api.get<{ success: boolean; data: AppNotification[] }>("/notifications")).data.data;

export const markNotificationRead = async (id: string) =>
  (await api.post(`/notifications/${id}/read`)).data;

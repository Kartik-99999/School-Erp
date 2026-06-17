import api from "../axios";

export const getNotices = async (target?: string) => {
  const url = target ? `/communication/notices?target=${target}` : "/communication/notices";
  return (await api.get<{ success: boolean; data: any[] }>(url)).data;
};

export const createNotice = async (data: any) => {
  return (await api.post("/communication/notices", data)).data;
};

export const togglePinNotice = async (id: string, isPinned: boolean) => {
  return (await api.put(`/communication/notices/${id}/pin?is_pinned=${isPinned}`)).data;
};

export const getMessageLogs = async () => {
  return (await api.get<{ success: boolean; data: any[] }>("/communication/broadcast/logs")).data;
};

export const sendBroadcast = async (data: any) => {
  return (await api.post("/communication/broadcast", data)).data;
};

export const getEvents = async (month?: number, year?: number) => {
  let url = "/communication/events";
  if (month && year) url += `?month=${month}&year=${year}`;
  return (await api.get<{ success: boolean; data: any[] }>(url)).data;
};

export const createEvent = async (data: any) => {
  return (await api.post("/communication/events", data)).data;
};

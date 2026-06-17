import api from "../axios";

// Parent side
export const getMyMessages = async () => (await api.get("/messages/me")).data;
export const sendMyMessage = async (body: string) =>
  (await api.post("/messages/me", { body })).data;

// School (admin) side
export const getThreads = async () => (await api.get("/messages/threads")).data;
export const getThread = async (parentId: string) =>
  (await api.get(`/messages/threads/${parentId}`)).data;
export const replyToThread = async (parentId: string, body: string) =>
  (await api.post(`/messages/threads/${parentId}`, { body })).data;

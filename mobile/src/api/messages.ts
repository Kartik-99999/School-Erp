import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface ParentMessage {
  id: string;
  sender: string; // "Parent" | "School"
  body: string;
  is_read?: boolean;
  created_at?: string;
}

// Backend restricts /messages/me to Parent — a single parent↔school thread (not inbox/sent).
export async function getMyMessages(): Promise<ParentMessage[]> {
  if (DEV_FAKE_ROLE) return mock.messages;
  const res = await api.get("/messages/me");
  return (res.data?.data ?? []) as ParentMessage[];
}

export async function sendMessage(body: string): Promise<ParentMessage | null> {
  if (DEV_FAKE_ROLE) {
    return { id: "local-" + Date.now(), sender: "Parent", body, created_at: new Date().toISOString() };
  }
  const res = await api.post("/messages/me", { body });
  return (res.data?.data ?? null) as ParentMessage | null;
}

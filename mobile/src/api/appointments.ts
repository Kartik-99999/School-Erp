import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface Slot {
  id: string;
  teacher_id: string;
  teacher_name: string;
  start_time: string;
  end_time: string;
}
export interface Appointment {
  id: string;
  teacher_name: string;
  start_time: string;
  end_time: string;
  status: string;
  note?: string | null;
}

export async function getOpenSlots(): Promise<Slot[]> {
  if (DEV_FAKE_ROLE) return mock.appointmentSlots;
  const res = await api.get("/appointments/slots");
  return (res.data?.data ?? []) as Slot[];
}

export async function getMyAppointments(): Promise<Appointment[]> {
  if (DEV_FAKE_ROLE) return mock.myAppointments;
  const res = await api.get("/appointments/me");
  return (res.data?.data ?? []) as Appointment[];
}

export async function bookAppointment(slotId: string, note?: string): Promise<void> {
  if (DEV_FAKE_ROLE) return; // preview updates optimistically in the screen
  await api.post("/appointments", { slot_id: slotId, note });
}

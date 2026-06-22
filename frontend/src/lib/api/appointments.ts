import api from "../axios";

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

export const getOpenSlots = async (): Promise<Slot[]> =>
  (await api.get<{ success: boolean; data: Slot[] }>("/appointments/slots")).data.data;

export const getMyAppointments = async (): Promise<Appointment[]> =>
  (await api.get<{ success: boolean; data: Appointment[] }>("/appointments/me")).data.data;

// Parent/Student book an open slot.
export const bookAppointment = async (slotId: string, note?: string) =>
  (await api.post("/appointments", { slot_id: slotId, note })).data;

// Teacher publishes an availability slot (ISO start/end).
export const createSlot = async (startTime: string, endTime: string) =>
  (await api.post("/appointments/slots", { start_time: startTime, end_time: endTime })).data;

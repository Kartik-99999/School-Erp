"use client";
import React, { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { getOpenSlots, getMyAppointments, bookAppointment, Slot, Appointment } from "@/lib/api/appointments";

const fmt = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

// Parent/Student view: browse open slots, book one, see own bookings. Not child-scoped
// (a booking is made by the logged-in user).
export default function BookAppointments() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [mine, setMine] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [s, m] = await Promise.all([getOpenSlots(), getMyAppointments()]);
      setSlots(s);
      setMine(m);
    } catch (e) {
      console.error("Failed to load appointments", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const book = async (slot: Slot) => {
    if (busy) return;
    setBusy(slot.id);
    try {
      await bookAppointment(slot.id);
      setSlots((p) => p.filter((s) => s.id !== slot.id));
      setMine((p) => [
        { id: "local-" + slot.id, teacher_name: slot.teacher_name, start_time: slot.start_time, end_time: slot.end_time, status: "Booked" },
        ...p,
      ]);
    } catch (e: any) {
      alert(e?.response?.status === 409 ? "That slot was just taken — please pick another." : "Couldn't book the appointment.");
      load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-ink">Appointments</h2>
        <p className="text-ink-muted mt-1">Book a meeting with a teacher and track your bookings.</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-ink-muted">Loading…</div>
      ) : error ? (
        <div className="bg-surface-card rounded-card border border-border p-8 text-center text-red-600">
          Couldn't load appointments.
          <button onClick={load} className="underline ml-1 font-medium">
            Retry
          </button>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h3 className="font-bold text-ink">My appointments</h3>
            {mine.length === 0 ? (
              <div className="bg-surface-card rounded-card border border-border p-8 text-center text-ink-muted">
                No appointments booked yet.
              </div>
            ) : (
              mine.map((a) => (
                <div key={a.id} className="bg-surface-card rounded-card border border-border shadow-sm p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-ink">{a.teacher_name}</p>
                      <p className="text-sm text-ink-muted mt-0.5">{fmt(a.start_time)}</p>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        a.status === "Booked" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                  {a.note ? <p className="text-sm text-ink-muted mt-2">{a.note}</p> : null}
                </div>
              ))
            )}
          </section>

          <section className="space-y-3">
            <h3 className="font-bold text-ink">Open slots</h3>
            {slots.length === 0 ? (
              <div className="bg-surface-card rounded-card border border-border p-8 text-center text-ink-muted">
                No open slots right now.
              </div>
            ) : (
              slots.map((s) => (
                <div key={s.id} className="bg-surface-card rounded-card border border-border shadow-sm p-4 flex items-center gap-4">
                  <CalendarClock className="w-5 h-5 text-primary-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink">{s.teacher_name}</p>
                    <p className="text-sm text-ink-muted">{fmt(s.start_time)}</p>
                  </div>
                  <button
                    onClick={() => book(s)}
                    disabled={busy === s.id}
                    className="px-5 py-2 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 disabled:opacity-60"
                  >
                    {busy === s.id ? "…" : "Book"}
                  </button>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import { CalendarClock, CalendarDays, Inbox, Clock, User, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";
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
    <div className="max-w-4xl mx-auto space-y-10 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-ink tracking-tight">Appointments</h2>
          <p className="text-ink-muted mt-2 text-base">Book a meeting with a teacher and track your bookings.</p>
        </div>
        <div className="hidden sm:flex p-3 bg-primary-50 rounded-2xl shadow-sm border border-primary-100">
          <CalendarDays className="w-8 h-8 text-primary-600" />
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="text-ink-muted font-medium">Loading schedule…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-8 text-center flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-red-700 font-medium">Couldn't load appointments.</p>
          <button onClick={load} className="px-4 py-2 bg-red-100 text-red-800 rounded-lg font-medium hover:bg-red-200 transition-colors">
            Try Again
          </button>
        </div>
      ) : (
        <>
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-6 bg-primary-500 rounded-full"></div>
              <h3 className="text-xl font-bold text-ink tracking-tight">My appointments</h3>
            </div>
            {mine.length === 0 ? (
              <div className="bg-surface rounded-2xl border-2 border-dashed border-border p-10 text-center flex flex-col items-center gap-3">
                <div className="p-4 bg-surface-card rounded-full shadow-sm border border-border">
                  <Inbox className="w-8 h-8 text-ink-lighter" />
                </div>
                <p className="text-ink-muted font-medium">No appointments booked yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mine.map((a) => (
                  <div key={a.id} className="bg-surface-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 border border-primary-200 flex items-center justify-center font-bold text-lg shrink-0">
                          {a.teacher_name?.charAt(0) || <User className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-ink truncate">{a.teacher_name}</p>
                          <div className="flex items-center gap-1.5 text-sm text-ink-muted mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                            <span className="truncate">{fmt(a.start_time)}</span>
                          </div>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${
                          a.status === "Booked" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {a.status === "Booked" && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {a.status}
                      </span>
                    </div>
                    {a.note ? <div className="text-sm text-ink-muted bg-surface p-3 rounded-xl border border-border mt-1">{a.note}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-6 pt-6 border-t border-border mt-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-6 bg-primary-500 rounded-full"></div>
              <h3 className="text-xl font-bold text-ink tracking-tight">Open slots</h3>
            </div>
            {slots.length === 0 ? (
              <div className="bg-surface rounded-2xl border-2 border-dashed border-border p-10 text-center flex flex-col items-center gap-3">
                <div className="p-4 bg-surface-card rounded-full shadow-sm border border-border">
                  <CalendarClock className="w-8 h-8 text-ink-lighter" />
                </div>
                <p className="text-ink-muted font-medium">No open slots right now.</p>
                <p className="text-ink-lighter text-sm">Check back later for new availability.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {slots.map((s) => (
                  <div key={s.id} className="group bg-surface-card rounded-2xl border border-border shadow-sm hover:border-primary-300 hover:shadow-md transition-all p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center shrink-0">
                        <User className="w-6 h-6 text-ink-muted" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-ink text-lg group-hover:text-primary-700 transition-colors truncate">{s.teacher_name}</p>
                        <div className="flex items-center gap-1.5 text-sm text-ink-muted mt-1">
                          <CalendarClock className="w-4 h-4 text-primary-500 shrink-0" />
                          <span className="font-medium text-ink-muted truncate">{fmt(s.start_time)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 sm:pt-0 shrink-0">
                      <button
                        onClick={() => book(s)}
                        disabled={busy === s.id}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary-50 text-primary-700 font-semibold border border-primary-100 hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all disabled:opacity-60 disabled:hover:bg-primary-50 disabled:hover:text-primary-700 disabled:hover:border-primary-100 flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                      >
                        {busy === s.id ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            Booking…
                          </span>
                        ) : (
                          <>
                            Book Slot <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import { CalendarPlus, CalendarClock, Clock, CalendarDays, PlusCircle, CheckCircle2, Inbox } from "lucide-react";
import { getMyAppointments, createSlot, Appointment } from "@/lib/api/appointments";

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

export default function TeacherAppointmentsPage() {
  const [mine, setMine] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setMine(await getMyAppointments());
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

  const publish = async () => {
    if (!start || !end) return alert("Pick a start and end time.");
    if (new Date(end) <= new Date(start)) return alert("End time must be after the start time.");
    setSaving(true);
    try {
      // datetime-local is local time; send UTC ISO (the slot column is tz-aware).
      await createSlot(new Date(start).toISOString(), new Date(end).toISOString());
      setStart("");
      setEnd("");
      await load();
    } catch (e) {
      console.error("Failed to publish slot", e);
      alert("Couldn't publish the slot. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-ink tracking-tight">Appointments</h2>
          <p className="text-ink-muted mt-2 text-base">Publish your availability and see who's booked with you.</p>
        </div>
        <div className="hidden sm:flex p-3 bg-primary-50 rounded-2xl shadow-sm border border-primary-100">
          <CalendarDays className="w-8 h-8 text-primary-600" />
        </div>
      </div>

      <div className="bg-surface-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 space-y-6 transition-shadow hover:shadow-md">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="p-2 bg-primary-50 rounded-xl border border-primary-100">
            <CalendarPlus className="w-5 h-5 text-primary-600" />
          </div>
          <h3 className="text-xl font-bold text-ink tracking-tight">Publish a new slot</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink-muted flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-500" /> Start Time
            </label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-ink outline-none transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink-muted flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-500" /> End Time
            </label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-ink outline-none transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
            />
          </div>
        </div>
        <div className="pt-2">
          <button
            onClick={publish}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100 shadow-sm shadow-primary-600/20"
          >
            <PlusCircle className="w-5 h-5" />
            {saving ? "Publishing…" : "Publish Slot"}
          </button>
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-6 bg-primary-500 rounded-full"></div>
          <h3 className="text-xl font-bold text-ink tracking-tight">My slots &amp; bookings</h3>
        </div>
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <p className="text-ink-muted font-medium">Loading your schedule…</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 rounded-2xl border border-red-100 p-8 text-center flex flex-col items-center gap-3">
            <p className="text-red-700 font-medium">Couldn't load your appointments.</p>
            <button onClick={load} className="px-4 py-2 bg-red-100 text-red-800 rounded-lg font-medium hover:bg-red-200 transition-colors">
              Try Again
            </button>
          </div>
        ) : mine.length === 0 ? (
          <div className="bg-surface rounded-2xl border-2 border-dashed border-border p-12 text-center flex flex-col items-center gap-3">
            <div className="p-4 bg-surface-card rounded-full shadow-sm border border-border">
              <Inbox className="w-8 h-8 text-ink-lighter" />
            </div>
            <p className="text-ink-muted font-medium text-lg">No slots published yet.</p>
            <p className="text-ink-lighter text-sm">Publish a slot above to allow students to book.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {mine.map((a) => (
              <div key={a.id} className="group bg-surface-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all p-5 flex flex-col sm:flex-row sm:items-center gap-4 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-3 bg-primary-50 rounded-xl text-primary-600 border border-primary-100 shrink-0">
                  <CalendarClock className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink text-lg">{fmt(a.start_time)}</p>
                  {a.note ? <p className="text-sm text-ink-muted mt-2 bg-surface p-3 rounded-xl border border-border">{a.note}</p> : null}
                </div>
                <div className="flex items-center pt-2 sm:pt-0">
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border ${
                      a.status === "Booked" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-surface text-ink-muted border-border"
                    }`}
                  >
                    {a.status === "Booked" && <CheckCircle2 className="w-4 h-4" />}
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import { CalendarPlus, CalendarClock } from "lucide-react";
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
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-ink">Appointments</h2>
        <p className="text-ink-muted mt-1">Publish your availability and see who's booked with you.</p>
      </div>

      <div className="bg-surface-card rounded-card border border-border shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-ink flex items-center gap-2">
          <CalendarPlus className="w-5 h-5 text-primary-600" /> Publish a slot
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-muted">Start</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-muted">End</label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <button
          onClick={publish}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? "Publishing…" : "Publish slot"}
        </button>
      </div>

      <section className="space-y-3">
        <h3 className="font-bold text-ink">My slots &amp; bookings</h3>
        {loading ? (
          <div className="py-12 text-center text-ink-muted">Loading…</div>
        ) : error ? (
          <div className="bg-surface-card rounded-card border border-border p-8 text-center text-red-600">
            Couldn't load your appointments.
            <button onClick={load} className="underline ml-1 font-medium">
              Retry
            </button>
          </div>
        ) : mine.length === 0 ? (
          <div className="bg-surface-card rounded-card border border-border p-8 text-center text-ink-muted">
            No slots published yet.
          </div>
        ) : (
          mine.map((a) => (
            <div key={a.id} className="bg-surface-card rounded-card border border-border shadow-sm p-5 flex items-center gap-4">
              <CalendarClock className="w-5 h-5 text-primary-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink">{fmt(a.start_time)}</p>
                {a.note ? <p className="text-sm text-ink-muted mt-0.5">{a.note}</p> : null}
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  a.status === "Booked" ? "bg-emerald-50 text-emerald-700" : "bg-surface text-ink-muted"
                }`}
              >
                {a.status}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

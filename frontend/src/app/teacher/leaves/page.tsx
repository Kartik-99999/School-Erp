"use client";
import React, { useEffect, useState } from "react";
import { CalendarOff, Plus } from "lucide-react";
import { getLeaveTypes, getMyLeaveApplications, applyLeave } from "@/lib/api/staff";

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

const statusStyle = (s: string) =>
  s === "Approved"
    ? "bg-emerald-50 text-emerald-700"
    : s === "Rejected"
      ? "bg-red-50 text-red-700"
      : "bg-amber-50 text-amber-700";

export default function TeacherLeavesPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [t, a] = await Promise.all([getLeaveTypes(), getMyLeaveApplications()]);
      const tList = t.data || [];
      setTypes(tList);
      setApps(a.data || []);
      if (tList[0]) setTypeId(String(tList[0].id));
    } catch (e) {
      console.error("Failed to load leaves", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const typeName = (id: string) => types.find((t) => String(t.id) === String(id))?.name || "Leave";

  const submit = async () => {
    if (!typeId || !start || !end) return alert("Pick a type, start and end date.");
    if (new Date(end) < new Date(start)) return alert("End date can't be before the start date.");
    if (!reason.trim()) return alert("Please add a reason.");
    setSaving(true);
    try {
      await applyLeave({ leave_type_id: typeId, start_date: start, end_date: end, reason: reason.trim() });
      setOpen(false);
      setStart("");
      setEnd("");
      setReason("");
      await load();
    } catch (e) {
      console.error("Failed to apply for leave", e);
      alert("Couldn't submit your leave. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">My Leaves</h2>
          <p className="text-ink-muted mt-1">Apply for leave and track approvals.</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {open ? "Cancel" : "Apply"}
        </button>
      </div>

      {open && (
        <div className="bg-surface-card rounded-card border border-border shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-ink-muted">Type</label>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-2 focus:ring-primary-500"
            >
              {types.length === 0 ? <option value="">No leave types configured</option> : null}
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink-muted">From</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-muted">To</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-ink-muted">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              onClick={submit}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-ink text-white font-bold disabled:opacity-60"
            >
              {saving ? "Submitting…" : "Submit application"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-bold text-ink">My applications</h3>
        {loading ? (
          <div className="py-10 text-center text-ink-muted">Loading…</div>
        ) : error ? (
          <div className="bg-surface-card rounded-card border border-border p-8 text-center text-red-600">
            Couldn't load your leaves.
            <button onClick={load} className="underline ml-1 font-medium">
              Retry
            </button>
          </div>
        ) : apps.length === 0 ? (
          <div className="bg-surface-card rounded-card border border-border p-8 text-center text-ink-muted">
            No leave applications yet.
          </div>
        ) : (
          apps.map((a) => (
            <div key={a.id} className="bg-surface-card rounded-card border border-border shadow-sm p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CalendarOff className="w-5 h-5 text-primary-600 shrink-0" />
                  <div>
                    <p className="font-bold text-ink">{typeName(a.leave_type_id)}</p>
                    <p className="text-sm text-ink-muted">
                      {fmt(a.start_date)} → {fmt(a.end_date)}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusStyle(a.status)}`}>{a.status}</span>
              </div>
              {a.reason ? <p className="text-sm text-ink-muted mt-2 ml-8">{a.reason}</p> : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

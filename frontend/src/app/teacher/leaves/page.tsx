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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-border">
        <div>
          <h2 className="text-3xl font-extrabold text-ink tracking-tight">Leave Management</h2>
          <p className="text-ink-muted mt-2 text-lg">Apply for time off and monitor your leave status seamlessly.</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`px-5 py-2.5 rounded-xl text-white text-sm font-bold inline-flex items-center gap-2 transition-all duration-200 shadow-sm shrink-0 ${open ? 'bg-red-500 hover:bg-red-600 focus:ring-4 focus:ring-red-500/20' : 'bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:ring-primary-500/20'}`}
        >
          <Plus className={`w-5 h-5 transition-transform duration-300 ${open ? 'rotate-45' : ''}`} /> 
          {open ? "Cancel Request" : "New Leave Request"}
        </button>
      </div>

      {open && (
        <div className="bg-surface-card rounded-2xl border border-border shadow-sm overflow-hidden animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="p-6 sm:p-8 bg-gradient-to-b from-surface to-surface-card">
            <h3 className="text-xl font-bold text-ink mb-6 flex items-center gap-2">
              <CalendarOff className="w-5 h-5 text-primary-600" />
              Leave Application Form
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-semibold text-ink-muted uppercase tracking-wider">Leave Type</label>
                <div className="relative">
                  <select
                    value={typeId}
                    onChange={(e) => setTypeId(e.target.value)}
                    className="appearance-none w-full px-4 py-3 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                  >
                    {types.length === 0 ? <option value="">No leave types configured</option> : null}
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-ink-muted">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink-muted uppercase tracking-wider">From Date</label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-ink-muted uppercase tracking-wider">To Date</label>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-semibold text-ink-muted uppercase tracking-wider">Reason for Leave</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide details for your leave request..."
                  rows={4}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm resize-none"
                />
              </div>
              <div className="sm:col-span-2 pt-2">
                <button
                  onClick={submit}
                  disabled={saving}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-ink text-white font-bold disabled:opacity-60 hover:bg-ink/90 transition-all shadow-md active:scale-[0.98]"
                >
                  {saving ? "Submitting Application…" : "Submit Leave Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-ink">Leave History</h3>
          {apps.length > 0 && (
            <span className="px-3 py-1 bg-surface-card border border-border text-ink-muted rounded-full text-xs font-bold tracking-wider uppercase">
              {apps.length} records
            </span>
          )}
        </div>
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4 text-ink-muted">
            <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
            <p className="font-medium animate-pulse">Loading records...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50/50 rounded-2xl border border-red-200 p-8 text-center text-red-600 flex flex-col items-center justify-center">
            <svg className="w-12 h-12 text-red-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-medium mb-4">Couldn't load your leaves.</p>
            <button onClick={load} className="px-6 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-sm">
              Try Again
            </button>
          </div>
        ) : apps.length === 0 ? (
          <div className="bg-surface-card rounded-2xl border border-border border-dashed p-12 text-center text-ink-muted flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4 shadow-inner">
              <CalendarOff className="w-8 h-8 text-ink-muted/50" />
            </div>
            <h4 className="text-lg font-bold text-ink mb-1">No applications yet</h4>
            <p className="text-sm max-w-sm">You haven't submitted any leave applications. When you do, they will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {apps.map((a) => (
              <div key={a.id} className="group bg-surface-card rounded-2xl border border-border shadow-sm p-6 hover:shadow-md transition-all duration-200">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                      a.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                      a.status === 'Rejected' ? 'bg-red-50 text-red-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      <CalendarOff className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-lg font-bold text-ink">{typeName(a.leave_type_id)}</p>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${statusStyle(a.status)} ${
                          a.status === 'Approved' ? 'border-emerald-200' :
                          a.status === 'Rejected' ? 'border-red-200' :
                          'border-amber-200'
                        }`}>{a.status}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-ink-muted">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {fmt(a.start_date)}
                        <span className="text-border mx-1">→</span>
                        {fmt(a.end_date)}
                      </div>
                      {a.reason && (
                        <div className="mt-4 p-4 bg-surface rounded-xl border border-border/50 text-sm text-ink-muted leading-relaxed relative before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-2/3 before:w-1 before:bg-border before:rounded-r">
                          {a.reason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

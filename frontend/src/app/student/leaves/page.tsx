"use client";
import React, { useEffect, useState } from "react";
import { Calendar, Send } from "lucide-react";
import { getMyLeaves, applyLeave } from "@/lib/api/studentPortal";

const fmt = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const badge = (status: string) => {
  const map: Record<string, string> = {
    Approved: "bg-emerald-50 text-emerald-700",
    Rejected: "bg-red-100 text-red-700",
    Pending: "bg-amber-50 text-amber-700",
  };
  return map[status] || "bg-surface text-ink-muted";
};

export default function StudentLeaveApplicationPage() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ leave_type: "Sick", from_date: "", to_date: "", reason: "" });

  const load = async () => {
    try {
      const res = await getMyLeaves();
      setLeaves(res.data || []);
    } catch (e) {
      console.error("Failed to load leaves", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await applyLeave(form);
      setForm({ leave_type: "Sick", from_date: "", to_date: "", reason: "" });
      await load();
      alert("Leave application submitted.");
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || "Failed to submit leave application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-ink">Leave Applications</h2>
        <p className="text-ink-muted mt-1">Apply for leave and track approval status.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 bg-surface-card p-6 rounded-card border border-border shadow-sm space-y-4 h-max"
        >
          <h3 className="font-bold text-ink">New Application</h3>
          <div>
            <label className="block text-sm font-bold text-ink mb-1">Leave Type</label>
            <select
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
              value={form.leave_type}
              onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
            >
              {["Sick", "Casual", "Emergency", "Other"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-ink mb-1">From</label>
              <input
                type="date"
                required
                value={form.from_date}
                onChange={(e) => setForm({ ...form, from_date: e.target.value })}
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink mb-1">To</label>
              <input
                type="date"
                required
                value={form.to_date}
                onChange={(e) => setForm({ ...form, to_date: e.target.value })}
                className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-ink mb-1">Reason</label>
            <textarea
              rows={3}
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Reason for leave..."
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Send className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>

        {/* History */}
        <div className="lg:col-span-3 bg-surface-card rounded-card border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-bold text-ink">My Applications</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-ink-muted">Loading...</div>
          ) : leaves.length === 0 ? (
            <div className="p-10 text-center text-ink-muted">
              <Calendar className="w-10 h-10 text-ink-faint mx-auto mb-2" />
              No leave applications yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {leaves.map((l) => (
                <div key={l.id} className="p-5 hover:bg-surface">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-ink">{l.leave_type} Leave</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge(l.status)}`}>
                      {l.status}
                    </span>
                  </div>
                  <p className="text-sm text-ink-muted">
                    {fmt(l.from_date)} → {fmt(l.to_date)}
                  </p>
                  <p className="text-sm text-ink-muted mt-1">{l.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

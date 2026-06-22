"use client";
import React, { useEffect, useState } from "react";
import { CheckSquare, XSquare, AlertCircle, Percent } from "lucide-react";
import { getAttendance } from "@/lib/api/studentPortal";
import { useChildren, ChildPicker } from "@/components/parent/ChildPicker";

const fmt = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const badge = (status: string) => {
  const map: Record<string, string> = {
    Present: "bg-emerald-50 text-emerald-700",
    Absent: "bg-red-100 text-red-700",
    Late: "bg-amber-50 text-amber-700",
    "Half Day": "bg-primary-50 text-primary-700",
    "Medical Leave": "bg-purple-50 text-purple-700",
  };
  return map[status] || "bg-surface text-ink-muted";
};

export default function ParentAttendancePage() {
  const { students, childId, setChildId, loading: childrenLoading, error: childrenError } = useChildren();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [summary, setSummary] = useState<any>({});
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    if (!childId) return;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const res = await getAttendance(childId);
        setSummary(res.data?.summary || {});
        setRecords(res.data?.records || []);
      } catch (e) {
        console.error("Failed to load attendance", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [childId]);

  const cards = [
    { label: "Attendance %", value: `${summary.percentage ?? 0}%`, icon: Percent, color: "text-primary-600 bg-primary-50" },
    { label: "Present", value: summary.present ?? 0, icon: CheckSquare, color: "text-emerald-600 bg-emerald-50" },
    { label: "Absent", value: summary.absent ?? 0, icon: XSquare, color: "text-red-600 bg-red-50" },
    { label: "Late / Half Day", value: (summary.late ?? 0) + (summary.half_day ?? 0), icon: AlertCircle, color: "text-amber-600 bg-amber-50" },
  ];

  if (childrenLoading)
    return <div className="max-w-5xl mx-auto py-16 text-center text-ink-muted">Loading…</div>;
  if (childrenError)
    return <div className="max-w-5xl mx-auto py-16 text-center text-red-600">Couldn't load your children. Please try again.</div>;
  if (students.length === 0)
    return <div className="max-w-5xl mx-auto py-16 text-center text-ink-muted">No students are linked to your account yet.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Attendance</h2>
          <p className="text-ink-muted mt-1">Your child's day-wise attendance record for the year.</p>
        </div>
        <ChildPicker students={students} childId={childId} onChange={setChildId} />
      </div>

      {error ? (
        <div className="bg-surface-card rounded-card border border-border p-8 text-center text-red-600">
          Couldn't load attendance. Please try again.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((c) => (
              <div key={c.label} className="bg-surface-card p-6 rounded-card border border-border shadow-sm">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
                  <c.icon className="w-6 h-6" />
                </div>
                <p className="text-3xl font-bold text-ink">{loading ? "…" : c.value}</p>
                <p className="text-sm font-medium text-ink-muted mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-surface-card rounded-card shadow-sm border border-border overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-ink">Daily Log</h3>
              <p className="text-sm text-ink-muted">{summary.total ?? 0} marked days</p>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface/50">
                  <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">Date</th>
                  <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r, i) => (
                  <tr key={i} className="hover:bg-surface">
                    <td className="p-4 text-ink font-medium">{fmt(r.date)}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="p-4 text-ink-muted text-sm">{r.remarks || "—"}</td>
                  </tr>
                ))}
                {!loading && records.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-ink-muted">
                      No attendance has been marked yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import { BookOpenCheck, Clock, AlertTriangle } from "lucide-react";
import { getMyLibrary } from "@/lib/api/studentPortal";

const fmt = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const badge = (status: string) => {
  const map: Record<string, string> = {
    Issued: "bg-primary-50 text-primary-700",
    Returned: "bg-emerald-50 text-emerald-700",
    Overdue: "bg-red-100 text-red-700",
    Lost: "bg-surface text-ink",
  };
  return map[status] || "bg-surface text-ink-muted";
};

export default function StudentLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ active: 0, total: 0, total_fine: 0 });

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyLibrary();
        setIssues(res.data.issues || []);
        setSummary(res.data.summary || {});
      } catch (e) {
        console.error("Failed to load library records", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    {
      label: "Currently Borrowed",
      value: summary.active ?? 0,
      icon: BookOpenCheck,
      color: "text-primary-600 bg-primary-50",
    },
    {
      label: "Total Borrowed",
      value: summary.total ?? 0,
      icon: Clock,
      color: "text-ink-muted bg-surface",
    },
    {
      label: "Outstanding Fines",
      value: `₹${Number(summary.total_fine || 0).toFixed(2)}`,
      icon: AlertTriangle,
      color: "text-red-600 bg-red-50",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-ink">My Library</h2>
        <p className="text-ink-muted mt-1">Books you have borrowed and their due dates.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-surface-card p-6 rounded-card border border-border shadow-sm"
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${c.color}`}
            >
              <c.icon className="w-6 h-6" />
            </div>
            <p className="text-3xl font-bold text-ink">{loading ? "…" : c.value}</p>
            <p className="text-sm font-medium text-ink-muted mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-card rounded-card shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-bold text-ink">Borrowing History</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface/50">
              {["Book", "Issued", "Due", "Returned", "Status", "Fine"].map((h) => (
                <th
                  key={h}
                  className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {issues.map((b) => (
              <tr key={b.id} className="hover:bg-surface">
                <td className="p-4">
                  <p className="font-bold text-ink">{b.book_title}</p>
                  <p className="text-xs text-ink-muted">{b.author}</p>
                </td>
                <td className="p-4 text-ink-muted">{fmt(b.issue_date)}</td>
                <td className="p-4 text-ink-muted">{fmt(b.due_date)}</td>
                <td className="p-4 text-ink-muted">{fmt(b.return_date)}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge(b.status)}`}>
                    {b.status}
                  </span>
                </td>
                <td className="p-4 font-bold text-ink">
                  {Number(b.fine_amount) > 0 ? `₹${Number(b.fine_amount).toFixed(2)}` : "—"}
                </td>
              </tr>
            ))}
            {!loading && issues.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-ink-muted">
                  You haven&apos;t borrowed any books yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

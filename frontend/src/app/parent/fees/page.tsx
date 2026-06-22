"use client";
import React, { useEffect, useState } from "react";
import { DollarSign, Clock, FileText, Download } from "lucide-react";
import api from "@/lib/axios";
import { getFees } from "@/lib/api/studentPortal";
import { useChildren, ChildPicker } from "@/components/parent/ChildPicker";

const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function ParentFeesPage() {
  const { students, childId, setChildId, loading: childrenLoading, error: childrenError } = useChildren();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dues, setDues] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ total_due: 0, total_paid: 0, balance: 0 });

  useEffect(() => {
    if (!childId) return;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        // Student/Parent-gated portal route; parent passes the selected child's id.
        const res = await getFees(childId);
        setDues(res.data?.dues || []);
        setReceipts(res.data?.receipts || []);
        setSummary(res.data?.summary || {});
      } catch (e) {
        console.error("Failed to load fees", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [childId]);

  // The receipt PDF route is +Student/Parent-gated; fetch through the authed client so the
  // bearer token rides along (a raw window.open would be unauthenticated -> 401).
  const downloadReceipt = async (id: string) => {
    try {
      const res = await api.get(`/fees/receipts/${id}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      window.open(url, "_blank");
    } catch (e) {
      console.error("Failed to open receipt", e);
      alert("Couldn't open the receipt. Please try again.");
    }
  };

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
          <h2 className="text-2xl font-bold text-ink">Fees &amp; Payments</h2>
          <p className="text-ink-muted mt-1">Your child's fee breakdown and receipts.</p>
        </div>
        <ChildPicker students={students} childId={childId} onChange={setChildId} />
      </div>

      {error ? (
        <div className="bg-surface-card rounded-card border border-border p-8 text-center text-red-600">
          Couldn't load fees. Please try again.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-8 rounded-card text-white shadow-lg shadow-red-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-20">
                <Clock className="w-24 h-24" />
              </div>
              <p className="text-red-100 font-bold mb-2 uppercase tracking-wider text-sm">Outstanding Balance</p>
              <p className="text-5xl font-bold">{loading ? "…" : inr(summary.balance)}</p>
            </div>
            <div className="bg-surface-card p-8 rounded-card border border-border shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <DollarSign className="w-24 h-24 text-emerald-600" />
              </div>
              <p className="text-ink-muted font-bold mb-2 uppercase tracking-wider text-sm">Total Paid</p>
              <p className="text-5xl font-bold text-ink">{loading ? "…" : inr(summary.total_paid)}</p>
            </div>
          </div>

          <div className="bg-surface-card rounded-card shadow-sm border border-border overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-ink">Fee Schedule</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface/50">
                  {["Fee Head", "Due Date", "Amount", "Paid", "Balance", "Status"].map((h) => (
                    <th key={h} className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dues.map((d) => (
                  <tr key={d.id} className={`hover:bg-surface ${d.status !== "Paid" ? "bg-red-50/20" : ""}`}>
                    <td className="p-4 font-bold text-ink">{d.head}</td>
                    <td className="p-4 text-ink-muted">{fmt(d.due_date)}</td>
                    <td className="p-4 text-ink font-bold">{inr(d.net_due_amount)}</td>
                    <td className="p-4 text-ink-muted">{inr(d.amount_paid)}</td>
                    <td className="p-4 font-bold text-ink">{inr(d.balance)}</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          d.status === "Paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : d.status === "Partial"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && dues.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-ink-muted">No fee schedule found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-surface-card rounded-card shadow-sm border border-border overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold text-ink">Payment Receipts</h3>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface/50">
                  {["Receipt No", "Date", "Mode", "Amount", ""].map((h, i) => (
                    <th key={i} className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-surface">
                    <td className="p-4 font-bold text-ink flex items-center gap-2">
                      <FileText className="w-4 h-4 text-ink-faint" />
                      {r.receipt_number}
                    </td>
                    <td className="p-4 text-ink-muted">{fmt(r.payment_date)}</td>
                    <td className="p-4 text-ink-muted">{r.payment_mode}</td>
                    <td className="p-4 font-bold text-emerald-600">{inr(r.total_amount)}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => downloadReceipt(r.id)}
                        className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1 bg-primary-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && receipts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-ink-muted">No receipts yet.</td>
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

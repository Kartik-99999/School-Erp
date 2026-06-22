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
    return (
      <div className="max-w-5xl mx-auto py-24 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium animate-pulse">Loading fees data...</p>
      </div>
    );
  if (childrenError)
    return (
      <div className="max-w-5xl mx-auto py-24 px-4">
        <div className="bg-rose-50 border border-rose-200 text-rose-600 p-8 rounded-2xl text-center max-w-md mx-auto shadow-sm">
          <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold">!</span>
          </div>
          <h3 className="text-lg font-bold mb-2">Connection Error</h3>
          <p>Couldn't load your children. Please try again.</p>
        </div>
      </div>
    );
  if (students.length === 0)
    return (
      <div className="max-w-5xl mx-auto py-24 px-4">
        <div className="bg-gray-50 border border-gray-200 text-gray-600 p-8 rounded-2xl text-center max-w-md mx-auto shadow-sm">
          <div className="w-12 h-12 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
             <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold mb-2">No Students Found</h3>
          <p>No students are linked to your account yet.</p>
        </div>
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
             <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Fees &amp; Payments</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your child's fee breakdown and receipts.</p>
          </div>
        </div>
        <div className="min-w-[200px]">
          <ChildPicker students={students} childId={childId} onChange={setChildId} />
        </div>
      </div>

      {error ? (
        <div className="bg-rose-50 rounded-2xl border border-rose-200 p-8 text-center text-rose-600 shadow-sm">
          <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-xl font-bold">!</span>
          </div>
          <h3 className="text-lg font-bold mb-2">Failed to load fees</h3>
          <p>We couldn't fetch the fee information. Please try refreshing.</p>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-red-500 to-red-600 p-8 rounded-2xl text-white shadow-[0_8px_30px_rgb(225,29,72,0.3)] border border-red-400/30 transition-transform duration-300 hover:-translate-y-1 group">
              <div className="absolute -right-6 -top-6 text-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">
                <Clock className="w-40 h-40" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-red-50 font-semibold tracking-wide text-sm uppercase">Outstanding Balance</p>
                </div>
                <p className="text-5xl font-extrabold tracking-tight mt-2 drop-shadow-sm">{loading ? "…" : inr(summary.balance)}</p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-transform duration-300 hover:-translate-y-1 group">
              <div className="absolute -right-6 -top-6 text-emerald-500/5 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12">
                <DollarSign className="w-40 h-40" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-semibold tracking-wide text-sm uppercase">Total Paid</p>
                </div>
                <p className="text-5xl font-extrabold tracking-tight mt-2 text-gray-900 dark:text-white">{loading ? "…" : inr(summary.total_paid)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Fee Schedule</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {["Fee Head", "Due Date", "Amount", "Paid", "Balance", "Status"].map((h) => (
                      <th key={h} className="px-8 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {dues.map((d) => (
                    <tr key={d.id} className={`group transition-colors duration-200 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 ${d.status !== "Paid" ? "bg-rose-50/30 dark:bg-rose-900/10" : ""}`}>
                      <td className="px-8 py-5 font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{d.head}</td>
                      <td className="px-8 py-5 text-gray-500 dark:text-gray-400">{fmt(d.due_date)}</td>
                      <td className="px-8 py-5 text-gray-900 dark:text-white font-medium">{inr(d.net_due_amount)}</td>
                      <td className="px-8 py-5 text-gray-500 dark:text-gray-400">{inr(d.amount_paid)}</td>
                      <td className="px-8 py-5 font-bold text-gray-900 dark:text-white">{inr(d.balance)}</td>
                      <td className="px-8 py-5">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                            d.status === "Paid"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                              : d.status === "Partial"
                                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                                : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                          }`}
                        >
                          {d.status === "Paid" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>}
                          {d.status === "Partial" && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>}
                          {d.status !== "Paid" && d.status !== "Partial" && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>}
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!loading && dues.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/30">
                        <div className="flex flex-col items-center justify-center">
                          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                          <p className="text-lg font-medium text-gray-900 dark:text-white">No fee schedule found</p>
                          <p className="text-sm mt-1">You're all caught up!</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/30">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                          <p className="text-sm font-medium animate-pulse">Loading fee schedule...</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payment Receipts</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {["Receipt No", "Date", "Mode", "Amount", ""].map((h, i) => (
                      <th key={i} className="px-8 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {receipts.map((r) => (
                    <tr key={r.id} className="group transition-colors duration-200 hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                      <td className="px-8 py-5 font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-500/10 dark:group-hover:text-blue-400 transition-colors">
                          <FileText className="w-4 h-4" />
                        </div>
                        {r.receipt_number}
                      </td>
                      <td className="px-8 py-5 text-gray-500 dark:text-gray-400">{fmt(r.payment_date)}</td>
                      <td className="px-8 py-5 text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                          {r.payment_mode}
                        </span>
                      </td>
                      <td className="px-8 py-5 font-bold text-emerald-600 dark:text-emerald-400">{inr(r.total_amount)}</td>
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={() => downloadReceipt(r.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                        >
                          <Download className="w-4 h-4" /> 
                          <span>Download</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && receipts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/30">
                         <div className="flex flex-col items-center justify-center">
                          <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                          <p className="text-lg font-medium text-gray-900 dark:text-white">No receipts yet</p>
                          <p className="text-sm mt-1">Payments you make will appear here.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/30">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                          <p className="text-sm font-medium animate-pulse">Loading receipts...</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

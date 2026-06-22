"use client";
import React, { useEffect, useState } from "react";
import { CheckSquare, XSquare, AlertCircle, Percent, Calendar as CalendarIcon, Clock, Activity, ShieldCheck } from "lucide-react";
import { getMyAttendance } from "@/lib/api/studentPortal";

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
    Present: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Absent: "bg-red-50 text-red-700 border-red-200",
    Late: "bg-amber-50 text-amber-700 border-amber-200",
    "Half Day": "bg-primary-50 text-primary-700 border-primary-200",
    "Medical Leave": "bg-purple-50 text-purple-700 border-purple-200",
  };
  return map[status] || "bg-surface text-ink-muted border-border";
};

export default function AttendancePage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>({
    present: 0,
    absent: 0,
    late: 0,
    half_day: 0,
    total: 0,
    percentage: 0,
  });
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyAttendance();
        setSummary(res.data.summary || {});
        setRecords(res.data.records || []);
      } catch (e) {
        console.error("Failed to load attendance", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    {
      label: "Attendance Rate",
      value: `${summary.percentage ?? 0}%`,
      icon: Activity,
      color: "text-primary-600 bg-primary-50 ring-primary-100",
      accent: "bg-primary-600",
    },
    {
      label: "Days Present",
      value: summary.present ?? 0,
      icon: ShieldCheck,
      color: "text-emerald-600 bg-emerald-50 ring-emerald-100",
      accent: "bg-emerald-500",
    },
    { 
      label: "Days Absent", 
      value: summary.absent ?? 0, 
      icon: XSquare, 
      color: "text-red-600 bg-red-50 ring-red-100",
      accent: "bg-red-500",
    },
    {
      label: "Late / Half Day",
      value: (summary.late ?? 0) + (summary.half_day ?? 0),
      icon: Clock,
      color: "text-amber-600 bg-amber-50 ring-amber-100",
      accent: "bg-amber-500",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-ink tracking-tight flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-primary-500" />
            My Attendance
          </h2>
          <p className="text-ink-muted mt-2 text-base max-w-2xl">
            Keep track of your day-wise attendance records for the academic year.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-surface-card p-6 rounded-card border border-border shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"
          >
            <div className={`absolute top-0 left-0 w-1 h-full ${c.accent} opacity-50 group-hover:opacity-100 transition-opacity`} />
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ring-1 ${c.color} shadow-sm group-hover:scale-110 transition-transform duration-300`}
            >
              <c.icon className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <p className="text-4xl font-bold text-ink tracking-tight">
              {loading ? <span className="animate-pulse text-border">…</span> : c.value}
            </p>
            <p className="text-sm font-semibold text-ink-muted mt-1 tracking-wide uppercase">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-card rounded-card shadow-sm border border-border overflow-hidden flex flex-col relative min-h-[400px]">
        <div className="p-6 md:p-8 border-b border-border bg-gradient-to-r from-surface-card to-surface/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-ink flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-500" />
                Daily Log
              </h3>
              <p className="text-sm text-ink-muted mt-1 font-medium">{summary.total ?? 0} marked days in total</p>
            </div>
          </div>
        </div>
        
        {loading ? (
           <div className="flex-1 flex flex-col items-center justify-center p-12">
             <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
             <p className="text-ink-muted font-medium animate-pulse">Loading attendance records…</p>
           </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-surface/50 border-b border-border">
                  <th className="p-5 text-xs font-bold text-ink-muted uppercase tracking-wider w-48">
                    Date
                  </th>
                  <th className="p-5 text-xs font-bold text-ink-muted uppercase tracking-wider w-40">
                    Status
                  </th>
                  <th className="p-5 text-xs font-bold text-ink-muted uppercase tracking-wider">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r, i) => (
                  <tr key={i} className="hover:bg-surface/50 transition-colors group">
                    <td className="p-5 text-ink font-medium whitespace-nowrap">
                      {fmt(r.date)}
                    </td>
                    <td className="p-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${badge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-5 text-ink-muted text-sm">
                      {r.remarks ? (
                        <span className="group-hover:text-ink transition-colors">{r.remarks}</span>
                      ) : (
                        <span className="text-border">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && records.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4">
                          <CalendarIcon className="w-8 h-8 text-ink-muted/50" />
                        </div>
                        <p className="text-ink font-medium text-lg">No Records Found</p>
                        <p className="text-ink-muted mt-1">No attendance has been marked for you yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

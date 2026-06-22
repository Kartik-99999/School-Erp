"use client";
import React from "react";
import { X, Award, FileText } from "lucide-react";

// Shared report-card modal: renders the per-subject marks table + summary for one exam.
// `card` is the /student-portal/report-cards/{exam_id} payload (exam, student, subjects, summary).
export default function ReportCardModal({
  card,
  loading,
  onClose,
}: {
  card: any | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!loading && !card) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-surface-card rounded-card border border-border shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && !card ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
            <p className="text-ink-muted font-medium animate-pulse">Loading report card details…</p>
          </div>
        ) : (
          <>
            <div className="p-6 md:p-8 border-b border-border bg-gradient-to-r from-surface-card to-surface/50 relative overflow-hidden rounded-t-[calc(var(--radius-card)-1px)]">
              <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
                <Award className="w-48 h-48 text-primary-600" />
              </div>
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-ink mb-2 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary-600" />
                    {card.exam?.name}
                  </h3>
                  <p className="text-sm text-ink-muted font-medium flex items-center gap-2">
                    <span className="text-ink">{card.student?.name}</span>
                    {card.student?.class_name && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>Class {card.student.class_name}</span>
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-surface hover:bg-surface-hover text-ink-muted hover:text-ink transition-colors border border-border shadow-sm"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
              <div className="rounded-card border border-border shadow-sm overflow-hidden mb-8 bg-surface-card">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface border-b border-border">
                    <tr>
                      <th className="font-bold text-ink-muted px-5 py-3 tracking-wide">Subject</th>
                      <th className="text-center font-bold text-ink-muted px-5 py-3 tracking-wide w-24">Max</th>
                      <th className="text-center font-bold text-ink-muted px-5 py-3 tracking-wide w-32">Obtained</th>
                      <th className="text-center font-bold text-ink-muted px-5 py-3 tracking-wide w-24">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(card.subjects || []).map((s: any) => (
                      <tr key={s.subject_id} className="hover:bg-surface/50 transition-colors group">
                        <td className="px-5 py-3.5 text-ink font-medium">{s.subject_name}</td>
                        <td className="px-5 py-3.5 text-center text-ink-muted">{s.max_marks}</td>
                        <td
                          className={`px-5 py-3.5 text-center font-medium ${
                            s.is_absent ? "text-red-600 bg-red-50/50" : "text-ink"
                          }`}
                        >
                          {s.is_absent ? "AB" : s.obtained ?? "—"}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded bg-surface border border-border text-primary-700 font-bold shadow-sm group-hover:bg-primary-50 group-hover:border-primary-100 transition-colors">
                            {s.grade || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-surface rounded-card p-5 border border-border flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-shadow">
                  <span className="text-ink-muted text-xs font-bold uppercase tracking-wider mb-1.5">Total Marks</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-ink">{card.summary?.obtained_marks}</span>
                    <span className="text-ink-muted text-sm font-medium">/ {card.summary?.total_marks}</span>
                  </div>
                </div>
                <div className="bg-surface rounded-card p-5 border border-border flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-shadow">
                  <span className="text-ink-muted text-xs font-bold uppercase tracking-wider mb-1.5">Percentage</span>
                  <span className="text-2xl font-bold text-primary-600">{card.summary?.percentage}%</span>
                </div>
                {card.summary?.grade && (
                  <div className="bg-surface rounded-card p-5 border border-border flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-ink-muted text-xs font-bold uppercase tracking-wider mb-1.5">Grade</span>
                    <span className="text-2xl font-bold text-ink">{card.summary.grade}</span>
                  </div>
                )}
                {card.summary?.rank != null && (
                  <div className="bg-surface rounded-card p-5 border border-border flex flex-col justify-center items-center text-center shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute -right-3 -bottom-3 opacity-[0.03] group-hover:scale-110 group-hover:opacity-10 transition-all duration-300 pointer-events-none">
                      <Award className="w-16 h-16 text-primary-600" />
                    </div>
                    <span className="text-ink-muted text-xs font-bold uppercase tracking-wider mb-1.5 relative z-10">Rank</span>
                    <span className="text-2xl font-bold text-ink relative z-10">#{card.summary.rank}</span>
                  </div>
                )}
                {card.summary?.status && (
                  <div className={`col-span-2 md:col-span-full rounded-card p-5 border flex items-center justify-between shadow-sm ${
                    card.summary.status.toLowerCase() === 'pass' || card.summary.status.toLowerCase() === 'promoted'
                      ? 'bg-emerald-50 border-emerald-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <span className={`text-sm font-bold uppercase tracking-wider ${
                      card.summary.status.toLowerCase() === 'pass' || card.summary.status.toLowerCase() === 'promoted'
                        ? 'text-emerald-700' 
                        : 'text-red-700'
                    }`}>Final Result</span>
                    <span className={`text-xl font-bold tracking-wide ${
                      card.summary.status.toLowerCase() === 'pass' || card.summary.status.toLowerCase() === 'promoted'
                        ? 'text-emerald-700' 
                        : 'text-red-700'
                    }`}>{card.summary.status}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

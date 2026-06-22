"use client";
import React from "react";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-card rounded-card border border-border shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && !card ? (
          <p className="text-ink-muted text-center py-8">Loading report card…</p>
        ) : (
          <>
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-xl font-bold text-ink">{card.exam?.name}</h3>
              <button
                onClick={onClose}
                className="text-ink-muted hover:text-ink text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-ink-muted mb-5">
              {card.student?.name}
              {card.student?.class_name ? ` · Class ${card.student.class_name}` : ""}
            </p>

            <div className="rounded-card border border-border overflow-hidden mb-5">
              <table className="w-full text-sm">
                <thead className="bg-surface text-ink-muted">
                  <tr>
                    <th className="text-left font-semibold px-4 py-2">Subject</th>
                    <th className="text-center font-semibold px-3 py-2">Max</th>
                    <th className="text-center font-semibold px-3 py-2">Obtained</th>
                    <th className="text-center font-semibold px-3 py-2">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {(card.subjects || []).map((s: any) => (
                    <tr key={s.subject_id} className="border-t border-border">
                      <td className="px-4 py-2 text-ink font-medium">{s.subject_name}</td>
                      <td className="px-3 py-2 text-center text-ink">{s.max_marks}</td>
                      <td
                        className={`px-3 py-2 text-center ${s.is_absent ? "text-red-600" : "text-ink"}`}
                      >
                        {s.is_absent ? "AB" : (s.obtained ?? "—")}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-primary-700">
                        {s.grade || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-card border border-border divide-y divide-border">
              <div className="flex justify-between px-4 py-3">
                <span className="text-ink-muted text-sm">Total</span>
                <span className="text-ink font-bold text-sm">
                  {card.summary?.obtained_marks} / {card.summary?.total_marks}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-ink-muted text-sm">Percentage</span>
                <span className="text-ink font-bold text-sm">{card.summary?.percentage}%</span>
              </div>
              {card.summary?.grade && (
                <div className="flex justify-between px-4 py-3">
                  <span className="text-ink-muted text-sm">Grade</span>
                  <span className="text-ink font-bold text-sm">{card.summary.grade}</span>
                </div>
              )}
              {card.summary?.rank != null && (
                <div className="flex justify-between px-4 py-3">
                  <span className="text-ink-muted text-sm">Rank</span>
                  <span className="text-ink font-bold text-sm">#{card.summary.rank}</span>
                </div>
              )}
              {card.summary?.status && (
                <div className="flex justify-between px-4 py-3">
                  <span className="text-ink-muted text-sm">Result</span>
                  <span className="text-ink font-bold text-sm">{card.summary.status}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

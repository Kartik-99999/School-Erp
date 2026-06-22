"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { GraduationCap, FileText } from "lucide-react";
import { useSession } from "next-auth/react";

export default function ExamsPage() {
  const { data: session } = useSession();
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [card, setCard] = useState<any>(null);
  const [cardLoading, setCardLoading] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const profileRes = await api.get("/students/me");
        const profile = profileRes.data.data;
        setStudentProfile(profile);

        if (!profile?.current_class_id) {
          setLoading(false);
          return;
        }

        const examsRes = await api.get(`/exams?class_id=${profile.current_class_id}`);
        setExams(examsRes.data.data || []);

        try {
          const resultsRes = await api.get("/exams/student/me/results");
          setResults(resultsRes.data.data || []);
        } catch (e) {
          console.error("Results fetch error", e);
        }
      } catch (err) {
        console.error("Failed to fetch exams data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  // Students are (correctly) blocked from the staff report-card PDF route, so fetch the
  // ownership-scoped portal JSON and render it inline (mirrors the mobile ReportCardScreen).
  const handleViewReportCard = async (examId: string) => {
    setCard(null);
    setCardLoading(true);
    try {
      const res = await api.get(`/student-portal/report-cards/${examId}`);
      setCard(res.data.data);
    } catch (err) {
      console.error("Failed to load report card", err);
      alert("Report card isn't available yet. Results may not be published.");
    } finally {
      setCardLoading(false);
    }
  };

  const closeCard = () => {
    setCard(null);
    setCardLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-surface-card rounded-card p-8 shadow-sm border border-border">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-ink">Exams & Results</h2>
            <p className="text-ink-muted mt-1">View your exams and report cards.</p>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-surface rounded-card"></div>
            <div className="h-20 bg-surface rounded-card"></div>
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-12 text-ink-muted">
            No exams scheduled for your class yet.
          </div>
        ) : (
          <div className="space-y-4">
            {exams.map((exam, idx) => {
              const result = results.find((r) => r.exam_id === exam.id);
              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-card border border-border hover:shadow-md transition-all gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-ink-muted shrink-0">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-ink">{exam.name}</h4>
                      <p className="text-sm text-ink-muted">
                        {new Date(exam.start_date).toLocaleDateString()} -{" "}
                        {new Date(exam.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-8 justify-between sm:justify-end">
                    {result ? (
                      <>
                        <div className="text-right">
                          <p className="text-sm text-ink-muted font-medium">Result</p>
                          <p
                            className={`font-bold ${result.status === "Pass" ? "text-emerald-600" : "text-red-600"}`}
                          >
                            {result.status}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-ink-muted font-medium">Percentage</p>
                          <p className="font-bold text-ink">{result.percentage}%</p>
                        </div>
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold bg-primary-50 text-primary-700 shrink-0">
                          {result.grade}
                        </div>
                        <button
                          onClick={() => handleViewReportCard(exam.id)}
                          className="flex items-center gap-2 px-4 py-3 bg-surface hover:bg-surface text-ink rounded-xl transition-colors shrink-0 font-medium text-sm"
                          title="View Report Card"
                        >
                          <FileText className="w-5 h-5" /> Report card
                        </button>
                      </>
                    ) : (
                      <div className="px-4 py-2 bg-amber-50 text-amber-700 font-medium rounded-xl text-sm border border-amber-100">
                        Results Pending
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(cardLoading || card) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeCard}
        >
          <div
            className="bg-surface-card rounded-card border border-border shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {cardLoading && !card ? (
              <p className="text-ink-muted text-center py-8">Loading report card…</p>
            ) : (
              <>
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-xl font-bold text-ink">{card.exam?.name}</h3>
                  <button
                    onClick={closeCard}
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
      )}
    </div>
  );
}

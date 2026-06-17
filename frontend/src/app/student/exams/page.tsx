"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { GraduationCap, FileText, Download } from "lucide-react";
import { useSession } from "next-auth/react";

export default function ExamsPage() {
  const { data: session } = useSession();
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState<any>(null);

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

  const handleDownloadReportCard = async (examId: string) => {
    if (!studentProfile?.id) return;
    try {
      const res = await api.get(`/exams/${examId}/report-card/${studentProfile.id}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `report_card_${examId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download report card", err);
      alert("Failed to download report card. Result might not be published yet.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-surface-card rounded-card p-8 shadow-sm border border-border">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-ink">Exams & Results</h2>
            <p className="text-ink-muted mt-1">View your exams and download report cards.</p>
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
                          onClick={() => handleDownloadReportCard(exam.id)}
                          className="p-3 bg-surface hover:bg-surface text-ink rounded-xl transition-colors shrink-0"
                          title="Download Report Card"
                        >
                          <Download className="w-5 h-5" />
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
    </div>
  );
}

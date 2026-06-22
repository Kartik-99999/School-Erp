"use client";
import React, { useEffect, useState } from "react";
import { GraduationCap, FileText } from "lucide-react";
import { getReportCards, getReportCard } from "@/lib/api/studentPortal";
import { useChildren, ChildPicker } from "@/components/parent/ChildPicker";
import ReportCardModal from "@/components/exams/ReportCardModal";

export default function ParentExamsPage() {
  const { students, childId, setChildId, loading: childrenLoading, error: childrenError } = useChildren();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [card, setCard] = useState<any>(null);
  const [cardLoading, setCardLoading] = useState(false);

  useEffect(() => {
    if (!childId) return;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const res = await getReportCards(childId);
        setList(res.data || []);
      } catch (e) {
        console.error("Failed to load report cards", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [childId]);

  const view = async (examId: string) => {
    setCard(null);
    setCardLoading(true);
    try {
      const res = await getReportCard(examId, childId);
      setCard(res.data);
    } catch (e) {
      console.error("Failed to load report card", e);
      alert("Report card isn't available yet. Results may not be published.");
    } finally {
      setCardLoading(false);
    }
  };
  const closeCard = () => {
    setCard(null);
    setCardLoading(false);
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
          <h2 className="text-2xl font-bold text-ink">Report Cards</h2>
          <p className="text-ink-muted mt-1">Published exam results for your child.</p>
        </div>
        <ChildPicker students={students} childId={childId} onChange={setChildId} />
      </div>

      <div className="bg-surface-card rounded-card p-6 shadow-sm border border-border">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-surface rounded-card" />
            <div className="h-20 bg-surface rounded-card" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">Couldn't load report cards. Please try again.</div>
        ) : list.length === 0 ? (
          <div className="text-center py-12 text-ink-muted">No published results yet.</div>
        ) : (
          <div className="space-y-4">
            {list.map((r) => (
              <div
                key={r.exam_id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-card border border-border hover:shadow-md transition-all gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-ink-muted shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-ink">{r.exam_name}</h4>
                    <p className="text-sm text-ink-muted">
                      {r.status} · {r.percentage}%{r.rank != null ? ` · Rank #${r.rank}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-8 justify-between sm:justify-end">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold bg-primary-50 text-primary-700 shrink-0">
                    {r.grade}
                  </div>
                  <button
                    onClick={() => view(r.exam_id)}
                    className="flex items-center gap-2 px-4 py-3 bg-surface hover:bg-surface text-ink rounded-xl transition-colors shrink-0 font-medium text-sm"
                    title="View Report Card"
                  >
                    <FileText className="w-5 h-5" /> Report card
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ReportCardModal card={card} loading={cardLoading} onClose={closeCard} />
    </div>
  );
}

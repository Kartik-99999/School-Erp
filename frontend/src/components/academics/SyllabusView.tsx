"use client";
import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

export interface SyllabusChapter {
  id: string;
  chapter_name: string;
  description?: string | null;
  completed: boolean;
}
export interface SyllabusSubject {
  subject_id: string;
  subject_name: string;
  total: number;
  completed: number;
  percent: number;
  chapters: SyllabusChapter[];
}
export interface Syllabus {
  subjects: SyllabusSubject[];
  overall: { total: number; completed: number; percent: number };
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
      <div
        className="h-full bg-primary-600 rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

// Presentational only — the page owns data fetching (student self vs parent child).
export default function SyllabusView({
  data,
  loading,
  error,
  onRetry,
}: {
  data: Syllabus | null;
  loading: boolean;
  error: boolean;
  onRetry?: () => void;
}) {
  if (loading) return <div className="py-16 text-center text-ink-muted">Loading…</div>;
  if (error)
    return (
      <div className="bg-surface-card rounded-card border border-border p-8 text-center text-red-600">
        Couldn't load the syllabus.
        {onRetry ? (
          <button onClick={onRetry} className="ml-2 underline font-medium">
            Retry
          </button>
        ) : null}
      </div>
    );
  if (!data || data.subjects.length === 0)
    return (
      <div className="bg-surface-card rounded-card border border-border p-12 text-center text-ink-muted">
        No syllabus has been published yet.
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="bg-surface-card rounded-card border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-ink">Overall progress</h3>
          <span className="text-sm font-bold text-ink">
            {data.overall.completed}/{data.overall.total} chapters · {data.overall.percent}%
          </span>
        </div>
        <ProgressBar percent={data.overall.percent} />
      </div>

      {data.subjects.map((s) => (
        <div
          key={s.subject_id}
          className="bg-surface-card rounded-card border border-border shadow-sm overflow-hidden"
        >
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-ink">{s.subject_name}</h4>
              <span className="text-sm text-ink-muted">
                {s.completed}/{s.total} · {s.percent}%
              </span>
            </div>
            <ProgressBar percent={s.percent} />
          </div>
          <ul className="divide-y divide-border">
            {s.chapters.map((c) => (
              <li key={c.id} className="flex items-start gap-3 p-4">
                {c.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-ink-faint shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-medium ${c.completed ? "text-ink" : "text-ink-muted"}`}>
                    {c.chapter_name}
                  </p>
                  {c.description ? (
                    <p className="text-sm text-ink-muted mt-0.5">{c.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

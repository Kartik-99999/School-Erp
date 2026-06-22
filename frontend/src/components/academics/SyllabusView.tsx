"use client";
import React from "react";
import { CheckCircle2, Circle, BookOpen, Layers, RefreshCw } from "lucide-react";

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
    <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/30">
      <div
        className="h-full bg-primary-500 rounded-full transition-all duration-1000 ease-out relative"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      >
        <div className="absolute inset-0 bg-white/20" style={{ transform: "skewX(-20deg) translateX(-10px)" }} />
      </div>
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
  if (loading)
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-ink-muted font-medium animate-pulse">Loading syllabus details…</p>
      </div>
    );

  if (error)
    return (
      <div className="bg-red-50 rounded-card border border-red-100 p-8 text-center flex flex-col items-center justify-center shadow-sm">
        <p className="text-red-700 font-medium mb-3">We couldn't load your syllabus right now.</p>
        {onRetry ? (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-lg font-medium border border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        ) : null}
      </div>
    );

  if (!data || data.subjects.length === 0)
    return (
      <div className="bg-surface-card rounded-card border border-border p-16 text-center shadow-sm">
        <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-8 h-8 text-ink-muted" />
        </div>
        <p className="text-ink font-medium text-lg">No Syllabus Available</p>
        <p className="text-ink-muted mt-1">Check back later when teachers have published the syllabus.</p>
      </div>
    );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-surface-card rounded-card border border-border shadow-sm p-6 relative overflow-hidden group hover:border-primary-200 transition-colors">
        <div className="absolute -top-4 -right-4 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-700 transform group-hover:scale-110">
          <Layers className="w-32 h-32 text-primary-600" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-ink flex items-center gap-2">
              <Layers className="w-6 h-6 text-primary-500" />
              Overall Progress
            </h3>
            <span className="px-4 py-1.5 bg-surface rounded-full text-sm font-bold text-primary-600 shadow-sm border border-border/50 flex items-center gap-1.5">
              {data.overall.percent}%<span className="font-medium text-ink-muted">Complete</span>
            </span>
          </div>
          <div className="flex justify-between text-sm text-ink-muted mb-2 font-medium px-1">
            <span>{data.overall.completed} Chapters finished</span>
            <span>{data.overall.total} Total chapters</span>
          </div>
          <ProgressBar percent={data.overall.percent} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.subjects.map((s) => (
          <div
            key={s.subject_id}
            className="bg-surface-card rounded-card border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col"
          >
            <div className="p-5 border-b border-border bg-gradient-to-br from-surface-card to-surface/30 group-hover:to-primary-50/10 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-ink flex items-center gap-2 text-lg">
                  <BookOpen className="w-5 h-5 text-primary-500" />
                  {s.subject_name}
                </h4>
                <span className="text-sm font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md border border-primary-100 shadow-sm">
                  {s.percent}%
                </span>
              </div>
              <div className="flex justify-between text-xs text-ink-muted mb-2 font-medium px-0.5">
                <span>{s.completed} of {s.total} completed</span>
              </div>
              <ProgressBar percent={s.percent} />
            </div>
            <ul className="divide-y divide-border/50 overflow-y-auto max-h-[350px] flex-1 custom-scrollbar">
              {s.chapters.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-3 p-4 hover:bg-surface/50 transition-colors group/item"
                >
                  {c.completed ? (
                    <div className="relative">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5 relative z-10" />
                      <div className="absolute inset-0 bg-emerald-400 blur-sm opacity-20 z-0 rounded-full" />
                    </div>
                  ) : (
                    <Circle className="w-5 h-5 text-ink-muted/30 shrink-0 mt-0.5 group-hover/item:text-primary-300 transition-colors" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`font-medium transition-colors ${
                        c.completed ? "text-ink" : "text-ink-muted group-hover/item:text-ink"
                      }`}
                    >
                      {c.chapter_name}
                    </p>
                    {c.description ? (
                      <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                        {c.description}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}


"use client";
import React from "react";
import { BookOpen, FileText } from "lucide-react";

export default function TeacherAssignmentsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink">Assignments & Grading</h2>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-colors">
          + Create New
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[].map((assignment: any, idx: number) => (
          <div
            key={idx}
            className="bg-surface-card p-6 rounded-card shadow-sm border border-border hover:border-primary-100 transition-colors group"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-ink leading-tight mb-1">
                    {assignment.title}
                  </h3>
                  <span className="text-xs font-bold px-2 py-1 bg-surface text-ink-muted rounded-md">
                    {assignment.class}
                  </span>
                </div>
                <p className="text-sm text-ink-muted">Due: {assignment.dueDate}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Submitted</span>
                <span className="font-bold text-ink">
                  {assignment.submitted} / {assignment.total}
                </span>
              </div>
              <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${(assignment.submitted / assignment.total) * 100}%` }}
                ></div>
              </div>

              <div className="flex justify-between text-sm pt-2">
                <span className="text-ink-muted">Graded</span>
                <span className="font-bold text-ink">
                  {assignment.graded} / {assignment.submitted}
                </span>
              </div>
              <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${(assignment.graded / (assignment.submitted || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            <button className="w-full px-4 py-3 bg-surface text-primary-600 rounded-xl text-sm font-bold hover:bg-primary-50 transition-colors">
              Grade Submissions
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

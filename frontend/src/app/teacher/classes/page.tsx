"use client";
import React from "react";
import { Users, MoreVertical } from "lucide-react";

export default function TeacherClassesPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink">My Classes</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[].map((cls: any, idx: number) => (
          <div
            key={idx}
            className="bg-surface-card p-6 rounded-card shadow-sm border border-border relative group"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-ink">{cls.name}</h3>
                  <p className="text-sm text-ink-muted">{cls.subject}</p>
                </div>
              </div>
              <button className="text-ink-faint hover:text-ink-muted">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">
                  Students
                </p>
                <p className="font-bold text-ink text-lg">{cls.students}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1">
                  Class Avg
                </p>
                <p className="font-bold text-purple-600 text-lg">{cls.avgGrade}</p>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button className="flex-1 px-4 py-2 bg-surface text-ink rounded-xl text-sm font-bold hover:bg-surface transition-colors">
                Student List
              </button>
              <button className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors">
                Class Stats
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

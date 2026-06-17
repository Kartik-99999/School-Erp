"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { BookOpen, Calendar, Book, Clock, Edit, Trash2 } from "lucide-react";

export default function AdminAcademicsPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      const res = await api.get("/academics/periods");
      setPeriods(res.data.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load academic periods");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Academics & Timetable Setup</h2>
          <p className="text-ink-muted mt-1">
            Manage periods, syllabus, and generate AI timetables.
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/admin/academics/timetable"
            className="px-4 py-2.5 bg-surface-card border border-border text-ink rounded-xl font-bold hover:bg-surface transition-colors"
          >
            Generate AI Timetable
          </a>
          <a
            href="/admin/academics/timetable"
            className="px-4 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
          >
            + Add Period
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-card p-6 rounded-card border border-border shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-16 h-16 text-primary-600" />
          </div>
          <p className="text-sm font-medium text-ink-muted mb-2">Total Daily Periods</p>
          <p className="text-3xl font-bold text-ink">{periods.length}</p>
        </div>
        <div className="bg-surface-card p-6 rounded-card border border-border shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Book className="w-16 h-16 text-primary-600" />
          </div>
          <p className="text-sm font-medium text-ink-muted mb-2">Teaching Periods</p>
          <p className="text-3xl font-bold text-primary-600">
            {periods.filter((p) => !p.is_break).length}
          </p>
        </div>
        <div className="bg-surface-card p-6 rounded-card border border-border shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Calendar className="w-16 h-16 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-ink-muted mb-2">Break / Lunch Periods</p>
          <p className="text-3xl font-bold text-emerald-600">
            {periods.filter((p) => p.is_break).length}
          </p>
        </div>
      </div>

      <div className="bg-surface-card rounded-card shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-bold text-ink">Daily Period Bell Schedule</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-ink-muted">Loading schedule...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface/50">
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Period Name
                </th>
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Start Time
                </th>
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  End Time
                </th>
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Type
                </th>
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {periods.map((p, idx) => (
                <tr key={idx} className="hover:bg-surface transition-colors">
                  <td className="p-4 font-bold text-ink">{p.name}</td>
                  <td className="p-4 text-ink-muted font-medium">{p.start_time}</td>
                  <td className="p-4 text-ink-muted font-medium">{p.end_time}</td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${p.is_break ? "text-amber-700 bg-amber-50" : "text-primary-700 bg-primary-50"}`}
                    >
                      {p.is_break ? "Break / Lunch" : "Teaching Period"}
                    </span>
                  </td>
                  <td className="p-4 flex gap-3">
                    <button className="text-ink-faint hover:text-primary-600">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="text-ink-faint hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {periods.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-ink-muted">
                    No periods found. Please set up the daily bell schedule.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

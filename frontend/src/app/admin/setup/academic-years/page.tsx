"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Calendar, CheckCircle, Clock, Search, Edit, Plus, X } from "lucide-react";

export default function AcademicYearsSetupPage() {
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    is_active: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      const res = await api.get("/academic-years/");
      setYears(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/academic-years/", formData);
      setIsModalOpen(false);
      setFormData({ name: "", start_date: "", end_date: "", is_active: false });
      fetchYears(); // Refresh the list
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || err.message || "Failed to create academic year");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Academic Years</h2>
          <p className="text-ink-muted mt-1">
            Configure academic sessions and set the active year.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" /> Add Academic Year
        </button>
      </div>

      <div className="bg-surface-card rounded-card shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">All Sessions</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-ink-muted">Loading academic years...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface/50">
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Session Name
                </th>
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Start Date
                </th>
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  End Date
                </th>
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {years.map((y, idx) => (
                <tr key={idx} className="hover:bg-surface transition-colors">
                  <td className="p-4 font-bold text-ink">{y.name}</td>
                  <td className="p-4 text-ink-muted">{y.start_date}</td>
                  <td className="p-4 text-ink-muted">{y.end_date}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold 
                      ${y.is_active ? "bg-emerald-50 text-emerald-700" : "bg-surface text-ink-muted"}`}
                    >
                      {y.is_active ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      {y.is_active ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="text-sm font-bold text-primary-600 hover:text-primary-700">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {years.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-ink-muted">
                    No academic years configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface-card rounded-card w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50">
              <h3 className="text-xl font-bold text-ink">Add Academic Year</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-ink-faint hover:text-ink-muted hover:bg-surface-card rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateYear} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-ink mb-2">Session Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-2027"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface-card transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-ink mb-2">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface-card transition-all text-ink"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-ink mb-2">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface-card transition-all text-ink"
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 p-4 border border-border rounded-xl cursor-pointer hover:bg-surface transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 border-border-strong"
                />
                <div>
                  <p className="font-bold text-ink">Set as Active Session</p>
                  <p className="text-xs text-ink-muted">
                    Make this the current default academic year.
                  </p>
                </div>
              </label>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-border text-ink-muted font-bold rounded-xl hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

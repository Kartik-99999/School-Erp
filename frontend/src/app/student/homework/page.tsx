"use client";
import React, { useEffect, useState } from "react";
import { BookOpen, Clock, Upload, CheckCircle, FileText, AlertCircle, X } from "lucide-react";
import api from "@/lib/axios";

export default function HomeworkPage() {
  const [activeTab, setActiveTab] = useState("Pending");
  const [selectedHw, setSelectedHw] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);

  const fetchHomework = async () => {
    try {
      const res = await api.get("/academics/homework/me");
      setAssignments(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch homework", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomework();
  }, []);

  const filtered = assignments.filter((a) =>
    activeTab === "Pending"
      ? a.status !== "Submitted" && a.status !== "Graded"
      : a.status === "Submitted" || a.status === "Graded"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please select a file to upload.");

    setIsSubmitting(true);
    try {
      // Create form data
      const formData = new FormData();
      formData.append("file_url", "dummy-uploaded-file-url/" + file.name); // Mock upload, in reality upload to S3 first

      await api.post(`/academics/homework/${selectedHw.id}/submit`, formData);

      await fetchHomework(); // Refresh
      setSelectedHw(null);
      setFile(null);
      setActiveTab("Submitted");
    } catch (err) {
      console.error("Failed to submit homework", err);
      alert("Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Homework & Assignments</h2>
          <p className="text-ink-muted mt-1">
            View your tasks, upload your work, and track grades.
          </p>
        </div>
        <div className="flex gap-2 bg-surface p-1 rounded-xl">
          {["Pending", "Submitted"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-sm ${
                activeTab === tab
                  ? "bg-surface-card text-primary-600 shadow-sm"
                  : "text-ink-muted hover:text-ink hover:bg-surface shadow-none"
              }`}
            >
              {tab}{" "}
              {tab === "Pending" &&
                `(${assignments.filter((a) => a.status !== "Submitted" && a.status !== "Graded").length})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-surface rounded-card"></div>
          <div className="h-40 bg-surface rounded-card"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((hw) => (
            <div
              key={hw.id}
              className="bg-surface-card p-6 rounded-card shadow-sm border border-border relative overflow-hidden group hover:shadow-md transition-shadow flex flex-col"
            >
              {hw.urgent && (hw.status === "Pending" || hw.status === "Assigned") && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                  Due Soon
                </div>
              )}

              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    hw.status === "Submitted" || hw.status === "Graded"
                      ? "bg-emerald-50 text-emerald-600"
                      : hw.urgent
                        ? "bg-red-50 text-red-600"
                        : "bg-primary-50 text-primary-600"
                  }`}
                >
                  {hw.status === "Submitted" || hw.status === "Graded" ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <BookOpen className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-ink leading-tight mb-1">{hw.title}</h3>
                  <p className="text-sm font-semibold text-primary-600">{hw.subject}</p>
                </div>
              </div>

              <p className="text-sm text-ink-muted mb-6 flex-1">{hw.description}</p>

              <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                {hw.status !== "Submitted" && hw.status !== "Graded" ? (
                  <>
                    <div
                      className={`flex items-center gap-1.5 text-sm font-bold ${hw.urgent ? "text-red-600" : "text-ink-muted"}`}
                    >
                      <Clock className="w-4 h-4" />
                      {hw.due}
                    </div>
                    <button
                      onClick={() => setSelectedHw(hw)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-primary-600 transition-colors shadow-sm"
                    >
                      Submit Work
                    </button>
                  </>
                ) : (
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Submitted
                      </span>
                      {hw.grade && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg text-sm">
                          Grade: {hw.grade}
                        </span>
                      )}
                    </div>
                    {hw.feedback && (
                      <p className="text-xs text-ink-muted italic bg-surface p-2 rounded-lg border border-border">
                        Teacher: "{hw.feedback}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full p-12 text-center bg-surface-card rounded-card border border-dashed border-border">
              <CheckCircle className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-ink">All caught up!</h3>
              <p className="text-ink-muted">
                You have no {activeTab.toLowerCase()} assignments right now.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Submission Modal */}
      {selectedHw && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-card shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50">
              <div>
                <h3 className="text-xl font-bold text-ink">Submit Assignment</h3>
                <p className="text-sm font-medium text-primary-600">{selectedHw.title}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedHw(null);
                  setFile(null);
                }}
                className="p-2 hover:bg-surface rounded-full text-ink-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-bold mb-1">Due: {selectedHw.due}</p>
                  <p>{selectedHw.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-ink mb-2">Upload your work</label>

                <div className="border-2 border-dashed border-border rounded-card p-8 text-center hover:bg-surface transition-colors relative cursor-pointer group">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-primary-600">{file.name}</p>
                      <p className="text-xs text-ink-muted">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-ink-muted group-hover:text-primary-600 transition-colors">
                      <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center group-hover:bg-primary-50">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="font-bold">Click to browse or drag file here</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedHw(null)}
                  className="px-5 py-2.5 text-ink-muted font-bold hover:bg-surface rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!file || isSubmitting}
                  className={`px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition-all
                    ${!file || isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:bg-primary-700"}`}
                >
                  {isSubmitting ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Submit Assignment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import {
  getClasses,
  getSectionsForClass,
  createClass,
  createSection,
  deleteClass,
  deleteSection,
  Class,
  Section,
} from "@/lib/api/setup";
import { Layers, Search, Filter, Plus, X, Trash2 } from "lucide-react";

export default function ClassesSetupPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Forms
  const [className, setClassName] = useState("");
  const [classLevel, setClassLevel] = useState("Primary");
  const [classNumeric, setClassNumeric] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const classesRes = await getClasses();
      const classesList = classesRes.data || [];
      const enrichedClasses = await Promise.all(
        classesList.map(async (cls) => {
          const secRes = await getSectionsForClass(cls.id);
          const sections = secRes.data || [];
          sections.sort((a, b) => a.name.localeCompare(b.name));
          return { ...cls, sections };
        })
      );
      // Sort by level, then by numeric value, then by name
      enrichedClasses.sort((a, b) => {
        const levelA = a.level || "Uncategorized";
        const levelB = b.level || "Uncategorized";
        if (levelA !== levelB) {
          return levelA.localeCompare(levelB);
        }
        const valA = a.numeric_value ?? parseInt(a.name.replace(/\D/g, "")) ?? 0;
        const valB = b.numeric_value ?? parseInt(b.name.replace(/\D/g, "")) ?? 0;
        if (valA !== valB) {
          return valA - valB;
        }
        return a.name.localeCompare(b.name);
      });
      setClasses(enrichedClasses);
    } catch (err) {
      console.error(err);
      alert("Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createClass({
        name: className,
        level: classLevel,
        numeric_value: parseInt(classNumeric) || 0,
      });
      setIsClassModalOpen(false);
      setClassName("");
      setClassLevel("Primary");
      setClassNumeric("");
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create class");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;
    setSubmitting(true);
    try {
      await createSection(selectedClassId, { name: sectionName, class_id: selectedClassId });
      setIsSectionModalOpen(false);
      setSectionName("");
      setSelectedClassId(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create section");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this class? This will also delete all its sections and associated data."
      )
    )
      return;
    try {
      await deleteClass(id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete class");
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return;
    try {
      await deleteSection(id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete section");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Classes & Sections</h2>
          <p className="text-ink-muted mt-1">
            Configure class structures and corresponding sections.
          </p>
        </div>
        <button
          onClick={() => setIsClassModalOpen(true)}
          className="px-4 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-sm"
        >
          + Add Class
        </button>
      </div>

      <div className="bg-surface-card rounded-card shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search class..."
              className="pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-ink-muted">Loading classes...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface/50">
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Class Name
                </th>
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Level
                </th>
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Available Sections
                </th>
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classes.map((cls, idx) => (
                <tr key={idx} className="hover:bg-surface transition-colors">
                  <td className="p-4 font-bold text-ink">
                    {cls.name}
                    <span className="text-xs text-ink-faint font-normal ml-2">
                      (Val: {(cls.numeric_value ?? parseInt(cls.name.replace(/\D/g, ""))) || "?"})
                    </span>
                  </td>
                  <td className="p-4 text-sm text-ink-muted">{cls.level || "-"}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {cls.sections?.map((sec: any) => (
                        <span
                          key={sec.id}
                          className="px-2.5 py-1 bg-surface text-ink text-xs font-bold rounded-md border border-border flex items-center gap-1 group"
                        >
                          {sec.name}
                          <button
                            onClick={() => handleDeleteSection(sec.id)}
                            className="text-ink-faint hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {(!cls.sections || cls.sections.length === 0) && (
                        <span className="text-sm text-ink-faint">No sections added</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedClassId(cls.id);
                        setIsSectionModalOpen(true);
                      }}
                      className="text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add Section
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls.id)}
                      className="text-ink-faint hover:text-red-600"
                      title="Delete Class"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {classes.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-ink-muted">
                    No classes configured. Add your first class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Class Modal */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface-card rounded-card w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg">Add New Class</h3>
              <button
                onClick={() => setIsClassModalOpen(false)}
                className="p-1 hover:bg-surface rounded-full text-ink-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddClass} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Class Name</label>
                <input
                  required
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. Class 10"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Level</label>
                <select
                  required
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="Pre-Primary">Pre-Primary</option>
                  <option value="Primary">Primary</option>
                  <option value="Middle">Middle</option>
                  <option value="High">High</option>
                  <option value="Senior Secondary">Senior Secondary</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Numeric Level (for sorting)
                </label>
                <input
                  required
                  type="number"
                  value={classNumeric}
                  onChange={(e) => setClassNumeric(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <button
                disabled={submitting}
                type="submit"
                className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Class"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Section Modal */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-surface-card rounded-card w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg">Add Section</h3>
              <button
                onClick={() => {
                  setIsSectionModalOpen(false);
                  setSelectedClassId(null);
                }}
                className="p-1 hover:bg-surface rounded-full text-ink-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSection} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Section Name</label>
                <input
                  required
                  type="text"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="e.g. A"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <button
                disabled={submitting}
                type="submit"
                className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Section"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

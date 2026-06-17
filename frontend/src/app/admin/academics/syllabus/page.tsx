"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getClasses, getSubjects, Class, Subject, getAcademicYears } from "@/lib/api/setup";
import { getSyllabus, createSyllabusChapter } from "@/lib/api/academics";
import { Plus, Book } from "lucide-react";

export default function SyllabusPage() {
  const pathname = usePathname();

  const [activeYearId, setActiveYearId] = useState("");
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ chapter_name: "", description: "", order_index: 0 });

  useEffect(() => {
    Promise.all([getAcademicYears(), getClasses(), getSubjects()]).then(([yRes, cRes, sRes]) => {
      const active = yRes.data.find((y: any) => y.is_active);
      if (active) setActiveYearId(active.id);
      setClasses(cRes.data || []);
      setSubjects(sRes.data || []);
    });
  }, []);

  const loadSyllabus = async () => {
    if (!selectedClass || !selectedSubject) return;
    setLoading(true);
    try {
      const res = await getSyllabus(selectedClass, selectedSubject);
      setChapters(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSyllabusChapter({
        ...form,
        class_id: selectedClass,
        subject_id: selectedSubject,
        academic_year_id: activeYearId,
      });
      setIsModalOpen(false);
      setForm({ chapter_name: "", description: "", order_index: chapters.length + 1 });
      loadSyllabus();
    } catch (err) {
      alert("Failed to add chapter");
    }
  };

  return (
    <div className="pb-12">
      <div className="flex gap-4 border-b mb-6 pb-2">
        <Link
          href="/admin/academics/timetable"
          className={`font-semibold ${pathname === "/admin/academics/timetable" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Timetable
        </Link>
        <Link
          href="/admin/academics/syllabus"
          className={`font-semibold ${pathname === "/admin/academics/syllabus" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Syllabus
        </Link>
        <Link
          href="/admin/academics/homework"
          className={`font-semibold ${pathname === "/admin/academics/homework" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Homework
        </Link>
      </div>

      <PageHeader
        title="Syllabus Management"
        description="Define curriculum chapters for classes and monitor completion progress."
      />

      <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border mb-8 flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Class</label>
          <select
            className="w-full border rounded p-2"
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setChapters([]);
            }}
          >
            <option value="">Select</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Subject</label>
          <select
            className="w-full border rounded p-2"
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setChapters([]);
            }}
          >
            <option value="">Select</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={loadSyllabus}
          disabled={!selectedClass || !selectedSubject || loading}
          className="bg-gray-900 text-white px-6 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Loading..." : "View Syllabus"}
        </button>
      </div>

      {selectedClass && selectedSubject && !loading && (
        <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 bg-surface border-b flex justify-between items-center">
            <h3 className="font-bold text-ink flex items-center gap-2">
              <Book className="w-4 h-4" /> Curriculum Outline
            </h3>
            <button
              onClick={() => {
                setForm({ ...form, order_index: chapters.length + 1 });
                setIsModalOpen(true);
              }}
              className="text-sm bg-primary-600 text-white px-3 py-1.5 rounded flex items-center gap-1 hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" /> Add Chapter
            </button>
          </div>
          <div className="p-4 space-y-4">
            {chapters.length === 0 ? (
              <div className="text-center py-8 text-ink-faint border-2 border-dashed rounded-md">
                No chapters defined for this subject yet.
              </div>
            ) : (
              chapters.map((c) => (
                <div
                  key={c.id}
                  className="border rounded-lg p-4 flex gap-4 bg-surface hover:bg-surface-card transition-colors"
                >
                  <div className="w-10 h-10 bg-primary-50 text-primary-700 font-bold rounded flex items-center justify-center shrink-0">
                    {c.order_index}
                  </div>
                  <div>
                    <h4 className="font-bold text-ink">{c.chapter_name}</h4>
                    <p className="text-sm text-ink-muted mt-1">
                      {c.description || "No description provided."}
                    </p>
                    {/* Teachers log progress against sections; Admin just defines outline here */}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Syllabus Chapter</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Chapter / Unit Name</label>
                <input
                  required
                  type="text"
                  className="w-full border rounded p-2"
                  value={form.chapter_name}
                  onChange={(e) => setForm({ ...form, chapter_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description / Topics</label>
                <textarea
                  rows={3}
                  className="w-full border rounded p-2"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sequence Order</label>
                <input
                  required
                  type="number"
                  className="w-full border rounded p-2"
                  value={form.order_index}
                  onChange={(e) => setForm({ ...form, order_index: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

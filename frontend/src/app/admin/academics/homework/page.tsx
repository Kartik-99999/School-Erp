"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getClasses, getSectionsForClass, Class, Section } from "@/lib/api/setup";
import { getHomework } from "@/lib/api/academics";
import { FileText, Calendar, CheckCircle } from "lucide-react";

export default function HomeworkAdminPage() {
  const pathname = usePathname();

  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  const [homework, setHomework] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getClasses().then((res) => setClasses(res.data || []));
  }, []);

  useEffect(() => {
    if (selectedClass) {
      getSectionsForClass(selectedClass).then((res) => setSections(res.data || []));
    } else {
      setSections([]);
    }
    setSelectedSection("");
    setHomework([]);
  }, [selectedClass]);

  const loadHomework = async () => {
    if (!selectedClass || !selectedSection) return;
    setLoading(true);
    try {
      const res = await getHomework(selectedClass, selectedSection);
      setHomework(res.data || []);
    } catch (e) {
      alert("Failed to load homework");
    } finally {
      setLoading(false);
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
        title="Homework & Assignments"
        description="Monitor homework assignments given by teachers."
      />

      <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border mb-8 flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Class</label>
          <select
            className="w-full border rounded p-2"
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setHomework([]);
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
          <label className="block text-sm font-medium mb-1">Section</label>
          <select
            className="w-full border rounded p-2"
            value={selectedSection}
            onChange={(e) => {
              setSelectedSection(e.target.value);
              setHomework([]);
            }}
          >
            <option value="">Select</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={loadHomework}
          disabled={!selectedClass || !selectedSection || loading}
          className="bg-gray-900 text-white px-6 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Loading..." : "View Assignments"}
        </button>
      </div>

      {selectedClass && selectedSection && !loading && (
        <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 bg-surface border-b">
            <h3 className="font-bold text-ink">Recent Assignments</h3>
          </div>
          <div className="p-4 space-y-4">
            {homework.length === 0 ? (
              <div className="text-center py-8 text-ink-faint border-2 border-dashed rounded-md">
                No homework assignments found. (Teachers assign homework from their portal).
              </div>
            ) : (
              homework.map((hw) => (
                <div
                  key={hw.id}
                  className="border rounded-lg p-4 bg-surface-card hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg text-ink">{hw.title}</h4>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${hw.status === "Reviewed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                    >
                      {hw.status}
                    </span>
                  </div>
                  <p className="text-ink-muted text-sm mb-4">{hw.description}</p>
                  <div className="flex gap-4 text-xs font-medium text-ink-muted">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Due: {hw.due_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Assigned: {hw.created_at}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

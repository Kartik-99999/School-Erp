"use client";
import React, { useEffect, useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import api from "@/lib/axios";
import { useSession } from "next-auth/react";

interface ClassOpt {
  class_id: string;
  section_id: string;
  name: string;
}
const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

export default function TeacherHomeworkPage() {
  const { data: session } = useSession();
  const [staffId, setStaffId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [sel, setSel] = useState(""); // "class_id|section_id"
  const [subjects, setSubjects] = useState<any[]>([]);
  const [homework, setHomework] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hwLoading, setHwLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Resolve the teacher's staff record -> their class-sections (from the timetable) + active year.
  useEffect(() => {
    const uid = (session?.user as any)?.id;
    if (!uid) return;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const [staffRes, yrRes] = await Promise.all([api.get("/staff?role=Teacher"), api.get("/academic-years")]);
        const me = staffRes.data?.data?.find((t: any) => t.user_id === uid);
        const years = yrRes.data?.data || [];
        const yr = years.find((y: any) => y.is_active) || years[0];
        setAcademicYearId(yr ? String(yr.id) : "");
        if (!me) {
          setLoading(false);
          return;
        }
        setStaffId(String(me.id));
        const ttRes = await api.get(`/academics/timetable/teacher/${me.id}`);
        const byDay = ttRes.data?.data || {};
        const seen: Record<string, ClassOpt> = {};
        Object.values(byDay).forEach((slots: any) =>
          (slots || []).forEach((s: any) => {
            if (s.class_id && s.section_id) {
              const key = `${s.class_id}|${s.section_id}`;
              if (!seen[key])
                seen[key] = {
                  class_id: s.class_id,
                  section_id: s.section_id,
                  name: `${s.class_name || "Class"}${s.section_name && s.section_name !== "-" ? " - " + s.section_name : ""}`,
                };
            }
          })
        );
        const list = Object.values(seen);
        setClasses(list);
        if (list[0]) setSel(`${list[0].class_id}|${list[0].section_id}`);
      } catch (e) {
        console.error("Failed to load classes", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  // On class change, load its subjects + existing homework.
  useEffect(() => {
    if (!sel) return;
    const [classId, sectionId] = sel.split("|");
    setHwLoading(true);
    (async () => {
      try {
        const [subjRes, hwRes] = await Promise.all([
          api.get(`/classes/${classId}/subjects`),
          api.get(`/academics/homework?class_id=${classId}&section_id=${sectionId}`),
        ]);
        setSubjects(subjRes.data?.data || []);
        setHomework(hwRes.data?.data || []);
      } catch (e) {
        console.error("Failed to load homework", e);
      } finally {
        setHwLoading(false);
      }
    })();
  }, [sel]);

  const subjName = (id: string) => subjects.find((s) => String(s.id) === String(id))?.name || "Subject";

  const submit = async () => {
    const [classId, sectionId] = sel.split("|");
    if (!subjectId || !title || !dueDate) return alert("Pick a subject, title and due date.");
    setSaving(true);
    try {
      await api.post("/academics/homework", {
        class_id: classId,
        section_id: sectionId,
        subject_id: subjectId,
        title,
        description,
        due_date: dueDate,
        academic_year_id: academicYearId,
        teacher_id: staffId,
      });
      setOpen(false);
      setTitle("");
      setDescription("");
      setDueDate("");
      setSubjectId("");
      const hwRes = await api.get(`/academics/homework?class_id=${classId}&section_id=${sectionId}`);
      setHomework(hwRes.data?.data || []);
    } catch (e) {
      console.error("Failed to assign homework", e);
      alert("Couldn't assign homework. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto py-16 text-center text-ink-muted">Loading…</div>;
  if (error) return <div className="max-w-4xl mx-auto py-16 text-center text-red-600">Couldn't load your classes. Please try again.</div>;
  if (classes.length === 0)
    return <div className="max-w-4xl mx-auto py-16 text-center text-ink-muted">No classes are assigned to you yet.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Homework</h2>
          <p className="text-ink-muted mt-1">Assign homework and review what you've set.</p>
        </div>
        <select
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          className="px-4 py-2 bg-surface border border-border rounded-xl text-ink font-medium outline-none focus:ring-2 focus:ring-primary-500"
        >
          {classes.map((c) => (
            <option key={`${c.class_id}|${c.section_id}`} value={`${c.class_id}|${c.section_id}`}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-surface-card rounded-card border border-border shadow-sm p-6">
        <button
          onClick={() => setOpen((v) => !v)}
          className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {open ? "Cancel" : "Assign homework"}
        </button>
        {open && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-ink-muted">Subject</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-ink-muted">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-ink-muted">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Algebra — Exercise 4.3"
                className="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-ink-muted">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                onClick={submit}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-ink text-white font-bold disabled:opacity-60"
              >
                {saving ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-ink">Assigned homework</h3>
        {hwLoading ? (
          <div className="py-10 text-center text-ink-muted">Loading…</div>
        ) : homework.length === 0 ? (
          <div className="bg-surface-card rounded-card border border-border p-8 text-center text-ink-muted">
            No homework assigned for this class yet.
          </div>
        ) : (
          homework.map((h) => (
            <div key={h.id} className="bg-surface-card rounded-card border border-border shadow-sm p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-primary-600 shrink-0" />
                  <h4 className="font-bold text-ink">{h.title}</h4>
                </div>
                {h.due_date ? <span className="text-xs text-ink-muted">Due {fmt(h.due_date)}</span> : null}
              </div>
              {h.subject_id ? <p className="text-sm text-ink-muted mt-1 ml-8">{subjName(h.subject_id)}</p> : null}
              {h.description ? <p className="text-sm text-ink-muted mt-1 ml-8">{h.description}</p> : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-border">
        <div>
          <h2 className="text-3xl font-extrabold text-ink tracking-tight">Homework Management</h2>
          <p className="text-ink-muted mt-2 text-lg">Assign homework and monitor academic progress seamlessly.</p>
        </div>
        <div className="relative">
          <select
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-surface border border-border rounded-xl text-ink font-semibold outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm w-full sm:w-auto"
          >
            {classes.map((c) => (
              <option key={`${c.class_id}|${c.section_id}`} value={`${c.class_id}|${c.section_id}`}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      <div className="bg-surface-card rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-300">
        <div className="p-6 sm:p-8 flex items-center justify-between bg-gradient-to-r from-surface-card to-surface-card/50">
          <div>
            <h3 className="text-xl font-bold text-ink">Assign New Task</h3>
            <p className="text-ink-muted text-sm mt-1">Create a new homework assignment for the selected class.</p>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className={`px-5 py-2.5 rounded-xl text-white text-sm font-bold inline-flex items-center gap-2 transition-all duration-200 shadow-sm shrink-0 ${open ? 'bg-red-500 hover:bg-red-600 focus:ring-4 focus:ring-red-500/20' : 'bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:ring-primary-500/20'}`}
          >
            <Plus className={`w-5 h-5 transition-transform duration-300 ${open ? 'rotate-45' : ''}`} /> 
            {open ? "Cancel" : "Assign homework"}
          </button>
        </div>
        
        {open && (
          <div className="px-6 pb-6 sm:px-8 sm:pb-8 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-ink-muted uppercase tracking-wider">Subject</label>
              <div className="relative">
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="appearance-none w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
                >
                  <option value="">Select subject…</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-ink-muted">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-ink-muted uppercase tracking-wider">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm font-semibold text-ink-muted uppercase tracking-wider">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Algebra — Exercise 4.3"
                className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-sm font-semibold text-ink-muted uppercase tracking-wider">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details, instructions, or links here..."
                rows={4}
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-ink outline-none focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm resize-none"
              />
            </div>
            <div className="sm:col-span-2 pt-2">
              <button
                onClick={submit}
                disabled={saving}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-ink text-white font-bold disabled:opacity-60 hover:bg-ink/90 transition-all shadow-md active:scale-[0.98]"
              >
                {saving ? "Assigning Task…" : "Assign Homework"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-ink">Assigned Tasks</h3>
          {homework.length > 0 && (
            <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-bold tracking-wider uppercase">
              {homework.length} total
            </span>
          )}
        </div>
        {hwLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4 text-ink-muted">
            <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
            <p className="font-medium animate-pulse">Loading assignments...</p>
          </div>
        ) : homework.length === 0 ? (
          <div className="bg-surface-card rounded-2xl border border-border border-dashed p-12 text-center text-ink-muted flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4 shadow-inner">
              <BookOpen className="w-8 h-8 text-ink-muted/50" />
            </div>
            <h4 className="text-lg font-bold text-ink mb-1">No homework assigned yet</h4>
            <p className="text-sm max-w-sm">You haven't assigned any homework for this class section. Click "Assign homework" above to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {homework.map((h) => (
              <div key={h.id} className="group bg-surface-card rounded-2xl border border-border shadow-sm p-6 hover:shadow-md transition-all duration-200 hover:border-primary-500/30">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <BookOpen className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-ink group-hover:text-primary-600 transition-colors">{h.title}</h4>
                      {h.subject_id && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-primary-500"></span>
                          <p className="text-sm font-medium text-ink-muted">{subjName(h.subject_id)}</p>
                        </div>
                      )}
                      {h.description && (
                        <p className="text-sm text-ink-muted mt-3 leading-relaxed max-w-2xl">{h.description}</p>
                      )}
                    </div>
                  </div>
                  {h.due_date && (
                    <div className="shrink-0 flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-semibold border border-amber-200/50">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Due {fmt(h.due_date)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

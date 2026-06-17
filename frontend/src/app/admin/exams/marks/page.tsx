"use client";
import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubNav } from "@/components/ui/SubNav";
import { Button } from "@/components/ui/Button";
import { Input, Select, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import {
  getClasses,
  getSubjects,
  Class,
  Subject,
  getSectionsForClass,
  Section,
} from "@/lib/api/setup";
import {
  getExams,
  getExamSchedules,
  createExamSchedule,
  getStudentMarks,
  bulkEnterMarks,
} from "@/lib/api/exams";
import { getStudents, Student } from "@/lib/api/students";
import { Save, Plus, FileText } from "lucide-react";

const tabs = [
  { href: "/admin/exams/setup", label: "Configuration" },
  { href: "/admin/exams/marks", label: "Marks Entry" },
  { href: "/admin/exams/results", label: "Results & Report Cards" },
  { href: "/admin/exams/grades", label: "Grade Scales" },
];

export default function MarksEntryPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [marksData, setMarksData] = useState<
    Record<string, { marks_obtained: number | null; is_absent: boolean }>
  >({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSchedModalOpen, setIsSchedModalOpen] = useState(false);
  const [schedForm, setSchedForm] = useState({
    subject_id: "",
    exam_date: "",
    max_marks: 100,
    passing_marks: 33,
  });

  useEffect(() => {
    Promise.all([getClasses(), getSubjects()]).then(([cRes, sRes]) => {
      setClasses(cRes.data || []);
      setSubjects(sRes.data || []);
    });
  }, []);
  useEffect(() => {
    if (selectedClass) {
      getSectionsForClass(selectedClass).then((res) => setSections(res.data || []));
      getExams(selectedClass).then((res) => setExams(res.data || []));
    } else {
      setSections([]);
      setExams([]);
    }
    setSelectedSection("");
    setSelectedExam("");
  }, [selectedClass]);
  useEffect(() => {
    if (selectedExam) getExamSchedules(selectedExam).then((res) => setSchedules(res.data || []));
    else setSchedules([]);
    setSelectedSchedule(null);
  }, [selectedExam]);

  const loadStudentsAndMarks = async (schedule: any) => {
    setSelectedSchedule(schedule);
    if (!selectedClass || !selectedSection) return;
    setLoading(true);
    try {
      const [stRes, mkRes] = await Promise.all([
        getStudents({ class_id: selectedClass, section_id: selectedSection }),
        getStudentMarks(schedule.id),
      ]);
      const stList = stRes.data || [];
      const mkList = mkRes.data || [];
      const newMarks: any = {};
      stList.forEach((st: any) => {
        const m = mkList.find((x: any) => x.student_id === st.id);
        newMarks[st.id] = {
          marks_obtained: m ? m.marks_obtained : null,
          is_absent: m ? m.is_absent : false,
        };
      });
      setStudents(stList);
      setMarksData(newMarks);
    } catch {
      alert("Failed to load marks");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (id: string, value: string) => {
    const num = value === "" ? null : parseFloat(value);
    setMarksData((p) => ({ ...p, [id]: { ...p[id], marks_obtained: num, is_absent: false } }));
  };
  const handleAbsentChange = (id: string, checked: boolean) => {
    setMarksData((p) => ({
      ...p,
      [id]: { ...p[id], is_absent: checked, marks_obtained: checked ? null : p[id].marks_obtained },
    }));
  };

  const saveMarks = async () => {
    if (!selectedSchedule) return;
    setSaving(true);
    try {
      await bulkEnterMarks({
        exam_schedule_id: selectedSchedule.id,
        marks: Object.keys(marksData).map((sid) => ({
          student_id: sid,
          marks_obtained: marksData[sid].marks_obtained,
          is_absent: marksData[sid].is_absent,
        })),
      });
      alert("Marks saved.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save marks (ensure marks ≤ max).");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    try {
      await createExamSchedule({ ...schedForm, exam_id: selectedExam });
      setIsSchedModalOpen(false);
      const res = await getExamSchedules(selectedExam);
      setSchedules(res.data || []);
    } catch {
      alert("Failed to create subject schedule");
    }
  };

  return (
    <div>
      <SubNav items={tabs} />
      <PageHeader
        title="Marks Entry"
        description="Select an exam schedule and enter student marks directly."
      />

      <div className="bg-surface-card p-5 rounded-card border border-border shadow-card mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Class</Label>
          <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="">Select</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Section</Label>
          <Select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={!selectedClass}
          >
            <option value="">Select</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Exam</Label>
          <Select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            disabled={!selectedClass}
          >
            <option value="">Select</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {selectedExam && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-ink">Exam Subject Schedules</h3>
            <Button variant="secondary" size="sm" onClick={() => setIsSchedModalOpen(true)}>
              <Plus size={14} /> Add Subject
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {schedules.map((s) => {
              const sub = subjects.find((x) => x.id === s.subject_id);
              return (
                <button
                  key={s.id}
                  onClick={() => loadStudentsAndMarks(s)}
                  className={cn(
                    "min-w-[160px] p-3 rounded-input border text-left transition-colors",
                    selectedSchedule?.id === s.id
                      ? "bg-primary-50 border-primary-500"
                      : "bg-surface-card border-border hover:bg-surface"
                  )}
                >
                  <div className="font-semibold text-ink text-sm">{sub?.name || "Subject"}</div>
                  <div className="text-xs text-ink-muted mt-1">{s.exam_date}</div>
                  <div className="text-xs text-ink-faint">Max: {s.max_marks}</div>
                </button>
              );
            })}
            {schedules.length === 0 && (
              <p className="text-sm text-ink-faint p-4 border border-dashed border-border rounded-input w-full text-center">
                No subjects mapped to this exam yet.
              </p>
            )}
          </div>
        </div>
      )}

      {selectedSchedule && students.length > 0 && !loading && (
        <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
          <div className="p-4 bg-surface border-b border-border">
            <h3 className="text-sm font-semibold text-ink">
              Enter Marks (Max: {selectedSchedule.max_marks})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Adm No.", "Student", "Marks Obtained", "Absent?"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((st) => (
                  <tr
                    key={st.id}
                    className={cn(
                      "hover:bg-surface transition-colors",
                      marksData[st.id]?.is_absent && "bg-danger-bg/40"
                    )}
                  >
                    <td className="px-4 py-3 text-xs font-mono text-ink-muted">
                      {st.admission_number}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-ink">
                      {st.first_name} {st.last_name}
                    </td>
                    <td className="px-4 py-3 w-48">
                      <Input
                        type="number"
                        disabled={marksData[st.id]?.is_absent}
                        value={marksData[st.id]?.marks_obtained ?? ""}
                        onChange={(e) => handleMarkChange(st.id, e.target.value)}
                        max={selectedSchedule.max_marks}
                        min={0}
                        step={0.5}
                        className="py-1.5"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-danger-text"
                        checked={marksData[st.id]?.is_absent || false}
                        onChange={(e) => handleAbsentChange(st.id, e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-surface border-t border-border flex justify-end">
            <Button onClick={saveMarks} disabled={saving}>
              <Save size={16} /> {saving ? "Saving..." : "Save Marks"}
            </Button>
          </div>
        </div>
      )}

      {selectedExam && schedules.length > 0 && !selectedSchedule && (
        <EmptyState
          icon={<FileText size={22} />}
          title="Select a subject"
          description="Pick a subject schedule above to enter marks."
        />
      )}

      <Modal
        open={isSchedModalOpen}
        onClose={() => setIsSchedModalOpen(false)}
        title="Map Subject to Exam"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsSchedModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="sched-form">
              Add Schedule
            </Button>
          </>
        }
      >
        <form id="sched-form" onSubmit={handleCreateSchedule} className="space-y-4">
          <div>
            <Label required>Subject</Label>
            <Select
              required
              value={schedForm.subject_id}
              onChange={(e) => setSchedForm({ ...schedForm, subject_id: e.target.value })}
            >
              <option value="">Select</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label required>Exam Date</Label>
            <Input
              required
              type="date"
              value={schedForm.exam_date}
              onChange={(e) => setSchedForm({ ...schedForm, exam_date: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Max Marks</Label>
              <Input
                required
                type="number"
                value={schedForm.max_marks}
                onChange={(e) =>
                  setSchedForm({ ...schedForm, max_marks: parseFloat(e.target.value) })
                }
              />
            </div>
            <div>
              <Label required>Passing Marks</Label>
              <Input
                required
                type="number"
                value={schedForm.passing_marks}
                onChange={(e) =>
                  setSchedForm({ ...schedForm, passing_marks: parseFloat(e.target.value) })
                }
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

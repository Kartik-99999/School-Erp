"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getClasses,
  getSectionsForClass,
  getSubjects,
  Class,
  Section,
  Subject,
  getAcademicYears,
} from "@/lib/api/setup";
import { getStaff, Staff } from "@/lib/api/staff";
import {
  getPeriods,
  getTimetable,
  createTimetableSlot,
  getTimetablePdfUrl,
  createPeriod,
  generateAITimetable,
  deleteTimetableSlot,
  bulkImportTimetable,
} from "@/lib/api/academics";
import { Download, Plus, Clock, Sparkles, Trash2, Upload } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimetablePage() {
  const pathname = usePathname();

  // Base Data
  const [activeYearId, setActiveYearId] = useState("");
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);

  // Selection State
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  // Timetable State
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [importing, setImporting] = useState(false);

  // Modals
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotForm, setSlotForm] = useState({
    period_id: "",
    day_of_week: "",
    subject_id: "",
    teacher_id: "",
  });

  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    name: "",
    start_time: "",
    end_time: "",
    is_break: false,
  });

  useEffect(() => {
    Promise.all([getAcademicYears(), getClasses(), getSubjects(), getStaff(""), getPeriods()]).then(
      ([yrRes, clsRes, subRes, stfRes, perRes]) => {
        const active = yrRes.data.find((y: any) => y.is_active);
        if (active) setActiveYearId(active.id);
        setClasses(clsRes.data || []);
        setSubjects(subRes.data || []);
        setStaff(stfRes.data || []);
        setPeriods(perRes.data.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time)));
      }
    );
  }, []);

  useEffect(() => {
    if (selectedClass) {
      getSectionsForClass(selectedClass).then((res) => setSections(res.data || []));
    } else {
      setSections([]);
    }
    setSelectedSection("");
    setTimetable([]);
  }, [selectedClass]);

  const loadTimetable = async () => {
    if (!selectedClass || !selectedSection) return;
    setLoading(true);
    try {
      const res = await getTimetable(selectedClass, selectedSection);
      setTimetable(res.data || []);
    } catch (e) {
      alert("Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!selectedClass || !selectedSection || !activeYearId) return;
    if (!confirm("This will overwrite the current timetable for this class. Continue?")) return;

    setGeneratingAI(true);
    try {
      await generateAITimetable({
        class_id: selectedClass,
        section_id: selectedSection,
        academic_year_id: activeYearId,
      });
      alert("AI Timetable generated successfully!");
      loadTimetable();
    } catch (err: any) {
      alert(
        err.response?.data?.detail ||
          "Failed to generate AI timetable. Ensure you have subjects and teachers."
      );
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeYearId) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("academic_year_id", activeYearId);

    setImporting(true);
    try {
      const res = await bulkImportTimetable(formData);
      alert(
        `Import complete! Successfully imported ${res.data.success_count} slots. Errors: ${res.data.failed_count}`
      );
      if (res.data.failed_count > 0) {
        console.error("Import Errors:", res.data.errors);
      }
      if (selectedClass && selectedSection) {
        loadTimetable();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to import timetable");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handlePeriodCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPeriod(periodForm);
      setIsPeriodModalOpen(false);
      setPeriodForm({ name: "", start_time: "", end_time: "", is_break: false });
      const perRes = await getPeriods();
      setPeriods(perRes.data.sort((a: any, b: any) => a.start_time.localeCompare(b.start_time)));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create period");
    }
  };

  const handleSlotCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...slotForm,
        class_id: selectedClass,
        section_id: selectedSection,
        academic_year_id: activeYearId,
        subject_id: slotForm.subject_id || undefined,
        teacher_id: slotForm.teacher_id || undefined,
      };
      await createTimetableSlot(payload);
      setIsSlotModalOpen(false);
      loadTimetable();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to assign slot. Check for conflicts.");
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Remove this slot?")) return;
    try {
      await deleteTimetableSlot(slotId);
      loadTimetable();
    } catch (err) {
      alert("Failed to delete slot");
    }
  };

  const getSlotDetails = (day: string, periodId: string) => {
    const slot = timetable.find((t) => t.day_of_week === day && t.period_id === periodId);
    if (!slot) return null;
    const sub = subjects.find((s) => s.id === slot.subject_id);
    const tch = staff.find((s) => s.id === slot.teacher_id);
    return {
      id: slot.id,
      subject: sub?.name,
      teacher: tch ? `${tch.first_name} ${tch.last_name}` : null,
    };
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
        title="Class Timetable"
        description="Configure periods and map subjects/teachers to class slots."
        action={
          <button
            onClick={() => setIsPeriodModalOpen(true)}
            className="bg-surface-card border border-border-strong text-ink px-4 py-2 rounded-md hover:bg-surface flex items-center gap-2"
          >
            <Clock className="w-4 h-4" /> Manage Periods
          </button>
        }
      />

      <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border mb-8 flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Class</label>
          <select
            className="w-full border rounded p-2"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
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
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            <option value="">Select</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-4 border-l pl-4">
          <button
            onClick={loadTimetable}
            disabled={!selectedClass || !selectedSection || loading}
            className="bg-gray-900 text-white px-6 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Loading..." : "View Timetable"}
          </button>
          <label
            className={`bg-emerald-600 text-white px-6 py-2 rounded hover:bg-emerald-700 cursor-pointer flex items-center justify-center gap-2 font-medium ${importing ? "opacity-50" : ""}`}
          >
            <Upload className="w-4 h-4" /> {importing ? "Importing..." : "Bulk Upload"}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
              disabled={importing}
            />
          </label>
        </div>
      </div>

      {timetable.length >= 0 && selectedClass && selectedSection && !loading && (
        <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 bg-surface border-b flex justify-between items-center">
            <h3 className="font-bold text-ink">Weekly Schedule</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={handleAIGenerate}
                disabled={generatingAI}
                className="text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md flex items-center gap-1 text-sm font-medium transition-colors border border-purple-200 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />{" "}
                {generatingAI ? "Generating..." : "Auto-Generate with AI"}
              </button>
              <a
                href={getTimetablePdfUrl(selectedClass, selectedSection)}
                target="_blank"
                className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm font-medium"
              >
                <Download className="w-4 h-4" /> Export PDF
              </a>
            </div>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-surface text-left w-32">Day / Period</th>
                  {periods.map((p) => (
                    <th key={p.id} className="border p-2 bg-surface text-center min-w-[120px]">
                      <div className="font-semibold text-sm">{p.name}</div>
                      <div className="text-xs text-ink-muted font-normal">
                        {p.start_time.substring(0, 5)} - {p.end_time.substring(0, 5)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day}>
                    <td className="border p-2 font-bold bg-surface">{day}</td>
                    {periods.map((p) => {
                      if (p.is_break) {
                        return (
                          <td
                            key={p.id}
                            className="border p-2 bg-surface text-center text-ink-faint text-sm font-medium uppercase tracking-widest"
                          >
                            Break
                          </td>
                        );
                      }
                      const details = getSlotDetails(day, p.id);
                      return (
                        <td
                          key={p.id}
                          className="border p-2 text-center h-20 align-middle hover:bg-primary-50 group relative"
                        >
                          {details ? (
                            <div className="relative h-full flex flex-col justify-center">
                              <div className="font-bold text-ink text-sm">{details.subject}</div>
                              <div className="text-xs text-ink-muted mt-1">
                                {details.teacher || "No Teacher"}
                              </div>
                              <button
                                onClick={() => handleDeleteSlot(details.id)}
                                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 bg-red-50 p-1 rounded-bl-lg transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSlotForm({ ...slotForm, day_of_week: day, period_id: p.id });
                                setIsSlotModalOpen(true);
                              }}
                              className="text-ink-faint hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Plus className="w-6 h-6 mx-auto" />
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Period Modal */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Period / Break</h2>
            <form onSubmit={handlePeriodCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Name (e.g. Period 1, Lunch)
                </label>
                <input
                  required
                  type="text"
                  className="w-full border rounded p-2"
                  value={periodForm.name}
                  onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    required
                    type="time"
                    className="w-full border rounded p-2"
                    value={periodForm.start_time}
                    onChange={(e) => setPeriodForm({ ...periodForm, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    required
                    type="time"
                    className="w-full border rounded p-2"
                    value={periodForm.end_time}
                    onChange={(e) => setPeriodForm({ ...periodForm, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_break"
                  checked={periodForm.is_break}
                  onChange={(e) => setPeriodForm({ ...periodForm, is_break: e.target.checked })}
                />
                <label htmlFor="is_break" className="text-sm font-medium">
                  This is a break (no subjects mapped)
                </label>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slot Modal */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Assign Subject & Teacher</h2>
            <p className="text-sm text-ink-muted mb-4">Day: {slotForm.day_of_week}</p>
            <form onSubmit={handleSlotCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <select
                  required
                  className="w-full border rounded p-2"
                  value={slotForm.subject_id}
                  onChange={(e) => setSlotForm({ ...slotForm, subject_id: e.target.value })}
                >
                  <option value="">Select Subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teacher (Optional)</label>
                <select
                  className="w-full border rounded p-2"
                  value={slotForm.teacher_id}
                  onChange={(e) => setSlotForm({ ...slotForm, teacher_id: e.target.value })}
                >
                  <option value="">Select Teacher</option>
                  {staff
                    .filter((s) => s.designation?.toLowerCase().includes("teacher"))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-ink-muted mt-1">
                  System will check for double-booking conflicts.
                </p>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

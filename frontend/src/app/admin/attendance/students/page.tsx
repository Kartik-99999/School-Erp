"use client";
import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubNav } from "@/components/ui/SubNav";
import { Button } from "@/components/ui/Button";
import { Input, Select, Label } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { getClasses, getSectionsForClass, Class, Section } from "@/lib/api/setup";
import { getStudents, Student } from "@/lib/api/students";
import { getStudentDailyAttendance, markStudentBulkAttendance } from "@/lib/api/attendance";
import { Save, AlertTriangle, Users } from "lucide-react";

const STATUSES = ["Present", "Absent", "Late", "Half Day"];
const statusStyle: Record<string, string> = {
  Present: "bg-success-bg text-success-text border-success-border",
  Absent: "bg-danger-bg text-danger-text border-danger-border",
  Late: "bg-warning-bg text-warning-text border-warning-border",
  "Half Day": "bg-info-bg text-info-text border-info-border",
};

const tabs = [
  { href: "/admin/attendance/students", label: "Student Attendance" },
  { href: "/admin/attendance/staff", label: "Staff Attendance" },
  { href: "/admin/attendance/reports", label: "Reports & Registers" },
];

export default function StudentAttendancePage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceData, setAttendanceData] = useState<
    Record<string, { status: string; remarks: string }>
  >({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getClasses().then((res) => setClasses(res.data || []));
  }, []);
  useEffect(() => {
    if (selectedClass)
      getSectionsForClass(selectedClass).then((res) => setSections(res.data || []));
    else setSections([]);
    setSelectedSection("");
    setStudents([]);
  }, [selectedClass]);

  const loadData = async () => {
    if (!selectedClass || !selectedSection || !targetDate) return;
    setLoading(true);
    try {
      const [studentsRes, attRes] = await Promise.all([
        getStudents({ class_id: selectedClass, section_id: selectedSection }),
        getStudentDailyAttendance(selectedClass, selectedSection, targetDate),
      ]);
      const stds = studentsRes.data || [];
      const pastAtt = attRes.data || [];
      const newAttData: any = {};
      stds.forEach((st) => {
        const existing = pastAtt.find((a: any) => a.student_id === st.id);
        newAttData[st.id] = {
          status: existing ? existing.status : "Present",
          remarks: existing?.remarks || "",
        };
      });
      setStudents(stds);
      setAttendanceData(newAttData);
    } catch (err) {
      alert("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (id: string, status: string) =>
    setAttendanceData((p) => ({ ...p, [id]: { ...p[id], status } }));
  const setRemarks = (id: string, remarks: string) =>
    setAttendanceData((p) => ({ ...p, [id]: { ...p[id], remarks } }));
  const markAll = (status: string) => {
    const updated: any = {};
    Object.keys(attendanceData).forEach((id) => {
      updated[id] = { ...attendanceData[id], status };
    });
    setAttendanceData(updated);
  };

  const saveAttendance = async () => {
    if (!selectedClass || !selectedSection || !targetDate) return;
    setSaving(true);
    try {
      const records = Object.keys(attendanceData).map((student_id) => ({
        student_id,
        date: targetDate,
        status: attendanceData[student_id].status,
        remarks: attendanceData[student_id].remarks,
      }));
      await markStudentBulkAttendance({
        date: targetDate,
        class_id: selectedClass,
        section_id: selectedSection,
        attendance_records: records,
      });
      alert("Attendance saved.");
    } catch (err: any) {
      let msg = err.response?.data?.detail;
      if (Array.isArray(msg))
        msg = msg.map((m: any) => `${m.loc[m.loc.length - 1]}: ${m.msg}`).join("\n");
      alert(msg || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SubNav items={tabs} />
      <PageHeader
        title="Student Attendance"
        description="Mark daily attendance by class and section."
      />

      <div className="bg-surface-card p-5 rounded-card border border-border shadow-card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label>Date</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <div>
            <Label>Class</Label>
            <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Section</Label>
            <Select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
              <option value="">Select Section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <Button
            onClick={loadData}
            disabled={!selectedClass || !selectedSection || !targetDate || loading}
          >
            {loading ? "Loading..." : "Load Roster"}
          </Button>
        </div>
      </div>

      {students.length > 0 ? (
        <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
          <div className="p-4 bg-surface border-b border-border flex flex-wrap justify-between items-center gap-3">
            <h3 className="text-sm font-semibold text-ink">Class Roster ({students.length})</h3>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => markAll("Present")}>
                All Present
              </Button>
              <Button variant="secondary" size="sm" onClick={() => markAll("Absent")}>
                All Absent
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Adm No.", "Student", "Status", "Remarks"].map((h) => (
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
                  <tr key={st.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-ink-muted">
                      {st.admission_number}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-ink">
                      {st.first_name} {st.last_name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {STATUSES.map((s) => {
                          const active = attendanceData[st.id]?.status === s;
                          return (
                            <button
                              key={s}
                              onClick={() => setStatus(st.id, s)}
                              className={cn(
                                "px-2.5 py-1 text-xs font-medium rounded-badge border transition-colors",
                                active
                                  ? statusStyle[s]
                                  : "bg-surface-card text-ink-muted border-border hover:bg-surface"
                              )}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        className="text-xs py-1.5"
                        placeholder="Reason..."
                        value={attendanceData[st.id]?.remarks || ""}
                        onChange={(e) => setRemarks(st.id, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-surface border-t border-border flex flex-wrap justify-between items-center gap-3">
            <p className="text-xs text-ink-muted flex items-center gap-1">
              <AlertTriangle size={14} className="text-warning-text" /> Parents of absentees are
              notified on save (if WhatsApp is configured).
            </p>
            <Button onClick={saveAttendance} disabled={saving}>
              <Save size={16} /> {saving ? "Saving..." : "Save Attendance"}
            </Button>
          </div>
        </div>
      ) : (
        !loading &&
        selectedSection && (
          <EmptyState
            icon={<Users size={22} />}
            title="No students found"
            description="There are no students in this class/section."
          />
        )
      )}
    </div>
  );
}

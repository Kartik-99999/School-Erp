"use client";
import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubNav } from "@/components/ui/SubNav";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { getStaff, Staff } from "@/lib/api/staff";
import { getStaffDailyAttendance, markStaffBulkAttendance } from "@/lib/api/attendance";
import { Save, Users } from "lucide-react";

const STATUSES = ["Present", "Absent", "Half Day", "Leave"];
const statusStyle: Record<string, string> = {
  Present: "bg-success-bg text-success-text border-success-border",
  Absent: "bg-danger-bg text-danger-text border-danger-border",
  "Half Day": "bg-warning-bg text-warning-text border-warning-border",
  Leave: "bg-info-bg text-info-text border-info-border",
};

const tabs = [
  { href: "/admin/attendance/students", label: "Student Attendance" },
  { href: "/admin/attendance/staff", label: "Staff Attendance" },
  { href: "/admin/attendance/reports", label: "Reports & Registers" },
];

export default function StaffAttendancePage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceData, setAttendanceData] = useState<
    Record<string, { status: string; remarks: string }>
  >({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!targetDate) return;
    setLoading(true);
    try {
      const [staffRes, attRes] = await Promise.all([
        getStaff(),
        getStaffDailyAttendance(targetDate),
      ]);
      const stds = staffRes.data || [];
      const pastAtt = attRes.data || [];
      const newAttData: any = {};
      stds.forEach((st) => {
        const existing = pastAtt.find((a: any) => a.staff_id === st.id);
        newAttData[st.id] = {
          status: existing ? existing.status : "Present",
          remarks: existing?.remarks || "",
        };
      });
      setStaffList(stds);
      setAttendanceData(newAttData);
    } catch (err) {
      alert("Failed to load data");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, [targetDate]);

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
    if (!targetDate) return;
    setSaving(true);
    try {
      const records = Object.keys(attendanceData).map((staff_id) => ({
        staff_id,
        date: targetDate,
        status: attendanceData[staff_id].status,
        remarks: attendanceData[staff_id].remarks,
      }));
      await markStaffBulkAttendance({ date: targetDate, attendance_records: records });
      alert("Staff attendance saved.");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SubNav items={tabs} />
      <PageHeader title="Staff Attendance" description="Mark daily attendance for all employees." />

      <div className="bg-surface-card p-5 rounded-card border border-border shadow-card mb-6 max-w-xs">
        <Label>Select Date</Label>
        <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </div>

      {loading ? (
        <EmptyState title="Loading roster..." />
      ) : staffList.length > 0 ? (
        <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
          <div className="p-4 bg-surface border-b border-border flex justify-between items-center">
            <h3 className="text-sm font-semibold text-ink">Employee Roster ({staffList.length})</h3>
            <Button variant="secondary" size="sm" onClick={() => markAll("Present")}>
              All Present
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["EMP ID", "Name", "Department", "Status", "Remarks"].map((h) => (
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
                {staffList.map((st) => (
                  <tr key={st.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-ink-muted">{st.employee_id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-ink">
                      {st.first_name} {st.last_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{st.department || "—"}</td>
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
                        placeholder="Remarks..."
                        value={attendanceData[st.id]?.remarks || ""}
                        onChange={(e) => setRemarks(st.id, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-surface border-t border-border flex justify-end">
            <Button onClick={saveAttendance} disabled={saving}>
              <Save size={16} /> {saving ? "Saving..." : "Save Attendance"}
            </Button>
          </div>
        </div>
      ) : (
        <EmptyState icon={<Users size={22} />} title="No staff found" />
      )}
    </div>
  );
}

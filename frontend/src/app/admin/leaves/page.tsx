"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { UserCheck, GraduationCap, CheckCircle, XCircle, Clock } from "lucide-react";

const statusVariant = (s: string) =>
  s === "Approved" ? "success" : s === "Rejected" ? "danger" : "warning";

export default function AdminLeavesPage() {
  const [tab, setTab] = useState<"staff" | "students">("staff");
  const [leaves, setLeaves] = useState<any[]>([]);
  const [studentLeaves, setStudentLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStaff = async () => {
    try {
      const res = await api.get("/leaves/applications");
      setLeaves(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };
  const fetchStudents = async () => {
    try {
      const res = await api.get("/leaves/student-applications");
      setStudentLeaves(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchStaff(), fetchStudents()]);
      setLoading(false);
    })();
  }, []);

  const handleStaffStatus = async (id: string, status: string) => {
    try {
      await api.put(`/leaves/applications/${id}/status?status=${status}`);
      fetchStaff();
    } catch {
      alert("Failed to update leave status.");
    }
  };
  const handleStudentStatus = async (id: string, status: string) => {
    try {
      await api.put(`/leaves/student-applications/${id}/status?status=${status}`);
      fetchStudents();
    } catch {
      alert("Failed to update leave status.");
    }
  };

  const pendingStaff = leaves.filter((l) => l.status === "Pending").length;
  const pendingStudents = studentLeaves.filter((l) => l.status === "Pending").length;

  const ActionCell = ({
    status,
    onApprove,
    onReject,
  }: {
    status: string;
    onApprove: () => void;
    onReject: () => void;
  }) =>
    status === "Pending" ? (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-success-text hover:bg-success-bg"
          onClick={onApprove}
        >
          <CheckCircle size={14} /> Approve
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-danger-text hover:bg-danger-bg"
          onClick={onReject}
        >
          <XCircle size={14} /> Reject
        </Button>
      </div>
    ) : (
      <span className="text-xs text-ink-faint">—</span>
    );

  return (
    <div>
      <PageHeader
        title="Leave Approvals"
        description="Review and manage staff and student leave applications."
      />

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <StatCard
          title="Pending Staff"
          value={pendingStaff}
          icon={<UserCheck size={20} />}
          iconClassName="bg-warning-bg text-warning-text"
        />
        <StatCard
          title="Pending Students"
          value={pendingStudents}
          icon={<GraduationCap size={20} />}
          iconClassName="bg-info-bg text-info-text"
        />
      </div>

      <div className="inline-flex gap-1 bg-surface border border-border p-1 rounded-btn mb-4">
        {(["staff", "students"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-btn text-sm font-medium transition-colors flex items-center gap-2",
              tab === t
                ? "bg-surface-card text-primary-600 shadow-sm"
                : "text-ink-muted hover:text-ink"
            )}
          >
            {t === "staff" ? <UserCheck size={15} /> : <GraduationCap size={15} />}
            {t === "staff" ? "Staff" : "Students"}
            {(t === "staff" ? pendingStaff : pendingStudents) > 0 && (
              <span className="text-xs bg-warning-bg text-warning-text px-1.5 rounded-badge">
                {t === "staff" ? pendingStaff : pendingStudents}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : tab === "staff" ? (
          leaves.length === 0 ? (
            <EmptyState icon={<Clock size={22} />} title="No staff leave applications" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface border-b border-border">
                  <tr>
                    {["Staff Member", "Type", "Duration", "Reason", "Status", "Action"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaves.map((l, i) => (
                    <tr key={i} className="hover:bg-surface transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-ink">
                        {l.staff_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-muted">{l.leave_type}</td>
                      <td className="px-4 py-3 text-sm text-ink">
                        {l.start_date} → {l.end_date}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-muted max-w-[220px] truncate">
                        {l.reason}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <ActionCell
                          status={l.status}
                          onApprove={() => handleStaffStatus(l.id, "Approved")}
                          onReject={() => handleStaffStatus(l.id, "Rejected")}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : studentLeaves.length === 0 ? (
          <EmptyState icon={<Clock size={22} />} title="No student leave applications" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Student", "Type", "Duration", "Reason", "Status", "Action"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {studentLeaves.map((l) => (
                  <tr key={l.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-ink">{l.student_name}</p>
                      <p className="text-xs text-ink-faint">{l.admission_number}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{l.leave_type}</td>
                    <td className="px-4 py-3 text-sm text-ink">
                      {l.from_date} → {l.to_date}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted max-w-[220px] truncate">
                      {l.reason}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <ActionCell
                        status={l.status}
                        onApprove={() => handleStudentStatus(l.id, "Approved")}
                        onReject={() => handleStudentStatus(l.id, "Rejected")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

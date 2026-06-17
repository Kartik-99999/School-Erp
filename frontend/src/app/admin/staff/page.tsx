"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import {
  Users,
  GraduationCap,
  Building2,
  Search,
  KeyRound,
  Upload,
  Plus,
  Wallet,
} from "lucide-react";

export default function AdminStaffPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await api.get("/staff");
      setStaff(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    if (!resetTarget?.user_id) return alert("No user account found for this staff member.");
    if (!newPassword) return;
    setResetting(true);
    try {
      await api.post("/auth/reset-password", {
        user_id: resetTarget.user_id,
        new_password: newPassword,
      });
      alert(`Password for ${resetTarget.first_name} has been reset.`);
      setResetTarget(null);
      setNewPassword("");
    } catch (err) {
      console.error(err);
      alert("Failed to reset password.");
    } finally {
      setResetting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      const res = await api.post("/staff/bulk-import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data.data;
      alert(`Import complete! Added ${data.success_count}. Failed: ${data.failed_count}`);
      fetchStaff();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to upload CSV");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleProcessPayroll = () => {
    const month = prompt("Enter month (e.g., January):");
    if (!month) return;
    const year = prompt("Enter year (e.g., 2024):");
    if (!year) return;
    window.open(
      api.defaults.baseURL + `/payroll/payslip/batch/download?month=${month}&year=${year}`,
      "_blank"
    );
  };

  const filtered = staff.filter(
    (e) =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.employee_id || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  const teaching = staff.filter((s) =>
    (s.designation || "").toLowerCase().includes("teach")
  ).length;
  const departments = new Set(staff.map((s) => s.department).filter(Boolean)).size;

  return (
    <div>
      <PageHeader
        title="HR & Payroll"
        description="Manage staff, teachers, leaves, and salaries."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              id="csvUpload"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="secondary"
              disabled={uploading}
              onClick={() => document.getElementById("csvUpload")?.click()}
            >
              <Upload size={16} /> {uploading ? "Importing..." : "Bulk Import"}
            </Button>
            <Button variant="secondary" onClick={handleProcessPayroll}>
              <Wallet size={16} /> Process Payroll
            </Button>
            <Button onClick={() => router.push("/admin/staff/new")}>
              <Plus size={16} /> Add Employee
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Staff"
          value={staff.length}
          icon={<Users size={20} />}
          iconClassName="bg-primary-50 text-primary-600"
        />
        <StatCard
          title="Teaching Staff"
          value={teaching}
          icon={<GraduationCap size={20} />}
          iconClassName="bg-info-bg text-info-text"
        />
        <StatCard
          title="Departments"
          value={departments}
          icon={<Building2 size={20} />}
          iconClassName="bg-warning-bg text-warning-text"
        />
      </div>

      <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={22} />}
            title={searchTerm ? "No matching staff" : "No staff yet"}
            description={
              searchTerm
                ? "Try a different name or employee ID."
                : "Add an employee or run a bulk import."
            }
            action={
              !searchTerm && (
                <Button onClick={() => router.push("/admin/staff/new")}>
                  <Plus size={16} /> Add Employee
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Employee", "Role & Dept", "Contact", "Status", "Actions"].map((h) => (
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
                {filtered.map((emp, idx) => (
                  <tr key={idx} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-ink">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-xs text-ink-faint">{emp.employee_id || "No ID"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-ink">{emp.designation || "Staff"}</p>
                      <p className="text-xs text-ink-faint">{emp.department || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{emp.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Active</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/staff/${emp.id}`)}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger-text hover:bg-danger-bg"
                          onClick={() => {
                            setResetTarget(emp);
                            setNewPassword("");
                          }}
                        >
                          <KeyRound size={14} /> Reset
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset Password"
        description={
          resetTarget
            ? `Set a new password for ${resetTarget.first_name} ${resetTarget.last_name}.`
            : ""
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitReset} disabled={!newPassword || resetting}>
              {resetting ? "Resetting..." : "Reset Password"}
            </Button>
          </>
        }
      >
        <Label htmlFor="staffpw" required>
          New password
        </Label>
        <Input
          id="staffpw"
          type="text"
          placeholder="Enter a new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoFocus
        />
      </Modal>
    </div>
  );
}

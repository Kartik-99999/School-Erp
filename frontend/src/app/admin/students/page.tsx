"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Users, Search, KeyRound, Upload, Plus, ArrowUpDown } from "lucide-react";

const PAGE_SIZE = 25;

export default function AdminStudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const fetchStudents = useCallback(
    async (nextSkip: number, search: string, by: string, dir: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          skip: String(nextSkip),
          limit: String(PAGE_SIZE),
          sort_by: by,
          sort_dir: dir,
        });
        if (search.trim()) params.set("search", search.trim());
        const res = await api.get(`/students/paged?${params.toString()}`);
        const page = res.data?.data ?? {};
        setStudents(page.items || []);
        setTotal(page.total || 0);
        setSkip(page.skip ?? nextSkip);
      } catch (err) {
        console.error(err);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchStudents(0, "", sortBy, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search → reset to first page.
  useEffect(() => {
    const t = setTimeout(() => fetchStudents(0, searchTerm, sortBy, sortDir), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, sortBy, sortDir]);

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const submitReset = async () => {
    if (!resetTarget?.user_id) return alert("No user account found for this student.");
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

  const page = Math.floor(skip / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const sortable = (label: string, col: string) => (
    <button
      onClick={() => toggleSort(col)}
      className="inline-flex items-center gap-1 hover:text-ink"
    >
      {label}
      <ArrowUpDown size={12} className={sortBy === col ? "text-primary-600" : "text-ink-faint"} />
    </button>
  );

  return (
    <div>
      <PageHeader
        title="Student Directory"
        description="Manage all enrolled students, their profiles, and sections."
        action={
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => router.push("/admin/students/import")}>
              <Upload size={16} /> Bulk Import
            </Button>
            <Button onClick={() => router.push("/admin/students/new")}>
              <Plus size={16} /> Add Student
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Students"
          value={total}
          icon={<Users size={20} />}
          iconClassName="bg-primary-50 text-primary-600"
        />
      </div>

      <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Input
              placeholder="Search by name or admission no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-sm text-ink-muted">
            {total} student{total === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : students.length === 0 ? (
          <EmptyState
            icon={<Users size={22} />}
            title={searchTerm ? "No matching students" : "No students yet"}
            description={
              searchTerm
                ? "Try a different name or admission number."
                : "Add a student or run a bulk import to get started."
            }
            action={
              !searchTerm && (
                <Button onClick={() => router.push("/admin/students/new")}>
                  <Plus size={16} /> Add Student
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted whitespace-nowrap">
                    {sortable("Student Name", "name")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted whitespace-nowrap">
                    {sortable("Admission No", "admission_number")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted whitespace-nowrap">
                    Gender / DOB
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted whitespace-nowrap">
                    {sortable("Status", "status")}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((std) => (
                  <tr key={std.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-ink">
                      {std.first_name} {std.last_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted">
                      {std.admission_number || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink">
                      {std.gender || "—"}
                      <span className="block text-xs text-ink-faint">{std.dob || ""}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={std.status === "Active" ? "success" : "neutral"}>
                        {std.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/admin/students/${std.id}`)}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger-text hover:bg-danger-bg"
                          onClick={() => {
                            setResetTarget(std);
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

        {pages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <span className="text-sm text-ink-muted">
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={skip === 0}
                onClick={() =>
                  fetchStudents(Math.max(0, skip - PAGE_SIZE), searchTerm, sortBy, sortDir)
                }
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => fetchStudents(skip + PAGE_SIZE, searchTerm, sortBy, sortDir)}
              >
                Next
              </Button>
            </div>
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
        <Label htmlFor="newpw" required>
          New password
        </Label>
        <Input
          id="newpw"
          type="text"
          placeholder="Enter a new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoFocus
        />
        <p className="text-xs text-ink-muted mt-2">
          The student uses their admission number to sign in with this password.
        </p>
      </Modal>
    </div>
  );
}

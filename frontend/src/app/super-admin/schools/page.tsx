"use client";
import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { getSchools, updateSchoolStatus, updateSchool, deleteSchool } from "@/lib/api/superAdmin";
import { MoreVertical, CheckCircle, XCircle, Clock, Edit, Trash2 } from "lucide-react";

export default function SuperAdminSchoolsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSchool, setEditingSchool] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getSchools();
      setSchools(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    if (!confirm(`Change school status to ${status}?`)) return;
    try {
      await updateSchoolStatus(id, status);
      loadData();
    } catch (e) {
      alert("Failed to update status");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you absolutely sure you want to permanently delete ${name}? This action cannot be undone.`
      )
    )
      return;
    try {
      await deleteSchool(id);
      loadData();
    } catch (e: any) {
      alert("Failed to delete school. " + (e.response?.data?.detail || ""));
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;
    try {
      await updateSchool(editingSchool.id, {
        name: editingSchool.name,
        subdomain: editingSchool.subdomain,
        contact_email: editingSchool.contact_email,
        contact_phone: editingSchool.contact_phone,
        address: editingSchool.address,
      });
      setEditingSchool(null);
      loadData();
    } catch (e: any) {
      alert("Failed to save changes. " + (e.response?.data?.detail || ""));
    }
  };

  const columns = [
    {
      accessorKey: "name",
      header: "School Name",
      cell: ({ row }: any) => <span className="font-bold text-ink">{row.original.name}</span>,
    },
    {
      accessorKey: "subdomain",
      header: "Subdomain",
      cell: ({ row }: any) => (
        <span className="font-mono text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded">
          {row.original.subdomain}
        </span>
      ),
    },
    { accessorKey: "student_count", header: "Students" },
    { accessorKey: "staff_count", header: "Staff" },
    {
      accessorKey: "created_at",
      header: "Registered On",
      cell: ({ row }: any) => new Date(row.original.created_at).toLocaleDateString(),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const s = row.original.status;
        const color =
          s === "Active"
            ? "bg-green-100 text-green-800"
            : s === "Trial"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800";
        return <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>{s}</span>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          {row.original.status !== "Active" && (
            <button
              onClick={() => handleStatusChange(row.original.id, "Active")}
              className="text-green-600 hover:bg-green-50 p-1 rounded border border-transparent hover:border-green-200 transition-all"
              title="Activate"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {row.original.status !== "Suspended" && (
            <button
              onClick={() => handleStatusChange(row.original.id, "Suspended")}
              className="text-red-600 hover:bg-red-50 p-1 rounded border border-transparent hover:border-red-200 transition-all"
              title="Suspend"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
          {row.original.status !== "Trial" && (
            <button
              onClick={() => handleStatusChange(row.original.id, "Trial")}
              className="text-yellow-600 hover:bg-yellow-50 p-1 rounded border border-transparent hover:border-yellow-200 transition-all"
              title="Set to Trial"
            >
              <Clock className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setEditingSchool(row.original)}
            className="text-primary-600 hover:bg-primary-50 p-1 rounded border border-transparent hover:border-primary-100 transition-all"
            title="Edit School Details"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.original.id, row.original.name)}
            className="text-ink-faint hover:text-red-600 hover:bg-red-50 p-1 rounded border border-transparent hover:border-red-200 transition-all"
            title="Delete School"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="pb-12">
      <div className="flex justify-between items-start mb-6">
        <PageHeader
          title="Tenant Schools"
          description="Manage all registered schools, monitor usage, and override subscription statuses."
        />
        <a
          href="/super-admin/schools/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          + Add School
        </a>
      </div>

      {loading ? (
        <div className="py-12 text-center text-ink-muted">Loading tenants...</div>
      ) : (
        <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden">
          <DataTable columns={columns} data={schools} />
        </div>
      )}

      {editingSchool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface">
              <h3 className="text-lg font-bold text-ink">Edit School</h3>
              <button
                onClick={() => setEditingSchool(null)}
                className="text-ink-faint hover:text-ink-muted text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">School Name</label>
                <input
                  required
                  type="text"
                  value={editingSchool.name || ""}
                  onChange={(e) => setEditingSchool({ ...editingSchool, name: e.target.value })}
                  className="w-full border border-border-strong rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Subdomain</label>
                <input
                  required
                  type="text"
                  value={editingSchool.subdomain || ""}
                  onChange={(e) =>
                    setEditingSchool({ ...editingSchool, subdomain: e.target.value })
                  }
                  className="w-full border border-border-strong rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Contact Email</label>
                <input
                  type="email"
                  value={editingSchool.contact_email || ""}
                  onChange={(e) =>
                    setEditingSchool({ ...editingSchool, contact_email: e.target.value })
                  }
                  className="w-full border border-border-strong rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={editingSchool.contact_phone || ""}
                  onChange={(e) =>
                    setEditingSchool({ ...editingSchool, contact_phone: e.target.value })
                  }
                  className="w-full border border-border-strong rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Address</label>
                <textarea
                  value={editingSchool.address || ""}
                  onChange={(e) => setEditingSchool({ ...editingSchool, address: e.target.value })}
                  className="w-full border border-border-strong rounded-lg px-3 py-2"
                  rows={3}
                ></textarea>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingSchool(null)}
                  className="flex-1 bg-surface text-ink font-medium py-2 rounded-lg hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white font-medium py-2 rounded-lg hover:bg-primary-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { UserPlus, CheckCircle, Clock, XCircle, Search, Plus } from "lucide-react";

const stageVariant = (stage: string) =>
  stage === "Admitted" ? "success" : stage === "Rejected" ? "danger" : "warning";
const stageIcon = (stage: string) =>
  stage === "Admitted" ? (
    <CheckCircle size={13} />
  ) : stage === "Rejected" ? (
    <XCircle size={13} />
  ) : (
    <Clock size={13} />
  );

export default function AdminAdmissionsPage() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [reviewEnquiry, setReviewEnquiry] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    student_name: "",
    parent_name: "",
    contact_number: "",
    email: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: string) => setFormData((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const res = await api.get("/admissions/enquiries");
      setEnquiries(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = { ...formData };
      if (!payload.email) delete payload.email;
      if (!payload.notes) delete payload.notes;
      await api.post("/admissions/enquiries", payload);
      setShowNewModal(false);
      setFormData({ student_name: "", parent_name: "", contact_number: "", email: "", notes: "" });
      fetchEnquiries();
    } catch (err) {
      console.error(err);
      alert("Failed to create enquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStage = async (id: string, stage: string) => {
    try {
      const form = new FormData();
      form.append("stage", stage);
      await api.put(`/admissions/enquiries/${id}/stage`, form);
      fetchEnquiries();
      setReviewEnquiry(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update stage");
    }
  };

  const handleConvertToStudent = async (id: string) => {
    try {
      const res = await api.post(`/admissions/enquiries/${id}/convert`);
      fetchEnquiries();
      setReviewEnquiry(null);
      alert(res.data?.message || "Converted to student.");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to convert to student");
    }
  };

  const filtered = enquiries.filter((e) =>
    (e.student_name || "").toLowerCase().includes(search.toLowerCase())
  );
  const pendingCount = enquiries.filter(
    (e) => e.stage === "New" || e.stage === "Under Review"
  ).length;
  const approvedCount = enquiries.filter((e) => e.stage === "Admitted").length;
  const rejectedCount = enquiries.filter((e) => e.stage === "Rejected").length;

  return (
    <div>
      <PageHeader
        title="Admissions Pipeline"
        description="Manage new student applications and enrollments."
        action={
          <Button onClick={() => setShowNewModal(true)}>
            <Plus size={16} /> New Application
          </Button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Applications"
          value={enquiries.length}
          icon={<UserPlus size={20} />}
          iconClassName="bg-primary-50 text-primary-600"
        />
        <StatCard
          title="Pending / New"
          value={pendingCount}
          icon={<Clock size={20} />}
          iconClassName="bg-warning-bg text-warning-text"
        />
        <StatCard
          title="Admitted"
          value={approvedCount}
          icon={<CheckCircle size={20} />}
          iconClassName="bg-success-bg text-success-text"
        />
        <StatCard
          title="Rejected"
          value={rejectedCount}
          icon={<XCircle size={20} />}
          iconClassName="bg-danger-bg text-danger-text"
        />
      </div>

      <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Input
              placeholder="Search applications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<UserPlus size={22} />}
            title={search ? "No matching applications" : "No applications yet"}
            description={
              search
                ? "Try a different name."
                : "New enquiries will appear here, or add one manually."
            }
            action={
              !search && (
                <Button onClick={() => setShowNewModal(true)}>
                  <Plus size={16} /> New Application
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Date", "Student", "Parent Contact", "Class", "Stage", "Action"].map((h) => (
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
                {filtered.map((app, idx) => (
                  <tr key={idx} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3 text-sm text-ink-muted">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-ink">{app.student_name}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-ink">{app.parent_name}</p>
                      <p className="text-xs text-ink-faint">{app.contact_number}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted">
                      {app.admission_for_class || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={stageVariant(app.stage)}>
                        {stageIcon(app.stage)}
                        {app.stage}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => setReviewEnquiry(app)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Application modal */}
      <Modal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="New Application"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNewModal(false)}>
              Cancel
            </Button>
            <Button type="submit" form="new-enquiry-form" disabled={submitting}>
              {submitting ? "Saving..." : "Create Application"}
            </Button>
          </>
        }
      >
        <form id="new-enquiry-form" onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <Label required>Student Name</Label>
            <Input
              required
              value={formData.student_name}
              onChange={(e) => set("student_name", e.target.value)}
            />
          </div>
          <div>
            <Label required>Parent Name</Label>
            <Input
              required
              value={formData.parent_name}
              onChange={(e) => set("parent_name", e.target.value)}
            />
          </div>
          <div>
            <Label required>Contact Number</Label>
            <Input
              required
              value={formData.contact_number}
              onChange={(e) => set("contact_number", e.target.value)}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* Review modal */}
      <Modal
        open={!!reviewEnquiry}
        onClose={() => setReviewEnquiry(null)}
        title="Review Application"
      >
        {reviewEnquiry && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Student Name", reviewEnquiry.student_name],
                ["Parent Name", reviewEnquiry.parent_name],
                ["Contact Number", reviewEnquiry.contact_number],
                ["Email", reviewEnquiry.email || "—"],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <p className="text-ink-muted">{k}</p>
                  <p className="font-semibold text-ink">{v}</p>
                </div>
              ))}
              <div className="col-span-2">
                <p className="text-ink-muted mb-1">Current Stage</p>
                <Badge variant={stageVariant(reviewEnquiry.stage)}>{reviewEnquiry.stage}</Badge>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-semibold text-ink mb-3">Actions</p>
              <div className="flex flex-wrap gap-3">
                {reviewEnquiry.stage !== "Admitted" && (
                  <Button onClick={() => handleConvertToStudent(reviewEnquiry.id)}>
                    <CheckCircle size={16} /> Convert to Student
                  </Button>
                )}
                {reviewEnquiry.stage !== "Under Review" && reviewEnquiry.stage !== "Admitted" && (
                  <Button
                    variant="secondary"
                    onClick={() => handleUpdateStage(reviewEnquiry.id, "Under Review")}
                  >
                    Mark Under Review
                  </Button>
                )}
                {reviewEnquiry.stage !== "Rejected" && reviewEnquiry.stage !== "Admitted" && (
                  <Button
                    variant="danger"
                    onClick={() => handleUpdateStage(reviewEnquiry.id, "Rejected")}
                  >
                    <XCircle size={16} /> Reject
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

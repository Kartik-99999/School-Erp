"use client";
import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubNav } from "@/components/ui/SubNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getClasses, Class, getAcademicYears } from "@/lib/api/setup";
import { getExamTypes, createExamType, getExams, createExam } from "@/lib/api/exams";
import { Calendar, FileText, Settings } from "lucide-react";

const tabs = [
  { href: "/admin/exams/setup", label: "Configuration" },
  { href: "/admin/exams/marks", label: "Marks Entry" },
  { href: "/admin/exams/results", label: "Results & Report Cards" },
  { href: "/admin/exams/grades", label: "Grade Scales" },
];

export default function ExamSetupPage() {
  const [activeYearId, setActiveYearId] = useState("");
  const [classes, setClasses] = useState<Class[]>([]);
  const [examTypes, setExamTypes] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: "", weightage_percent: "" });
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examForm, setExamForm] = useState({
    exam_type_id: "",
    class_id: "",
    name: "",
    start_date: "",
    end_date: "",
  });

  const loadData = async () => {
    try {
      const [yrRes, clsRes, typeRes] = await Promise.all([
        getAcademicYears(),
        getClasses(),
        getExamTypes(),
      ]);
      const active = yrRes.data.find((y: any) => y.is_active);
      if (active) {
        setActiveYearId(active.id);
        const exRes = await getExams(undefined, active.id);
        setExams(exRes.data || []);
      }
      setClasses(clsRes.data || []);
      setExamTypes(typeRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, []);

  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createExamType({
        name: typeForm.name,
        weightage_percent: typeForm.weightage_percent
          ? parseFloat(typeForm.weightage_percent)
          : null,
      });
      setIsTypeModalOpen(false);
      setTypeForm({ name: "", weightage_percent: "" });
      loadData();
    } catch {
      alert("Failed to add exam type");
    }
  };
  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createExam({
        ...examForm,
        academic_year_id: activeYearId,
        start_date: examForm.start_date || undefined,
        end_date: examForm.end_date || undefined,
      });
      setIsExamModalOpen(false);
      setExamForm({ exam_type_id: "", class_id: "", name: "", start_date: "", end_date: "" });
      loadData();
    } catch {
      alert("Failed to schedule exam");
    }
  };

  return (
    <div>
      <SubNav items={tabs} />
      <PageHeader
        title="Exam Setup"
        description="Define exam types and schedule new examinations for classes."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsTypeModalOpen(true)}>
              <Settings size={16} /> Manage Types
            </Button>
            <Button onClick={() => setIsExamModalOpen(true)}>
              <Calendar size={16} /> Schedule Exam
            </Button>
          </div>
        }
      />

      <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-base font-semibold text-ink">Scheduled Exams (Current Year)</h2>
        </div>
        {loading ? (
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-input" />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <EmptyState
            icon={<FileText size={22} />}
            title="No exams scheduled"
            description="Schedule an exam to get started."
          />
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((ex) => {
              const cls = classes.find((c) => c.id === ex.class_id);
              return (
                <div key={ex.id} className="border border-border rounded-input p-4">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h4 className="font-semibold text-ink">{ex.name}</h4>
                    <Badge variant="info">{cls?.name || "—"}</Badge>
                  </div>
                  <p className="text-xs text-ink-muted flex items-center gap-1 mb-2">
                    <Calendar size={12} /> {ex.start_date || "TBD"} → {ex.end_date || "TBD"}
                  </p>
                  <Badge variant={ex.status === "Published" ? "success" : "warning"}>
                    {ex.status || "Scheduled"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Exam Types modal */}
      <Modal
        open={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        title="Exam Types"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsTypeModalOpen(false)}>
              Close
            </Button>
            <Button type="submit" form="type-form">
              Add Type
            </Button>
          </>
        }
      >
        <div className="space-y-1 mb-4">
          {examTypes.length === 0 && <p className="text-sm text-ink-muted">No exam types yet.</p>}
          {examTypes.map((t) => (
            <div key={t.id} className="flex justify-between text-sm py-1.5 border-b border-border">
              <span className="text-ink">{t.name}</span>
              <span className="text-ink-muted">
                {t.weightage_percent ? `${t.weightage_percent}%` : ""}
              </span>
            </div>
          ))}
        </div>
        <form id="type-form" onSubmit={handleTypeSubmit} className="space-y-3">
          <div>
            <Label required>Name</Label>
            <Input
              required
              placeholder="e.g. Unit Test 1"
              value={typeForm.name}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      {/* Schedule Exam modal */}
      <Modal
        open={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        title="Schedule Exam"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsExamModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="exam-form">
              Create Exam
            </Button>
          </>
        }
      >
        <form id="exam-form" onSubmit={handleExamSubmit} className="space-y-4">
          <div>
            <Label required>Exam Type</Label>
            <Select
              required
              value={examForm.exam_type_id}
              onChange={(e) => setExamForm({ ...examForm, exam_type_id: e.target.value })}
            >
              <option value="">Select</option>
              {examTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label required>Target Class</Label>
            <Select
              required
              value={examForm.class_id}
              onChange={(e) => setExamForm({ ...examForm, class_id: e.target.value })}
            >
              <option value="">Select</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label required>Exam Name</Label>
            <Input
              required
              placeholder="e.g. Class 10 Mid-Terms"
              value={examForm.name}
              onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={examForm.start_date}
                onChange={(e) => setExamForm({ ...examForm, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={examForm.end_date}
                onChange={(e) => setExamForm({ ...examForm, end_date: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

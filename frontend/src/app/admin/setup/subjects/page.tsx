"use client";
import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import {
  getSubjects,
  createSubject,
  Subject,
  Class,
  getClasses,
  getClassSubjects,
  addClassSubject,
  removeClassSubject,
} from "@/lib/api/setup";
import { BookOpen, Plus, Check } from "lucide-react";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "", type: "Theory" });
  const [error, setError] = useState("");

  const [selectedClass, setSelectedClass] = useState("");
  const [mapped, setMapped] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const fetchBase = async () => {
    try {
      const [sRes, cRes] = await Promise.all([getSubjects(), getClasses()]);
      setSubjects(sRes.data || []);
      setClasses(cRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchBase();
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setMapped(new Set());
      return;
    }
    getClassSubjects(selectedClass)
      .then((res) => setMapped(new Set((res.data || []).map((s: any) => s.id))))
      .catch(() => {});
  }, [selectedClass]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await createSubject(formData);
      setIsModalOpen(false);
      setFormData({ name: "", code: "", type: "Theory" });
      fetchBase();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create subject");
    }
  };

  const toggleSubject = async (subjectId: string) => {
    if (!selectedClass) return;
    setBusy(subjectId);
    const isMapped = mapped.has(subjectId);
    try {
      if (isMapped) {
        await removeClassSubject(selectedClass, subjectId);
        setMapped((p) => {
          const n = new Set(p);
          n.delete(subjectId);
          return n;
        });
      } else {
        await addClassSubject(selectedClass, subjectId);
        setMapped((p) => new Set(p).add(subjectId));
      }
    } catch {
      alert("Failed to update mapping.");
    } finally {
      setBusy(null);
    }
  };

  const columns = [
    {
      accessorKey: "name",
      header: "Subject Name",
      cell: ({ row }: any) => <span className="font-medium text-ink">{row.original.name}</span>,
    },
    { accessorKey: "code", header: "Code" },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }: any) => <Badge variant="info">{row.original.type}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Subjects"
        description="Manage subjects and assign them to each grade."
        action={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Add Subject
          </Button>
        }
      />

      <section className="mb-6">
        <h2 className="text-base font-semibold text-ink mb-3">All Subjects</h2>
        {loading ? (
          <div className="py-8 text-center text-ink-muted">Loading...</div>
        ) : (
          <DataTable columns={columns} data={subjects} />
        )}
      </section>

      <section className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Subjects per Grade</h2>
            <p className="text-sm text-ink-muted mt-0.5">
              Pick a grade, then toggle the subjects it teaches.
            </p>
          </div>
          <div className="w-full sm:max-w-xs">
            <Label>Grade / Class</Label>
            <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">Choose a class…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {!selectedClass ? (
          <EmptyState
            icon={<BookOpen size={22} />}
            title="Pick a grade"
            description="Select a class to manage its subjects."
          />
        ) : subjects.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={22} />}
            title="No subjects yet"
            description="Add subjects first, then assign them here."
          />
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map((s) => {
              const on = mapped.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSubject(s.id)}
                  disabled={busy === s.id}
                  className={cn(
                    "flex items-center justify-between gap-2 p-3 rounded-input border text-left transition-colors disabled:opacity-50",
                    on
                      ? "bg-primary-50 border-primary-500"
                      : "bg-surface-card border-border hover:bg-surface"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{s.name}</p>
                    <p className="text-xs text-ink-faint">{s.code || s.type}</p>
                  </div>
                  <span
                    className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center shrink-0",
                      on ? "bg-primary-600 border-primary-600 text-white" : "border-border"
                    )}
                  >
                    {on && <Check size={14} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Subject"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="subject-form">
              Save
            </Button>
          </>
        }
      >
        {error && (
          <div className="mb-4 p-2 bg-danger-bg text-danger-text rounded-input text-sm">
            {error}
          </div>
        )}
        <form id="subject-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label required>Subject Name</Label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Code</Label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="Theory">Theory</option>
              <option value="Practical">Practical</option>
              <option value="Activity">Activity</option>
            </Select>
          </div>
        </form>
      </Modal>
    </div>
  );
}

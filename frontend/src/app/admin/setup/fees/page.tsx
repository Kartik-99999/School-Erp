"use client";
import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getClasses,
  getAcademicYears,
  getFeeHeads,
  createFeeHead,
  getFeeStructures,
  createFeeStructure,
  Class,
  FeeHead,
} from "@/lib/api/setup";
import { DollarSign, Plus, Save, Tag } from "lucide-react";

const FREQS = ["Monthly", "Quarterly", "Yearly", "One-Time"];

export default function FeesSetupPage() {
  const [heads, setHeads] = useState<FeeHead[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [activeYearId, setActiveYearId] = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedClass, setSelectedClass] = useState("");
  const [rows, setRows] = useState<Record<string, { amount: string; frequency: string }>>({});
  const [loadingStruct, setLoadingStruct] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isHeadModalOpen, setIsHeadModalOpen] = useState(false);
  const [headForm, setHeadForm] = useState({ name: "", description: "" });
  const [savingHead, setSavingHead] = useState(false);

  const loadBase = async () => {
    try {
      const [hRes, cRes, yRes] = await Promise.all([
        getFeeHeads(),
        getClasses(),
        getAcademicYears(),
      ]);
      setHeads(hRes.data || []);
      setClasses(cRes.data || []);
      const active = (yRes.data || []).find((y: any) => y.is_active);
      if (active) setActiveYearId(active.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setRows({});
      return;
    }
    (async () => {
      setLoadingStruct(true);
      try {
        const res = await getFeeStructures(selectedClass);
        const existing = res.data || [];
        const next: Record<string, { amount: string; frequency: string }> = {};
        heads.forEach((h) => {
          const s = existing.find(
            (x: any) => x.fee_head_id === h.id && x.academic_year_id === activeYearId
          );
          next[h.id] = {
            amount: s ? String(s.amount) : "",
            frequency: s ? s.frequency : "Monthly",
          };
        });
        setRows(next);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingStruct(false);
      }
    })();
  }, [selectedClass, heads]);

  const setRow = (headId: string, patch: Partial<{ amount: string; frequency: string }>) =>
    setRows((p) => ({ ...p, [headId]: { ...p[headId], ...patch } }));

  const handleAddHead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHead(true);
    try {
      await createFeeHead(headForm);
      setIsHeadModalOpen(false);
      setHeadForm({ name: "", description: "" });
      loadBase();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add fee head");
    } finally {
      setSavingHead(false);
    }
  };

  const handleSaveStructure = async () => {
    if (!selectedClass) return;
    if (!activeYearId)
      return alert("No active academic year set. Configure one under Academic Years first.");
    setSaving(true);
    try {
      const toSave = heads.filter((h) => rows[h.id] && Number(rows[h.id].amount) > 0);
      if (toSave.length === 0) {
        alert("Enter at least one amount.");
        setSaving(false);
        return;
      }
      await Promise.all(
        toSave.map((h) =>
          createFeeStructure({
            academic_year_id: activeYearId,
            class_id: selectedClass,
            fee_head_id: h.id,
            amount: Number(rows[h.id].amount),
            frequency: rows[h.id].frequency,
          } as any)
        )
      );
      const total = toSave.reduce((s, h) => s + Number(rows[h.id].amount), 0);
      alert(
        `Saved fee structure for this grade (${toSave.length} heads, ₹${total.toLocaleString("en-IN")}).`
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save fee structure");
    } finally {
      setSaving(false);
    }
  };

  const className = classes.find((c) => c.id === selectedClass)?.name;

  return (
    <div>
      <PageHeader
        title="Fee Setup"
        description="Define fee heads, then set a different amount per grade."
        action={
          <Button variant="secondary" onClick={() => setIsHeadModalOpen(true)}>
            <Plus size={16} /> Add Fee Head
          </Button>
        }
      />

      {/* Fee heads catalog */}
      <section className="bg-surface-card rounded-card border border-border shadow-card p-6 mb-6">
        <h2 className="text-base font-semibold text-ink mb-3">Fee Heads</h2>
        {loading ? (
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-7 w-28 rounded-badge" />
            ))}
          </div>
        ) : heads.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No fee heads yet. Add one (e.g. Tuition, Transport, Hostel).
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {heads.map((h) => (
              <Badge key={h.id} variant="info">
                <Tag size={12} /> {h.name}
              </Badge>
            ))}
          </div>
        )}
      </section>

      {/* Per-grade fee structure */}
      <section className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="w-full sm:max-w-xs">
            <Label>Select Grade / Class</Label>
            <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">Choose a class…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          {selectedClass && (
            <Button onClick={handleSaveStructure} disabled={saving || loadingStruct}>
              <Save size={16} /> {saving ? "Saving..." : "Save Fee Structure"}
            </Button>
          )}
        </div>

        {!selectedClass ? (
          <EmptyState
            icon={<DollarSign size={22} />}
            title="Pick a grade to set its fees"
            description="Each grade can have a different amount for every fee head."
          />
        ) : heads.length === 0 ? (
          <EmptyState
            icon={<Tag size={22} />}
            title="Add fee heads first"
            description="Create fee heads above, then set their amounts per grade."
          />
        ) : loadingStruct ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Fee Head — {className}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted w-48">
                    Amount (₹)
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted w-48">
                    Frequency
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {heads.map((h) => (
                  <tr key={h.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-ink">{h.name}</p>
                      {h.description && <p className="text-xs text-ink-faint">{h.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min="0"
                        step="50"
                        placeholder="0"
                        className="py-1.5"
                        value={rows[h.id]?.amount ?? ""}
                        onChange={(e) => setRow(h.id, { amount: e.target.value })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        className="py-1.5"
                        value={rows[h.id]?.frequency ?? "Monthly"}
                        onChange={(e) => setRow(h.id, { frequency: e.target.value })}
                      >
                        {FREQS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={isHeadModalOpen}
        onClose={() => setIsHeadModalOpen(false)}
        title="Add Fee Head"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsHeadModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="head-form" disabled={savingHead}>
              {savingHead ? "Saving..." : "Add"}
            </Button>
          </>
        }
      >
        <form id="head-form" onSubmit={handleAddHead} className="space-y-4">
          <div>
            <Label required>Name</Label>
            <Input
              required
              placeholder="e.g. Tuition Fee"
              value={headForm.name}
              onChange={(e) => setHeadForm({ ...headForm, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              placeholder="Optional"
              value={headForm.description}
              onChange={(e) => setHeadForm({ ...headForm, description: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

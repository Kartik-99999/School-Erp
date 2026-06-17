"use client";
import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubNav } from "@/components/ui/SubNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getGradeScales, createGradeScale } from "@/lib/api/exams";
import { Award, Plus, Trash2, Star } from "lucide-react";

const tabs = [
  { href: "/admin/exams/setup", label: "Configuration" },
  { href: "/admin/exams/marks", label: "Marks Entry" },
  { href: "/admin/exams/results", label: "Results" },
  { href: "/admin/exams/grades", label: "Grade Scales" },
];

type Rule = { min: number; max: number; grade: string; points: number };
const DEFAULT_RULES: Rule[] = [
  { min: 91, max: 100, grade: "A1", points: 10 },
  { min: 81, max: 90, grade: "A2", points: 9 },
  { min: 71, max: 80, grade: "B1", points: 8 },
  { min: 61, max: 70, grade: "B2", points: 7 },
  { min: 51, max: 60, grade: "C1", points: 6 },
  { min: 41, max: 50, grade: "C2", points: 5 },
  { min: 33, max: 40, grade: "D", points: 4 },
  { min: 0, max: 32, grade: "E", points: 0 },
];

export default function GradeScalesPage() {
  const [scales, setScales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);

  const load = async () => {
    try {
      const res = await getGradeScales();
      setScales(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const setRule = (i: number, patch: Partial<Rule>) =>
    setRules((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRule = () => setRules((p) => [...p, { min: 0, max: 0, grade: "", points: 0 }]);
  const removeRule = (i: number) => setRules((p) => p.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!name.trim()) return alert("Enter a name for the grade scale.");
    setSaving(true);
    try {
      await createGradeScale({
        name,
        is_default: isDefault,
        rules: rules.map((r) => ({
          min: Number(r.min),
          max: Number(r.max),
          grade: r.grade,
          points: Number(r.points),
        })),
      });
      setOpen(false);
      setName("");
      setIsDefault(true);
      setRules(DEFAULT_RULES);
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save grade scale.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SubNav items={tabs} />
      <PageHeader
        title="Grade Scales"
        description="Define how percentages map to grades. The default scale is used by the result engine."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> New Grade Scale
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-44 rounded-card" />
          ))}
        </div>
      ) : scales.length === 0 ? (
        <div className="bg-surface-card rounded-card border border-border shadow-card">
          <EmptyState
            icon={<Award size={22} />}
            title="No grade scales yet"
            description="Create one (the standard CBSE 8-band scale is pre-filled). Until then, the engine uses a built-in default."
            action={
              <Button onClick={() => setOpen(true)}>
                <Plus size={16} /> New Grade Scale
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scales.map((s) => (
            <div
              key={s.id}
              className="bg-surface-card rounded-card border border-border shadow-card p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                  <Award size={18} className="text-primary-600" /> {s.name}
                </h3>
                {s.is_default && (
                  <Badge variant="success">
                    <Star size={12} /> Default
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(s.rules || []).map((r: Rule, i: number) => (
                  <Badge key={i} variant="neutral">
                    {r.grade}: {r.min}–{r.max}%
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New Grade Scale"
        className="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Scale"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Scale Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CBSE Standard"
              />
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink">
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary-600"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              Use as default scale
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Grade Bands</Label>
              <Button variant="ghost" size="sm" onClick={addRule}>
                <Plus size={14} /> Add Band
              </Button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-ink-muted px-1">
                <span className="col-span-3">Min %</span>
                <span className="col-span-3">Max %</span>
                <span className="col-span-3">Grade</span>
                <span className="col-span-2">Points</span>
                <span className="col-span-1" />
              </div>
              {rules.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    className="col-span-3 py-1.5"
                    type="number"
                    value={r.min}
                    onChange={(e) => setRule(i, { min: Number(e.target.value) })}
                  />
                  <Input
                    className="col-span-3 py-1.5"
                    type="number"
                    value={r.max}
                    onChange={(e) => setRule(i, { max: Number(e.target.value) })}
                  />
                  <Input
                    className="col-span-3 py-1.5"
                    value={r.grade}
                    onChange={(e) => setRule(i, { grade: e.target.value })}
                  />
                  <Input
                    className="col-span-2 py-1.5"
                    type="number"
                    value={r.points}
                    onChange={(e) => setRule(i, { points: Number(e.target.value) })}
                  />
                  <button
                    onClick={() => removeRule(i)}
                    className="col-span-1 flex justify-center text-ink-faint hover:text-danger-text"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

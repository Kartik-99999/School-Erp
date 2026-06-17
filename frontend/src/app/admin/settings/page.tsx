"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Save } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/settings/me");
        setSchool(res.data?.data || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (k: string, v: string) => setSchool((p: any) => ({ ...p, [k]: v }));

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put("/settings/me", {
        name: school.name,
        contact_email: school.contact_email,
        contact_phone: school.contact_phone,
        address: school.address,
        board_affiliation: school.board_affiliation,
        grading_system: school.grading_system,
      });
      alert("Settings saved.");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  const gradingOptions = [
    {
      value: "percentage",
      title: "Percentage (%)",
      desc: "Classic 0–100 percentage based grading.",
    },
    { value: "cgpa", title: "CGPA / GPA", desc: "Point-based grading (e.g. 4.0 or 10.0 scale)." },
  ];

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="School Settings"
        description="Manage your school profile and academic configuration."
        action={
          <Button onClick={saveSettings} disabled={saving}>
            <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        }
      />

      <div className="space-y-6">
        <section className="bg-surface-card rounded-card border border-border shadow-card p-6">
          <h2 className="text-base font-semibold text-ink mb-4">School Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Label>School Name</Label>
              <Input value={school?.name || ""} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <Label>Board Affiliation</Label>
              <Input
                value={school?.board_affiliation || ""}
                onChange={(e) => set("board_affiliation", e.target.value)}
                placeholder="e.g. CBSE"
              />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={school?.contact_email || ""}
                onChange={(e) => set("contact_email", e.target.value)}
              />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input
                value={school?.contact_phone || ""}
                onChange={(e) => set("contact_phone", e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Textarea
                rows={2}
                value={school?.address || ""}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="bg-surface-card rounded-card border border-border shadow-card p-6">
          <h2 className="text-base font-semibold text-ink mb-1">Academics Configuration</h2>
          <p className="text-sm text-ink-muted mb-4">
            Choose how results and performance are calculated across the platform.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {gradingOptions.map((opt) => {
              const selected = school?.grading_system === opt.value;
              return (
                <label
                  key={opt.value}
                  className={cn(
                    "cursor-pointer p-5 border rounded-input flex items-start gap-3 transition-all",
                    selected
                      ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500"
                      : "border-border hover:border-border-strong"
                  )}
                >
                  <input
                    type="radio"
                    name="grading_system"
                    value={opt.value}
                    checked={selected}
                    onChange={(e) => set("grading_system", e.target.value)}
                    className="mt-0.5 w-4 h-4 accent-primary-600"
                  />
                  <div>
                    <h4 className={cn("font-semibold", selected ? "text-primary-700" : "text-ink")}>
                      {opt.title}
                    </h4>
                    <p className="text-sm text-ink-muted mt-1">{opt.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

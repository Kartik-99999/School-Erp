"use client";
import React, { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Users, DollarSign, BookOpenCheck, Download } from "lucide-react";
import { downloadFile } from "@/lib/download";

const reports = [
  {
    title: "Student Strength",
    desc: "Class- and gender-wise count of all active students.",
    icon: Users,
    chip: "bg-primary-50 text-primary-600",
    path: "/reports/export/student-strength",
    file: "student_strength_report.csv",
  },
  {
    title: "Fee Defaulters",
    desc: "Students with overdue balances and pending amounts.",
    icon: DollarSign,
    chip: "bg-danger-bg text-danger-text",
    path: "/reports/export/fee-defaulters",
    file: "fee_defaulters_report.csv",
  },
  {
    title: "Library Overdue",
    desc: "Books issued and not returned past their due date.",
    icon: BookOpenCheck,
    chip: "bg-warning-bg text-warning-text",
    path: "/reports/export/library-overdue",
    file: "library_overdue_report.csv",
  },
];

export default function AdminReportsHubPage() {
  const [busy, setBusy] = useState<string | null>(null);

  const handleDownload = async (path: string, file: string) => {
    setBusy(path);
    try {
      await downloadFile(path, file);
    } catch (err) {
      console.error(err);
      alert("Could not generate the report.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader title="Reports Hub" description="Generate and export reports across modules." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div
            key={r.title}
            className="bg-surface-card p-6 rounded-card border border-border shadow-card flex flex-col"
          >
            <div className={`w-12 h-12 rounded-xl ${r.chip} flex items-center justify-center mb-4`}>
              <r.icon size={22} />
            </div>
            <h3 className="text-base font-semibold text-ink mb-1">{r.title}</h3>
            <p className="text-sm text-ink-muted mb-6 flex-1">{r.desc}</p>
            <Button
              variant="secondary"
              onClick={() => handleDownload(r.path, r.file)}
              disabled={busy === r.path}
            >
              <Download size={16} /> {busy === r.path ? "Generating..." : "Download CSV"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

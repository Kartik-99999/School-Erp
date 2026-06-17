"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubNav } from "@/components/ui/SubNav";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { FileText, CheckCircle, CalendarClock, Plus } from "lucide-react";

const tabs = [
  { href: "/admin/exams", label: "Overview" },
  { href: "/admin/exams/setup", label: "Configuration" },
  { href: "/admin/exams/marks", label: "Marks Entry" },
  { href: "/admin/exams/results", label: "Results" },
  { href: "/admin/exams/grades", label: "Grade Scales" },
];

export default function AdminExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/exams");
        setExams(res.data?.data || []);
      } catch {
        setExams([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const published = exams.filter((e) => e.status === "Published").length;
  const scheduled = exams.length - published;

  return (
    <div>
      <PageHeader
        title="Exams & Grading"
        description="Manage exam schedules, enter marks, and process results."
        action={
          <Button onClick={() => router.push("/admin/exams/setup")}>
            <Plus size={16} /> Create Exam
          </Button>
        }
      />
      <SubNav items={tabs} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Exams"
          value={exams.length}
          icon={<FileText size={20} />}
          iconClassName="bg-primary-50 text-primary-600"
        />
        <StatCard
          title="Scheduled"
          value={scheduled}
          icon={<CalendarClock size={20} />}
          iconClassName="bg-warning-bg text-warning-text"
        />
        <StatCard
          title="Results Published"
          value={published}
          icon={<CheckCircle size={20} />}
          iconClassName="bg-success-bg text-success-text"
        />
      </div>

      <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-base font-semibold text-ink">All Exams</h2>
        </div>
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : exams.length === 0 ? (
          <EmptyState
            icon={<FileText size={22} />}
            title="No exams yet"
            description="Create an exam and schedule its papers under Configuration."
            action={
              <Button onClick={() => router.push("/admin/exams/setup")}>
                <Plus size={16} /> Create Exam
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Exam Name", "Class", "Start", "End", "Status"].map((h) => (
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
                {exams.map((exam, idx) => (
                  <tr key={idx} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-ink">{exam.name}</td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{exam.class_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-ink-muted">
                      {exam.start_date ? new Date(exam.start_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted">
                      {exam.end_date ? new Date(exam.end_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={exam.status === "Published" ? "success" : "warning"}>
                        {exam.status || "Scheduled"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

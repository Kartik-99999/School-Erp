"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubNav } from "@/components/ui/SubNav";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select, Label } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { getClasses, Class } from "@/lib/api/setup";
import { getExams, processExamResults, getExamResults, getReportCardUrl } from "@/lib/api/exams";
import { getStudents, Student } from "@/lib/api/students";
import { downloadFile } from "@/lib/download";
import { Calculator, Download, FileText } from "lucide-react";

const tabs = [
  { href: "/admin/exams/setup", label: "Configuration" },
  { href: "/admin/exams/marks", label: "Marks Entry" },
  { href: "/admin/exams/results", label: "Results & Report Cards" },
  { href: "/admin/exams/grades", label: "Grade Scales" },
];

export default function ExamResultsPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    getClasses().then((res) => setClasses(res.data || []));
  }, []);
  useEffect(() => {
    if (selectedClass) {
      getExams(selectedClass).then((res) => setExams(res.data || []));
      getStudents({ class_id: selectedClass }).then((res) => setStudents(res.data || []));
    } else {
      setExams([]);
      setStudents([]);
    }
    setSelectedExam("");
    setResults([]);
  }, [selectedClass]);

  const loadResults = async () => {
    if (!selectedExam) return;
    setLoading(true);
    try {
      const res = await getExamResults(selectedExam);
      setResults(res.data || []);
    } catch {
      alert("Failed to load results");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadResults();
  }, [selectedExam]);

  const handleProcess = async () => {
    if (!selectedExam) return;
    setProcessing(true);
    try {
      await processExamResults(selectedExam);
      alert("Results processed and published.");
      loadResults();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to process results");
    } finally {
      setProcessing(false);
    }
  };

  const studentName = (id: string) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.first_name} ${s.last_name}` : "Unknown";
  };
  const studentAdm = (id: string) => {
    const s = students.find((x) => x.id === id);
    return s ? s.admission_number : "—";
  };

  const downloadReport = async (studentId: string) => {
    try {
      const full = getReportCardUrl(selectedExam, studentId);
      await downloadFile(full.replace(api.defaults.baseURL || "", ""), `report_card.pdf`);
    } catch {
      alert("Could not generate the report card.");
    }
  };

  const columns = [
    {
      accessorKey: "rank",
      header: "Rank",
      cell: ({ row }: any) => <span className="font-semibold text-ink">{row.original.rank}</span>,
    },
    {
      id: "adm",
      header: "Adm No.",
      cell: ({ row }: any) => (
        <span className="text-ink-muted">{studentAdm(row.original.student_id)}</span>
      ),
    },
    {
      id: "name",
      header: "Student",
      cell: ({ row }: any) => (
        <span className="font-medium text-ink">{studentName(row.original.student_id)}</span>
      ),
    },
    { accessorKey: "total_marks", header: "Max" },
    { accessorKey: "obtained_marks", header: "Obtained" },
    {
      accessorKey: "percentage",
      header: "%",
      cell: ({ row }: any) => (
        <span className="font-semibold text-ink">{row.original.percentage}%</span>
      ),
    },
    {
      accessorKey: "grade",
      header: "Grade",
      cell: ({ row }: any) => <span className="font-semibold text-ink">{row.original.grade}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.status === "Pass" ? "success" : "danger"}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Report Card",
      cell: ({ row }: any) => (
        <Button variant="ghost" size="sm" onClick={() => downloadReport(row.original.student_id)}>
          <Download size={14} /> PDF
        </Button>
      ),
    },
  ];

  return (
    <div>
      <SubNav items={tabs} />
      <PageHeader
        title="Results & Report Cards"
        description="Process raw marks into final results, calculate ranks, and generate report cards."
      />

      <div className="bg-surface-card p-5 rounded-card border border-border shadow-card mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Class</Label>
          <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="">Select</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Exam</Label>
          <Select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            disabled={!selectedClass}
          >
            <option value="">Select</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.status || "Scheduled"}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {selectedExam && (
        <div className="mb-6 bg-info-bg border border-info-border rounded-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-info-text flex items-center gap-2">
              <Calculator size={18} /> Process Results Engine
            </h3>
            <p className="text-sm text-info-text/90 mt-1">
              Aggregates marks, applies the active grade scale, computes percentages and class
              ranks.
            </p>
          </div>
          <Button onClick={handleProcess} disabled={processing}>
            {processing ? "Processing..." : "Run Result Engine"}
          </Button>
        </div>
      )}

      {selectedExam &&
        (loading ? (
          <div className="bg-surface-card rounded-card border border-border shadow-card">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : results.length > 0 ? (
          <DataTable columns={columns} data={results} />
        ) : (
          <EmptyState
            icon={<FileText size={22} />}
            title="No results yet"
            description='Enter marks, then click "Run Result Engine".'
          />
        ))}
    </div>
  );
}

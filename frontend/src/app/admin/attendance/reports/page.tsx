"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubNav } from "@/components/ui/SubNav";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input, Select, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { getClasses, getSectionsForClass, Class, Section } from "@/lib/api/setup";
import { getAttendanceThreshold, getMonthlyRegisterUrl } from "@/lib/api/attendance";
import { downloadFile } from "@/lib/download";
import { Download, AlertCircle } from "lucide-react";

const tabs = [
  { href: "/admin/attendance/students", label: "Student Attendance" },
  { href: "/admin/attendance/staff", label: "Staff Attendance" },
  { href: "/admin/attendance/reports", label: "Reports & Registers" },
];

export default function AttendanceReportsPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [regMonth, setRegMonth] = useState("");
  const [downloading, setDownloading] = useState(false);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  useEffect(() => {
    getClasses().then((res) => setClasses(res.data || []));
    getAttendanceThreshold(undefined, 75).then((res) => {
      setAlerts(res.data || []);
      setLoadingAlerts(false);
    });
  }, []);

  useEffect(() => {
    if (selectedClass)
      getSectionsForClass(selectedClass).then((res) => setSections(res.data || []));
    else setSections([]);
    setSelectedSection("");
  }, [selectedClass]);

  const handleDownload = async () => {
    if (!selectedClass || !selectedSection || !regMonth) return;
    setDownloading(true);
    try {
      const full = getMonthlyRegisterUrl(
        selectedClass,
        selectedSection,
        parseInt(regMonth.split("-")[1]),
        parseInt(regMonth.split("-")[0])
      );
      const path = full.replace(api.defaults.baseURL || "", "");
      await downloadFile(path, `attendance_register_${regMonth}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Could not generate the register.");
    } finally {
      setDownloading(false);
    }
  };

  const alertColumns = [
    { accessorKey: "admission_number", header: "Adm No." },
    { accessorKey: "student_name", header: "Student Name" },
    { accessorKey: "total_days", header: "Total Days" },
    { accessorKey: "present_days", header: "Present" },
    {
      accessorKey: "percentage",
      header: "Percentage",
      cell: ({ row }: any) => <Badge variant="danger">{row.original.percentage}%</Badge>,
    },
  ];

  return (
    <div>
      <SubNav items={tabs} />
      <PageHeader
        title="Attendance Reports"
        description="Generate official PDF registers and monitor low attendance."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <section className="bg-surface-card p-6 rounded-card border border-border shadow-card">
          <h2 className="text-base font-semibold text-ink mb-4">Monthly Register (PDF)</h2>
          <div className="space-y-4">
            <div>
              <Label>Class</Label>
              <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Section</Label>
              <Select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
                <option value="">Select Section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Month &amp; Year</Label>
              <Input type="month" value={regMonth} onChange={(e) => setRegMonth(e.target.value)} />
            </div>
            <Button
              onClick={handleDownload}
              disabled={!selectedClass || !selectedSection || !regMonth || downloading}
              className="w-full"
            >
              <Download size={16} /> {downloading ? "Generating..." : "Download Register"}
            </Button>
          </div>
        </section>

        <section className="bg-info-bg border border-info-border p-6 rounded-card flex flex-col justify-center">
          <AlertCircle size={36} className="text-info-text mb-3" />
          <h2 className="text-base font-semibold text-info-text mb-1">Threshold Alerts</h2>
          <p className="text-sm text-info-text/90">
            The system flags students whose cumulative attendance falls below the{" "}
            <strong>75%</strong> minimum. Flagged students are listed below.
          </p>
        </section>
      </div>

      <div>
        <h2 className="text-base font-semibold text-ink mb-3">Students Below 75% Threshold</h2>
        {loadingAlerts ? (
          <div className="bg-surface-card rounded-card border border-border shadow-card">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : (
          <DataTable columns={alertColumns} data={alerts} />
        )}
      </div>
    </div>
  );
}

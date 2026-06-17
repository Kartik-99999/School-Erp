"use client";
import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/lib/axios";
import { Download, RefreshCw, Calculator, DollarSign, CheckCircle2 } from "lucide-react";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  designation: string;
  department: string;
}

interface SalaryStructure {
  basic_salary: number;
  hra: number;
  da: number;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
}

interface PayrollRecord {
  staff: Employee;
  structure: SalaryStructure | null;
}

export default function PayrollPage() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState("January");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [processing, setProcessing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/payroll/employees");
      setRecords(res.data.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const processPayroll = async () => {
    setProcessing(true);
    try {
      await api.post("/payroll/process", { month, year });
      alert(`Payroll processed successfully for ${month} ${year}`);
    } catch (error) {
      console.error("Error processing payroll:", error);
      alert("Failed to process payroll.");
    } finally {
      setProcessing(false);
    }
  };

  const downloadBatchZip = async () => {
    setDownloading(true);
    try {
      const res = await api.get("/payroll/payslip/batch/download", {
        params: { month, year },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payslips_${month}_${year}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading ZIP:", error);
      alert("Failed to download payslips.");
    } finally {
      setDownloading(false);
    }
  };

  const columns: ColumnDef<PayrollRecord>[] = [
    {
      accessorKey: "staff.employee_id",
      header: "Employee ID",
      cell: ({ row }) => (
        <span className="font-medium text-ink">{row.original.staff.employee_id || "N/A"}</span>
      ),
    },
    {
      accessorKey: "staff.first_name",
      header: "Name",
      cell: ({ row }) => {
        const staff = row.original.staff;
        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs uppercase">
              {staff.first_name?.[0] || ""}
              {staff.last_name?.[0] || ""}
            </div>
            <div>
              <p className="font-semibold text-ink">
                {staff.first_name} {staff.last_name}
              </p>
              <p className="text-xs text-ink-muted">{staff.designation || "No Designation"}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "staff.department",
      header: "Department",
      cell: ({ row }) => (
        <span className="text-ink-muted">{row.original.staff.department || "General"}</span>
      ),
    },
    {
      id: "salary",
      header: "Gross Salary",
      cell: ({ row }) => {
        const struct = row.original.structure;
        if (!struct) {
          return (
            <span className="text-orange-500 text-sm flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Not Set
            </span>
          );
        }
        const gross =
          Number(struct.basic_salary) +
          Number(struct.hra) +
          Number(struct.da) +
          Object.values(struct.allowances || {}).reduce((a, b) => Number(a) + Number(b), 0);
        return <span className="font-semibold text-ink">₹{gross.toLocaleString()}</span>;
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const struct = row.original.structure;
        if (!struct)
          return (
            <span className="px-2 py-1 bg-surface text-ink-muted rounded-full text-xs font-medium">
              Pending Setup
            </span>
          );
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader
        title="Payroll Management"
        description="Process payroll and manage salary slips for all staff members."
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Actions Panel */}
        <div className="md:col-span-4 lg:col-span-3 space-y-6">
          <div className="bg-surface-card p-6 rounded-card border border-border shadow-sm">
            <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary-600" />
              Payroll Operations
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Month</label>
                <select
                  className="w-full border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                >
                  {[
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Year</label>
                <input
                  type="number"
                  className="w-full border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>

              <div className="pt-4 space-y-3">
                <button
                  onClick={processPayroll}
                  disabled={processing || records.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-2.5 px-4 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {processing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4" />
                  )}
                  {processing ? "Processing..." : "Process Payroll"}
                </button>

                <button
                  onClick={downloadBatchZip}
                  disabled={downloading || records.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-surface-card border border-border hover:bg-surface text-ink py-2.5 px-4 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {downloading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-ink-faint" />
                  ) : (
                    <Download className="w-4 h-4 text-ink-faint" />
                  )}
                  {downloading ? "Generating ZIP..." : "Download Batch ZIP"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Employees Table */}
        <div className="md:col-span-8 lg:col-span-9">
          <div className="bg-surface-card p-6 rounded-card border border-border shadow-sm h-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <h3 className="text-lg font-semibold text-ink">Staff Payroll List</h3>
              <div className="text-sm text-ink-muted bg-surface px-3 py-1 rounded-full border border-border">
                Total Employees: <span className="font-semibold text-ink">{records.length}</span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 text-primary-600 animate-spin" />
              </div>
            ) : (
              <DataTable columns={columns} data={records} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

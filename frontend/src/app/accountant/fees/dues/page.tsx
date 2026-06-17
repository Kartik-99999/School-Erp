"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import {
  getClasses,
  Class,
  getAcademicYears,
  getFeeStructures,
  getFeeHeads,
} from "@/lib/api/setup";
import { bulkGenerateDues, getDues } from "@/lib/api/fees";
import { getStudents, Student } from "@/lib/api/students";
import { Calculator, Search, Receipt } from "lucide-react";

export default function FeeDuesPage() {
  const pathname = usePathname();

  const [activeYearId, setActiveYearId] = useState("");
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [heads, setHeads] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);

  // Generate Dues Context
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genForm, setGenForm] = useState({ class_id: "", due_date: "" });
  const [generating, setGenerating] = useState(false);

  // Filters
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("Pending");

  useEffect(() => {
    Promise.all([
      getAcademicYears(),
      getClasses(),
      getStudents(),
      getFeeStructures(),
      getFeeHeads(),
    ]).then(([yrRes, cRes, stRes, fsRes, fhRes]) => {
      const active = yrRes.data.find((y: any) => y.is_active);
      if (active) setActiveYearId(active.id);
      setClasses(cRes.data || []);
      setStudents(stRes.data || []);
      setStructures(fsRes.data || []);
      setHeads(fhRes.data || []);

      // Auto load initial dues
      loadDues(undefined, "Pending");
    });
  }, []);

  const loadDues = async (clsId?: string, status?: string) => {
    setLoading(true);
    try {
      const filters: any = {};
      if (clsId) filters.class_id = clsId;
      if (status) filters.status = status;
      const res = await getDues(filters);
      setDues(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDues(filterClass, filterStatus);
  }, [filterClass, filterStatus]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await bulkGenerateDues({
        academic_year_id: activeYearId,
        class_id: genForm.class_id,
        due_date: genForm.due_date,
      });
      alert(res.message);
      setIsGenModalOpen(false);
      loadDues(filterClass, filterStatus);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to generate dues");
    } finally {
      setGenerating(false);
    }
  };

  const getStudentName = (id: string) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.first_name} ${s.last_name} (${s.admission_number})` : "Unknown";
  };

  const getHeadName = (structId: string) => {
    const s = structures.find((x) => x.id === structId);
    if (!s) return "Unknown";
    const h = heads.find((x) => x.id === s.fee_head_id);
    return h ? h.name : "Unknown";
  };

  const columns = [
    {
      id: "student",
      header: "Student",
      cell: ({ row }: any) => (
        <span className="font-medium text-ink">{getStudentName(row.original.student_id)}</span>
      ),
    },
    {
      id: "head",
      header: "Fee Head",
      cell: ({ row }: any) => getHeadName(row.original.fee_structure_id),
    },
    { accessorKey: "due_date", header: "Due Date" },
    { accessorKey: "base_amount", header: "Base (₹)" },
    {
      accessorKey: "concession_amount",
      header: "Concession (₹)",
      cell: ({ row }: any) => (
        <span className="text-green-600">{row.original.concession_amount}</span>
      ),
    },
    {
      accessorKey: "net_due_amount",
      header: "Net Due (₹)",
      cell: ({ row }: any) => <span className="font-bold">{row.original.net_due_amount}</span>,
    },
    { accessorKey: "amount_paid", header: "Paid (₹)" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const s = row.original.status;
        const color =
          s === "Paid"
            ? "bg-green-100 text-green-800"
            : s === "Partial"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800";
        return <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>{s}</span>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) =>
        row.original.status !== "Paid" ? (
          <Link
            href={`/accountant/fees/payments?student_id=${row.original.student_id}`}
            className="text-xs bg-primary-600 text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-primary-700 w-fit"
          >
            <Receipt className="w-3 h-3" /> Collect
          </Link>
        ) : (
          <span className="text-xs text-ink-faint">Cleared</span>
        ),
    },
  ];

  return (
    <div className="pb-12">
      <div className="flex gap-4 border-b mb-6 pb-2">
        <Link
          href="/accountant/fees/dues"
          className={`font-semibold ${pathname === "/accountant/fees/dues" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Fee Dues
        </Link>
        <Link
          href="/accountant/fees/payments"
          className={`font-semibold ${pathname === "/accountant/fees/payments" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Collect Payment
        </Link>
        <Link
          href="/accountant/fees/reports"
          className={`font-semibold ${pathname === "/accountant/fees/reports" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Transactions & Receipts
        </Link>
      </div>

      <PageHeader
        title="Fee Dues & Schedules"
        description="Monitor outstanding balances and auto-generate new billing cycles."
        action={
          <button
            onClick={() => setIsGenModalOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" /> Generate Class Dues
          </button>
        }
      />

      <div className="bg-surface-card p-4 rounded-xl shadow-sm border border-border mb-6 flex gap-4">
        <div className="w-64">
          <label className="block text-xs font-medium text-ink-muted mb-1 uppercase tracking-wider">
            Filter by Class
          </label>
          <select
            className="w-full border rounded p-2 text-sm"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-64">
          <label className="block text-xs font-medium text-ink-muted mb-1 uppercase tracking-wider">
            Filter by Status
          </label>
          <select
            className="w-full border rounded p-2 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-ink-muted">Loading ledgers...</div>
      ) : (
        <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden">
          <DataTable columns={columns} data={dues} />
        </div>
      )}

      {/* Generate Dues Modal */}
      {isGenModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-2">Generate Fee Dues</h2>
            <p className="text-sm text-ink-muted mb-6">
              This process maps active fee structures to all students in the class, applying
              individual concessions automatically.
            </p>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Target Class</label>
                <select
                  required
                  className="w-full border rounded p-2"
                  value={genForm.class_id}
                  onChange={(e) => setGenForm({ ...genForm, class_id: e.target.value })}
                >
                  <option value="">Select</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  required
                  type="date"
                  className="w-full border rounded p-2"
                  value={genForm.due_date}
                  onChange={(e) => setGenForm({ ...genForm, due_date: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsGenModalOpen(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-6 py-2 bg-primary-600 text-white rounded font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  {generating ? "Generating..." : "Generate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

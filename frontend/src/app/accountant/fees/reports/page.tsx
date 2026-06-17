"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { getReceipts, getReceiptPdfUrl } from "@/lib/api/fees";
import { getStudents, Student } from "@/lib/api/students";
import { Receipt, Download, RefreshCw } from "lucide-react";

export default function FeeReportsPage() {
  const pathname = usePathname();

  const [receipts, setReceipts] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([getReceipts(), getStudents()]);
      setReceipts(rRes.data || []);
      setStudents(sRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStudentName = (id: string) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.first_name} ${s.last_name}` : "Unknown";
  };

  const getStudentAdm = (id: string) => {
    const s = students.find((x) => x.id === id);
    return s ? s.admission_number : "-";
  };

  const columns = [
    {
      accessorKey: "receipt_number",
      header: "Receipt No.",
      cell: ({ row }: any) => (
        <span className="font-mono font-bold text-xs">{row.original.receipt_number}</span>
      ),
    },
    {
      id: "adm",
      header: "Adm No.",
      cell: ({ row }: any) => getStudentAdm(row.original.student_id),
    },
    {
      id: "name",
      header: "Student Name",
      cell: ({ row }: any) => (
        <span className="font-medium">{getStudentName(row.original.student_id)}</span>
      ),
    },
    {
      accessorKey: "payment_date",
      header: "Date",
      cell: ({ row }: any) => new Date(row.original.payment_date).toLocaleDateString(),
    },
    { accessorKey: "payment_mode", header: "Mode" },
    {
      accessorKey: "total_amount",
      header: "Amount (₹)",
      cell: ({ row }: any) => (
        <span className="text-green-700 font-bold">₹{row.original.total_amount}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <a
          href={getReceiptPdfUrl(row.original.id)}
          target="_blank"
          className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm font-medium"
        >
          <Download className="w-4 h-4" /> Print
        </a>
      ),
    },
  ];

  // Aggregation for Dashboard stats
  const totalCollected = receipts.reduce((sum, r) => sum + parseFloat(r.total_amount), 0);
  const onlineCollected = receipts
    .filter((r) => r.payment_mode === "Razorpay")
    .reduce((sum, r) => sum + parseFloat(r.total_amount), 0);
  const offlineCollected = totalCollected - onlineCollected;

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
        title="Transaction Ledger"
        description="View all processed payments, download receipts, and track collection analytics."
        action={
          <button
            onClick={loadData}
            className="bg-surface-card border text-ink px-4 py-2 rounded-md hover:bg-surface font-medium flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Data
          </button>
        }
      />

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface-card p-6 rounded-xl border border-border shadow-sm">
            <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wider mb-2">
              Total Collection
            </h3>
            <p className="text-3xl font-bold text-ink">₹{totalCollected.toLocaleString()}</p>
          </div>
          <div className="bg-surface-card p-6 rounded-xl border border-border shadow-sm">
            <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wider mb-2">
              Offline (Cash/Cheque)
            </h3>
            <p className="text-3xl font-bold text-primary-700">
              ₹{offlineCollected.toLocaleString()}
            </p>
          </div>
          <div className="bg-surface-card p-6 rounded-xl border border-border shadow-sm">
            <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wider mb-2">
              Online (Razorpay)
            </h3>
            <p className="text-3xl font-bold text-green-700">₹{onlineCollected.toLocaleString()}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-ink-muted">Loading transactions...</div>
      ) : (
        <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 bg-surface border-b flex items-center gap-2">
            <Receipt className="w-5 h-5 text-ink-muted" />
            <h3 className="font-bold text-ink">Recent Receipts</h3>
          </div>
          <DataTable columns={columns} data={receipts} />
        </div>
      )}
    </div>
  );
}

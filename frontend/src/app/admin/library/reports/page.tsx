"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { getIssues } from "@/lib/api/library";
import { AlertCircle, IndianRupee, Library } from "lucide-react";

export default function LibraryReportsPage() {
  const pathname = usePathname();

  const [returnedRecords, setReturnedRecords] = useState<any[]>([]);
  const [overdueRecords, setOverdueRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [retRes, ovdRes] = await Promise.all([getIssues("Returned"), getIssues("Overdue")]);
      setReturnedRecords(retRes.data || []);
      setOverdueRecords(ovdRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalFines = returnedRecords.reduce((sum, r) => sum + (parseFloat(r.fine_amount) || 0), 0);

  const columnsOverdue = [
    {
      accessorKey: "book_title",
      header: "Book Title",
      cell: ({ row }: any) => <span className="font-bold text-ink">{row.original.book_title}</span>,
    },
    { accessorKey: "borrower_name", header: "Borrower" },
    { accessorKey: "issue_date", header: "Issued On" },
    {
      accessorKey: "due_date",
      header: "Due Date",
      cell: ({ row }: any) => (
        <span className="text-red-600 font-bold">{row.original.due_date}</span>
      ),
    },
  ];

  const columnsReturned = [
    {
      accessorKey: "book_title",
      header: "Book Title",
      cell: ({ row }: any) => <span className="font-medium">{row.original.book_title}</span>,
    },
    { accessorKey: "borrower_name", header: "Borrower" },
    { accessorKey: "return_date", header: "Returned On" },
    {
      accessorKey: "fine_amount",
      header: "Fine Generated (₹)",
      cell: ({ row }: any) => {
        const f = parseFloat(row.original.fine_amount);
        return (
          <span className={`font-bold ${f > 0 ? "text-red-600" : "text-ink-faint"}`}>
            {f > 0 ? `₹${f}` : "-"}
          </span>
        );
      },
    },
  ];

  return (
    <div className="pb-12">
      <div className="flex gap-4 border-b mb-6 pb-2">
        <Link
          href="/admin/library/catalog"
          className={`font-semibold ${pathname === "/admin/library/catalog" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Catalog
        </Link>
        <Link
          href="/admin/library/issues"
          className={`font-semibold ${pathname === "/admin/library/issues" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Issue / Return Desk
        </Link>
        <Link
          href="/admin/library/reports"
          className={`font-semibold ${pathname === "/admin/library/reports" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Library Reports
        </Link>
      </div>

      <PageHeader
        title="Library Reports"
        description="Monitor overdue books, historical borrowing logs, and collected fines."
      />

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-red-50 p-6 rounded-xl border border-red-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full text-red-600">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-900 uppercase tracking-wider mb-1">
                Active Overdue Books
              </h3>
              <p className="text-3xl font-bold text-red-700">{overdueRecords.length}</p>
            </div>
          </div>
          <div className="bg-green-50 p-6 rounded-xl border border-green-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full text-green-600">
              <IndianRupee className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-green-900 uppercase tracking-wider mb-1">
                Total Fines Generated
              </h3>
              <p className="text-3xl font-bold text-green-700">₹{totalFines.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-ink-muted">Loading reports...</div>
      ) : (
        <div className="space-y-8">
          {overdueRecords.length > 0 && (
            <div className="bg-surface-card rounded-xl shadow-sm border border-red-100 overflow-hidden">
              <div className="p-4 bg-red-50 border-b flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-red-900">Immediate Action Required: Overdue List</h3>
              </div>
              <DataTable columns={columnsOverdue} data={overdueRecords} />
            </div>
          )}

          <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-4 bg-surface border-b flex items-center gap-2">
              <Library className="w-5 h-5 text-ink-muted" />
              <h3 className="font-bold text-ink">Historical Return Log (With Fines)</h3>
            </div>
            <DataTable columns={columnsReturned} data={returnedRecords} />
          </div>
        </div>
      )}
    </div>
  );
}

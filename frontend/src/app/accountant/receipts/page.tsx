"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import api from "@/lib/axios";
import { ColumnDef } from "@tanstack/react-table";
import { Search, Download, FileText, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface FeeReceipt {
  id: string;
  student_id: string;
  receipt_number: string;
  total_amount: number;
  payment_mode: string;
  transaction_reference: string | null;
  payment_date: string;
  status: string;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/fees/receipts");
      if (res.data.success) {
        setReceipts(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch receipts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleDownload = async (id: string, receiptNumber: string) => {
    try {
      const response = await api.get(`/fees/receipts/${id}/pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Receipt_${receiptNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error("Failed to download PDF", error);
    }
  };

  const filteredReceipts = receipts.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.receipt_number.toLowerCase().includes(q) ||
      r.payment_mode.toLowerCase().includes(q) ||
      (r.transaction_reference && r.transaction_reference.toLowerCase().includes(q))
    );
  });

  const columns: ColumnDef<FeeReceipt>[] = [
    {
      accessorKey: "receipt_number",
      header: "Receipt No",
      cell: ({ row }) => (
        <div className="font-medium text-ink flex items-center space-x-2">
          <FileText className="w-4 h-4 text-blue-500" />
          <span>{row.original.receipt_number}</span>
        </div>
      ),
    },
    {
      accessorKey: "payment_date",
      header: "Date",
      cell: ({ row }) => {
        try {
          return (
            <span className="text-ink-muted">
              {format(new Date(row.original.payment_date), "MMM d, yyyy")}
            </span>
          );
        } catch {
          return <span className="text-ink-muted">Invalid Date</span>;
        }
      },
    },
    {
      accessorKey: "total_amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="font-semibold text-ink">
          ₹{row.original.total_amount.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "payment_mode",
      header: "Payment Mode",
      cell: ({ row }) => {
        const mode = row.original.payment_mode;
        const ref = row.original.transaction_reference;
        return (
          <div className="flex flex-col">
            <span className="capitalize text-ink">{mode}</span>
            {ref && <span className="text-xs text-ink-muted">Ref: {ref}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status || "Completed";
        const isSuccess =
          status.toLowerCase() === "success" || status.toLowerCase() === "completed";
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isSuccess ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {isSuccess ? (
              <CheckCircle className="w-3 h-3 mr-1" />
            ) : (
              <Clock className="w-3 h-3 mr-1" />
            )}
            {status}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <button
          onClick={() => handleDownload(row.original.id, row.original.receipt_number)}
          className="inline-flex items-center justify-center p-2 text-ink-faint hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          title="Download PDF"
        >
          <Download className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="Receipts"
        description="View and download fee receipts for all transactions."
      />

      <div className="bg-surface-card rounded-card border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-ink">All Receipts</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
            <input
              type="text"
              placeholder="Search receipts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full sm:w-64 transition-all bg-surface hover:bg-surface-card"
            />
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <DataTable columns={columns} data={filteredReceipts} />
          )}
        </div>
      </div>
    </div>
  );
}

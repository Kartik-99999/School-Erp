"use client";
import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { getBillingHistory } from "@/lib/api/superAdmin";

export default function SuperAdminBillingPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getBillingHistory();
      setHistory(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const columns = [
    {
      accessorKey: "school_name",
      header: "School Name",
      cell: ({ row }: any) => (
        <span className="font-bold text-ink">{row.original.school_name}</span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }: any) => new Date(row.original.created_at).toLocaleString(),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => <span className="font-bold">₹{row.original.amount}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const s = row.original.status;
        const color = s === "Paid" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
        return <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>{s}</span>;
      },
    },
  ];

  return (
    <div className="pb-12">
      <PageHeader
        title="Billing History"
        description="Global ledger of all platform subscription payments."
      />

      {loading ? (
        <div className="py-12 text-center text-ink-muted">Loading ledger...</div>
      ) : (
        <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden">
          <DataTable columns={columns} data={history} />
        </div>
      )}
    </div>
  );
}

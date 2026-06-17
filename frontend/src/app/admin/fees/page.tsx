"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { getStudents } from "@/lib/api/students";
import { DollarSign, TrendingUp, Clock, AlertTriangle, Search, Settings } from "lucide-react";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function AdminFeesPage() {
  const router = useRouter();
  const [dues, setDues] = useState<any[]>([]);
  const [studentMap, setStudentMap] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [duesRes, studentsRes] = await Promise.all([api.get("/fees/dues"), getStudents({})]);
        setDues(duesRes.data?.data || []);
        const map: Record<string, any> = {};
        (studentsRes.data || []).forEach((s: any) => {
          map[s.id] = s;
        });
        setStudentMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const name = (id: string) => {
    const s = studentMap[id];
    return s ? `${s.first_name} ${s.last_name}` : "—";
  };
  const adm = (id: string) => studentMap[id]?.admission_number || "—";

  const totalExpected = dues.reduce((s, d) => s + Number(d.net_due_amount || 0), 0);
  const collected = dues.reduce((s, d) => s + Number(d.amount_paid || 0), 0);
  const outstanding = totalExpected - collected;
  const defaulters = new Set(
    dues
      .filter((d) => d.status !== "Paid" && d.due_date && new Date(d.due_date) < new Date())
      .map((d) => d.student_id)
  ).size;

  const filtered = dues.filter(
    (d) =>
      name(d.student_id).toLowerCase().includes(search.toLowerCase()) ||
      adm(d.student_id).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Fee Collection & Finance"
        description="Monitor revenue, dues, and collection across the school."
        action={
          <Button variant="secondary" onClick={() => router.push("/admin/setup/fees")}>
            <Settings size={16} /> Fee Setup
          </Button>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Expected"
          value={inr(totalExpected)}
          icon={<DollarSign size={20} />}
          iconClassName="bg-primary-50 text-primary-600"
        />
        <StatCard
          title="Collected"
          value={inr(collected)}
          icon={<TrendingUp size={20} />}
          iconClassName="bg-success-bg text-success-text"
        />
        <StatCard
          title="Outstanding"
          value={inr(outstanding)}
          icon={<Clock size={20} />}
          iconClassName="bg-warning-bg text-warning-text"
        />
        <StatCard
          title="Defaulters"
          value={defaulters}
          icon={<AlertTriangle size={20} />}
          iconClassName="bg-danger-bg text-danger-text"
        />
      </div>

      <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Input
              placeholder="Search by student or admission no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<DollarSign size={22} />}
            title={search ? "No matching dues" : "No dues generated"}
            description={
              search
                ? "Try a different search."
                : "Generate dues from the Accountant portal or Fee Setup."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Student", "Adm No", "Net Due", "Paid", "Balance", "Status"].map((h) => (
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
                {filtered.map((d) => {
                  const bal = Number(d.net_due_amount || 0) - Number(d.amount_paid || 0);
                  return (
                    <tr key={d.id} className="hover:bg-surface transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-ink">
                        {name(d.student_id)}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-muted">{adm(d.student_id)}</td>
                      <td className="px-4 py-3 text-sm text-ink">{inr(d.net_due_amount)}</td>
                      <td className="px-4 py-3 text-sm text-ink-muted">{inr(d.amount_paid)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-ink">{inr(bal)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            d.status === "Paid"
                              ? "success"
                              : d.status === "Partial"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {d.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

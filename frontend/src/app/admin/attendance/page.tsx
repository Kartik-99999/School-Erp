"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { CheckSquare, AlertTriangle, TrendingDown, Download, Users } from "lucide-react";

export default function AdminAttendancePage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/attendance/students/threshold?threshold=75.0");
        setAlerts(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const avgPct = alerts.length
    ? Math.round((alerts.reduce((s, a) => s + Number(a.percentage || 0), 0) / alerts.length) * 10) /
      10
    : 0;
  const lowest = alerts.length ? Math.min(...alerts.map((a) => Number(a.percentage || 0))) : 0;

  return (
    <div>
      <PageHeader
        title="Attendance Management"
        description="Track daily attendance, view alerts, and generate registers."
        action={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => router.push("/admin/attendance/reports")}>
              <Download size={16} /> PDF Register
            </Button>
            <Button onClick={() => router.push("/admin/attendance/students")}>
              <CheckSquare size={16} /> Mark Attendance
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Students Below 75%"
          value={alerts.length}
          icon={<AlertTriangle size={20} />}
          iconClassName="bg-danger-bg text-danger-text"
        />
        <StatCard
          title="Avg of Defaulters"
          value={`${avgPct}%`}
          icon={<Users size={20} />}
          iconClassName="bg-warning-bg text-warning-text"
        />
        <StatCard
          title="Lowest Attendance"
          value={`${lowest}%`}
          icon={<TrendingDown size={20} />}
          iconClassName="bg-info-bg text-info-text"
        />
      </div>

      <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-base font-semibold text-ink flex items-center gap-2">
            <AlertTriangle size={18} className="text-danger-text" /> Defaulter Alerts (&lt; 75%)
          </h2>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={<CheckSquare size={22} />}
            title="No defaulters"
            description="No students currently have attendance below 75%."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Student Name", "Admission No", "Total Days", "Present", "Attendance %"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-muted whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {alerts.map((al, idx) => (
                  <tr key={idx} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-ink">{al.student_name}</td>
                    <td className="px-4 py-3 text-sm text-ink-muted">{al.admission_number}</td>
                    <td className="px-4 py-3 text-sm text-ink">{al.total_days}</td>
                    <td className="px-4 py-3 text-sm text-ink">{al.present_days}</td>
                    <td className="px-4 py-3">
                      <Badge variant="danger">{al.percentage}%</Badge>
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

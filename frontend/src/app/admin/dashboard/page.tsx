"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { getDashboardStats } from "@/lib/api/reports";
import {
  Users,
  Briefcase,
  IndianRupee,
  GraduationCap,
  UserPlus,
  ClipboardCheck,
  Megaphone,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const quickActions = [
  { label: "Add Student", href: "/admin/students/new", icon: GraduationCap },
  { label: "Add Staff", href: "/admin/staff/new", icon: Briefcase },
  { label: "Admissions", href: "/admin/admissions", icon: UserPlus },
  { label: "Mark Attendance", href: "/admin/attendance/students", icon: ClipboardCheck },
  { label: "Send Notice", href: "/admin/communication", icon: Megaphone },
  { label: "Fee Setup", href: "/admin/setup/fees", icon: IndianRupee },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getDashboardStats();
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const chartData = stats
    ? [
        { name: "Students", value: stats.total_students || 0 },
        { name: "Staff", value: stats.total_staff || 0 },
      ]
    : [];

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your school's current standing." />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-[112px] rounded-card" />)
        ) : (
          <>
            <StatCard
              title="Active Students"
              value={stats?.total_students ?? 0}
              icon={<Users size={20} />}
              iconClassName="bg-primary-50 text-primary-600"
            />
            <StatCard
              title="Total Staff"
              value={stats?.total_staff ?? 0}
              icon={<Briefcase size={20} />}
              iconClassName="bg-info-bg text-info-text"
            />
            <StatCard
              title="Fee Collection (This Month)"
              value={`₹${Number(stats?.monthly_collection ?? 0).toLocaleString("en-IN")}`}
              icon={<IndianRupee size={20} />}
              iconClassName="bg-success-bg text-success-text"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-surface-card rounded-card border border-border shadow-card p-6">
          <h2 className="text-base font-semibold text-ink mb-4">School at a Glance</h2>
          {loading ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={56}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#EFF6FF" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 13 }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#2563EB" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="bg-surface-card rounded-card border border-border shadow-card p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group flex flex-col gap-2 p-4 rounded-input border border-border hover:border-primary-500 hover:bg-primary-50/50 transition-colors"
              >
                <a.icon size={18} className="text-primary-600" />
                <span className="text-sm font-medium text-ink">{a.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

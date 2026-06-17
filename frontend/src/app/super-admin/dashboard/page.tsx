"use client";
import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSuperAdminStats } from "@/lib/api/superAdmin";
import { Building2, Activity, Clock, IndianRupee } from "lucide-react";

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getSuperAdminStats();
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="pb-12">
      <PageHeader
        title="Platform Overview"
        description="Monitor global SaaS metrics across all registered tenants."
      />

      {loading ? (
        <div className="py-12 text-center text-ink-muted">Loading global metrics...</div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-primary-50 rounded-lg text-primary-600">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-1">
                Total Schools
              </p>
              <h3 className="text-3xl font-bold text-ink">{stats.total_schools}</h3>
            </div>
          </div>

          <div className="bg-surface-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg text-green-600">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-1">
                Active Subscriptions
              </p>
              <h3 className="text-3xl font-bold text-ink">{stats.active_schools}</h3>
            </div>
          </div>

          <div className="bg-surface-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg text-yellow-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-1">
                On Trial
              </p>
              <h3 className="text-3xl font-bold text-ink">{stats.trial_schools}</h3>
            </div>
          </div>

          <div className="bg-surface-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-primary-50 rounded-lg text-primary-600">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink-muted uppercase tracking-wider mb-1">
                Total MRR
              </p>
              <h3 className="text-3xl font-bold text-ink">
                ₹{stats.total_revenue?.toLocaleString() || 0}
              </h3>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-red-500">Failed to load platform metrics.</div>
      )}
    </div>
  );
}

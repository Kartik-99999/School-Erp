"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubNav } from "@/components/ui/SubNav";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Bus, Route as RouteIcon, User, Plus, FileText } from "lucide-react";

const tabs = [
  { href: "/admin/transport", label: "Overview" },
  { href: "/admin/transport/vehicles", label: "Vehicles" },
  { href: "/admin/transport/routes", label: "Routes" },
  { href: "/admin/transport/assignments", label: "Student Assignments" },
];

export default function AdminTransportPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [rRes, vRes] = await Promise.all([
          api.get("/transport/routes"),
          api.get("/transport/vehicles"),
        ]);
        setRoutes(rRes.data?.data || []);
        setVehicles(vRes.data?.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const vMap: Record<string, any> = {};
  vehicles.forEach((v) => {
    vMap[v.id] = v;
  });
  const drivers = new Set(vehicles.map((v) => v.driver_name).filter(Boolean)).size;

  return (
    <div>
      <PageHeader
        title="Transport Management"
        description="Manage vehicles, routes, stops, and student assignments."
        action={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push("/admin/transport/routes")}>
              <FileText size={16} /> Route Manifests
            </Button>
            <Button onClick={() => router.push("/admin/transport/vehicles")}>
              <Plus size={16} /> Add Vehicle
            </Button>
          </div>
        }
      />
      <SubNav items={tabs} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Vehicles"
          value={vehicles.length}
          icon={<Bus size={20} />}
          iconClassName="bg-primary-50 text-primary-600"
        />
        <StatCard
          title="Routes"
          value={routes.length}
          icon={<RouteIcon size={20} />}
          iconClassName="bg-success-bg text-success-text"
        />
        <StatCard
          title="Drivers"
          value={drivers}
          icon={<User size={20} />}
          iconClassName="bg-warning-bg text-warning-text"
        />
      </div>

      <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-base font-semibold text-ink">Routes</h2>
        </div>
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : routes.length === 0 ? (
          <EmptyState
            icon={<RouteIcon size={22} />}
            title="No routes yet"
            description="Add vehicles and create routes to get started."
            action={
              <Button onClick={() => router.push("/admin/transport/routes")}>
                <Plus size={16} /> Manage Routes
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Route", "Starting Point", "Vehicle", "Driver"].map((h) => (
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
                {routes.map((r) => {
                  const v = r.vehicle_id ? vMap[r.vehicle_id] : null;
                  return (
                    <tr key={r.id} className="hover:bg-surface transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-ink">{r.name}</td>
                      <td className="px-4 py-3 text-sm text-ink-muted">
                        {r.starting_point || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink">
                        {v?.vehicle_number || "Unassigned"}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-muted">{v?.driver_name || "—"}</td>
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

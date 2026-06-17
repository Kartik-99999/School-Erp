"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { getVehicles, createVehicle } from "@/lib/api/transport";
import { Plus, Bus, Calendar } from "lucide-react";

export default function VehiclesPage() {
  const pathname = usePathname();

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    vehicle_number: "",
    capacity: "",
    driver_name: "",
    driver_contact: "",
    fitness_expiry_date: "",
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getVehicles();
      setVehicles(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createVehicle({
        ...form,
        capacity: parseInt(form.capacity),
        fitness_expiry_date: form.fitness_expiry_date || undefined,
      });
      setIsModalOpen(false);
      setForm({
        vehicle_number: "",
        capacity: "",
        driver_name: "",
        driver_contact: "",
        fitness_expiry_date: "",
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add vehicle");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      accessorKey: "vehicle_number",
      header: "Vehicle Reg No.",
      cell: ({ row }: any) => (
        <span className="font-bold text-ink">{row.original.vehicle_number}</span>
      ),
    },
    {
      accessorKey: "capacity",
      header: "Capacity",
      cell: ({ row }: any) => <span className="text-ink-muted">{row.original.capacity} seats</span>,
    },
    {
      id: "driver",
      header: "Driver Details",
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.original.driver_name || "N/A"}</div>
          <div className="text-xs text-ink-muted">{row.original.driver_contact}</div>
        </div>
      ),
    },
    {
      accessorKey: "fitness_expiry_date",
      header: "Fitness Expiry",
      cell: ({ row }: any) => {
        const dt = row.original.fitness_expiry_date;
        if (!dt) return <span className="text-ink-faint">Not set</span>;
        const isExpiringSoon =
          new Date(dt).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000;
        return (
          <span
            className={`flex items-center gap-1 ${isExpiringSoon ? "text-red-600 font-bold" : "text-ink-muted"}`}
          >
            <Calendar className="w-3 h-3" /> {dt}
          </span>
        );
      },
    },
  ];

  return (
    <div className="pb-12">
      <div className="flex gap-4 border-b mb-6 pb-2">
        <Link
          href="/admin/transport/routes"
          className={`font-semibold ${pathname === "/admin/transport/routes" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Routes & Stops
        </Link>
        <Link
          href="/admin/transport/vehicles"
          className={`font-semibold ${pathname === "/admin/transport/vehicles" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Fleet Management
        </Link>
        <Link
          href="/admin/transport/assignments"
          className={`font-semibold ${pathname === "/admin/transport/assignments" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Student Assignments
        </Link>
      </div>

      <PageHeader
        title="Fleet Management"
        description="Manage school buses, capacities, and monitor driver fitness certificates."
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Vehicle
          </button>
        }
      />

      {loading ? (
        <div className="py-12 text-center text-ink-muted">Loading fleet data...</div>
      ) : (
        <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 bg-surface border-b flex items-center gap-2">
            <Bus className="w-5 h-5 text-ink-muted" />
            <h3 className="font-bold text-ink">Registered Vehicles ({vehicles.length})</h3>
          </div>
          <DataTable columns={columns} data={vehicles} />
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Register New Vehicle</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Registration No.</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. DL 1P 1234"
                    className="w-full border rounded p-2 uppercase"
                    value={form.vehicle_number}
                    onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Capacity (Seats)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full border rounded p-2"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold text-sm mb-3">Driver Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      className="w-full border rounded p-2"
                      value={form.driver_name}
                      onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Contact No.</label>
                    <input
                      type="tel"
                      className="w-full border rounded p-2"
                      value={form.driver_contact}
                      onChange={(e) => setForm({ ...form, driver_contact: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fitness Cert. Expiry Date</label>
                <input
                  type="date"
                  className="w-full border rounded p-2"
                  value={form.fitness_expiry_date}
                  onChange={(e) => setForm({ ...form, fitness_expiry_date: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded font-medium text-ink-muted hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary-600 text-white rounded font-medium flex items-center gap-2 hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

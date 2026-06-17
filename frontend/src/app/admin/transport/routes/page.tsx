"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getVehicles,
  getRoutes,
  createRoute,
  getRouteStops,
  createStop,
  getManifestPdfUrl,
} from "@/lib/api/transport";
import { Plus, MapPin, Bus, Download } from "lucide-react";

export default function RoutesPage() {
  const pathname = usePathname();

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [stops, setStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [routeForm, setRouteForm] = useState({ name: "", starting_point: "", vehicle_id: "" });

  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [stopForm, setStopForm] = useState({
    stop_name: "",
    pickup_time: "",
    drop_time: "",
    monthly_fee: 0,
  });

  const loadBaseData = async () => {
    setLoading(true);
    try {
      const [vRes, rRes] = await Promise.all([getVehicles(), getRoutes()]);
      setVehicles(vRes.data || []);
      setRoutes(rRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  const selectRoute = async (route: any) => {
    setSelectedRoute(route);
    try {
      const res = await getRouteStops(route.id);
      setStops(res.data || []);
    } catch (e) {
      alert("Failed to load stops");
    }
  };

  const handleRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRoute(routeForm);
      setIsRouteModalOpen(false);
      setRouteForm({ name: "", starting_point: "", vehicle_id: "" });
      loadBaseData();
    } catch (err) {
      alert("Failed to create route");
    }
  };

  const handleStopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoute) return;
    try {
      await createStop({ ...stopForm, route_id: selectedRoute.id });
      setIsStopModalOpen(false);
      setStopForm({ stop_name: "", pickup_time: "", drop_time: "", monthly_fee: 0 });
      selectRoute(selectedRoute); // reload stops
    } catch (err) {
      alert("Failed to add stop");
    }
  };

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
        title="Transport Routes"
        description="Configure bus routes, assign vehicles, and define pickup/drop stops."
        action={
          <button
            onClick={() => setIsRouteModalOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Route
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Routes List */}
        <div className="col-span-1 bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-[calc(100vh-250px)]">
          <div className="p-4 bg-surface border-b font-bold text-ink flex items-center justify-between">
            <span>Available Routes</span>
            <span className="bg-surface text-ink px-2 py-0.5 rounded-full text-xs">
              {routes.length}
            </span>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {loading ? (
              <div className="text-center py-8 text-ink-faint">Loading...</div>
            ) : routes.length === 0 ? (
              <div className="text-center py-8 text-ink-faint">No routes created.</div>
            ) : (
              routes.map((r) => {
                const isSelected = selectedRoute?.id === r.id;
                const v = vehicles.find((x) => x.id === r.vehicle_id);
                return (
                  <button
                    key={r.id}
                    onClick={() => selectRoute(r)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${isSelected ? "bg-primary-50 border-primary-500 shadow-sm" : "hover:bg-surface border-border"}`}
                  >
                    <div className="font-bold text-ink">{r.name}</div>
                    <div className="text-xs text-ink-muted mt-1 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {r.starting_point || "No start point"}
                    </div>
                    <div className="text-xs font-medium mt-2 flex items-center gap-1 text-primary-700 bg-primary-50 w-fit px-2 py-0.5 rounded">
                      <Bus className="w-3 h-3" /> {v ? v.vehicle_number : "Unassigned"}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Stops Details */}
        <div className="col-span-2">
          {!selectedRoute ? (
            <div className="h-full flex items-center justify-center bg-surface rounded-xl border border-dashed text-ink-faint">
              Select a route to view its stops and assignments.
            </div>
          ) : (
            <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-[calc(100vh-250px)]">
              <div className="p-4 bg-surface border-b flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-ink">{selectedRoute.name} - Waypoints</h3>
                  <p className="text-sm text-ink-muted">
                    Define precise pickup/drop timings and fees per stop.
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={getManifestPdfUrl(selectedRoute.id)}
                    target="_blank"
                    className="bg-surface-card border text-ink px-3 py-1.5 rounded hover:bg-surface font-medium flex items-center gap-2 text-sm shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Driver Manifest
                  </a>
                  <button
                    onClick={() => setIsStopModalOpen(true)}
                    className="bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-800 font-medium flex items-center gap-1 text-sm shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Stop
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {stops.length === 0 ? (
                  <div className="text-center py-12 text-ink-faint border-2 border-dashed rounded-lg">
                    No stops have been added to this route yet.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-primary-100 ml-4 pl-6 space-y-8">
                    {stops.map((stop, idx) => (
                      <div key={stop.id} className="relative">
                        <div className="absolute -left-[35px] w-4 h-4 bg-primary-600 border-4 border-primary-100 rounded-full mt-1.5"></div>
                        <div className="bg-surface p-4 rounded-lg border border-border hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-ink text-lg">{stop.stop_name}</h4>
                            <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
                              ₹{stop.monthly_fee}/mo
                            </span>
                          </div>
                          <div className="flex gap-6 mt-3 text-sm text-ink-muted">
                            <div>
                              <span className="uppercase text-xs tracking-wider font-semibold text-ink-faint block">
                                Pickup
                              </span>{" "}
                              {stop.pickup_time ? stop.pickup_time.substring(0, 5) : "-"}
                            </div>
                            <div>
                              <span className="uppercase text-xs tracking-wider font-semibold text-ink-faint block">
                                Drop
                              </span>{" "}
                              {stop.drop_time ? stop.drop_time.substring(0, 5) : "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Route Modal */}
      {isRouteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Create New Route</h2>
            <form onSubmit={handleRouteSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Route Name (e.g. R1 - North City)
                </label>
                <input
                  required
                  type="text"
                  className="w-full border rounded p-2"
                  value={routeForm.name}
                  onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Starting Point</label>
                <input
                  required
                  type="text"
                  className="w-full border rounded p-2"
                  value={routeForm.starting_point}
                  onChange={(e) => setRouteForm({ ...routeForm, starting_point: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assign Vehicle</label>
                <select
                  className="w-full border rounded p-2"
                  value={routeForm.vehicle_id}
                  onChange={(e) => setRouteForm({ ...routeForm, vehicle_id: e.target.value })}
                >
                  <option value="">None / Decide Later</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicle_number} (Cap: {v.capacity})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsRouteModalOpen(false)}
                  className="px-4 py-2 border rounded text-ink-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 text-white rounded font-medium"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stop Modal */}
      {isStopModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Add Stop to {selectedRoute?.name}</h2>
            <form onSubmit={handleStopSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Stop Name / Landmark</label>
                <input
                  required
                  type="text"
                  className="w-full border rounded p-2"
                  value={stopForm.stop_name}
                  onChange={(e) => setStopForm({ ...stopForm, stop_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Pickup Time</label>
                  <input
                    type="time"
                    className="w-full border rounded p-2"
                    value={stopForm.pickup_time}
                    onChange={(e) => setStopForm({ ...stopForm, pickup_time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Drop Time</label>
                  <input
                    type="time"
                    className="w-full border rounded p-2"
                    value={stopForm.drop_time}
                    onChange={(e) => setStopForm({ ...stopForm, drop_time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Transport Fee (₹)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="50"
                  className="w-full border rounded p-2"
                  value={stopForm.monthly_fee}
                  onChange={(e) =>
                    setStopForm({ ...stopForm, monthly_fee: parseFloat(e.target.value) })
                  }
                />
                <p className="text-xs text-ink-muted mt-1">
                  This fee will be automatically linked to the student's dues if they are assigned
                  to this stop.
                </p>
              </div>
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsStopModalOpen(false)}
                  className="px-4 py-2 border rounded text-ink-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gray-900 text-white rounded font-medium"
                >
                  Add Stop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

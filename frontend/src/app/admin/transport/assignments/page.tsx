"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getRoutes,
  getRouteStops,
  getRouteStudents,
  assignStudentToTransport,
} from "@/lib/api/transport";
import { getStudents, Student } from "@/lib/api/students";
import { getAcademicYears, getClasses, Class } from "@/lib/api/setup";
import { Search, MapPin, UserPlus } from "lucide-react";

export default function TransportAssignmentsPage() {
  const pathname = usePathname();

  const [activeYearId, setActiveYearId] = useState("");
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);

  // Assignment Context
  const [stops, setStops] = useState<any[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Assign Widget
  const [searchQuery, setSearchQuery] = useState("");
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);
  const [targetStopId, setTargetStopId] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    Promise.all([getAcademicYears(), getRoutes(), getStudents()]).then(([yrRes, rRes, stRes]) => {
      const active = yrRes.data.find((y: any) => y.is_active);
      if (active) setActiveYearId(active.id);
      setRoutes(rRes.data || []);
      setAllStudents(stRes.data || []);
    });
  }, []);

  const selectRoute = async (routeId: string) => {
    if (!routeId) {
      setSelectedRoute(null);
      return;
    }
    const rt = routes.find((r) => r.id === routeId);
    setSelectedRoute(rt);
    setLoading(true);
    setTargetStudent(null);
    try {
      const [stopsRes, studentsRes] = await Promise.all([
        getRouteStops(routeId),
        getRouteStudents(routeId),
      ]);
      setStops(stopsRes.data || []);
      setAssignedStudents(studentsRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!targetStudent || !selectedRoute || !targetStopId || !activeYearId) return;
    setAssigning(true);
    try {
      await assignStudentToTransport({
        student_id: targetStudent.id,
        route_id: selectedRoute.id,
        stop_id: targetStopId,
        academic_year_id: activeYearId,
      });
      alert(`Successfully assigned ${targetStudent.first_name} to route.`);
      setTargetStudent(null);
      setTargetStopId("");
      selectRoute(selectedRoute.id); // Reload
    } catch (err: any) {
      alert(
        err.response?.data?.detail ||
          "Failed to assign. Student may already be assigned to a route."
      );
    } finally {
      setAssigning(false);
    }
  };

  const filteredSearch =
    searchQuery.length > 2
      ? allStudents
          .filter((s) =>
            `${s.first_name} ${s.last_name} ${s.admission_number}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          )
          .slice(0, 5)
      : [];

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
        title="Student Transport Assignments"
        description="Map students to specific routes and stops. Transport fees will be auto-calculated in the billing cycle."
      />

      <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-border mb-8 max-w-md">
        <label className="block text-sm font-medium mb-1">Select Target Route</label>
        <select
          className="w-full border rounded p-2"
          value={selectedRoute?.id || ""}
          onChange={(e) => selectRoute(e.target.value)}
        >
          <option value="">Select a route...</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {selectedRoute && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Col: Assignment Widget */}
          <div className="bg-surface-card rounded-xl shadow-sm border border-primary-100 overflow-visible p-6 self-start">
            <h3 className="font-bold text-lg text-ink flex items-center gap-2 border-b pb-3 mb-6">
              <UserPlus className="w-5 h-5" /> Assign Student to {selectedRoute.name}
            </h3>

            {!targetStudent ? (
              <div className="relative">
                <label className="block text-sm font-medium mb-1 text-ink">1. Search Student</label>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-2.5 text-ink-faint" />
                  <input
                    type="text"
                    placeholder="Name or Adm No..."
                    className="w-full pl-10 pr-4 py-2 border border-border-strong rounded-md focus:ring-primary-500 focus:border-primary-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {filteredSearch.length > 0 && (
                  <div className="absolute z-20 w-full left-0 mt-1 bg-surface-card border border-border rounded-md shadow-xl max-h-60 overflow-y-auto">
                    {filteredSearch.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => {
                          setTargetStudent(st);
                          setSearchQuery("");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-primary-50 border-b last:border-0 transition-colors"
                      >
                        <div className="font-bold text-ink">
                          {st.first_name} {st.last_name}
                        </div>
                        <div className="text-ink-muted text-xs mt-0.5">
                          Adm: {st.admission_number}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-surface p-4 rounded-lg border flex justify-between items-center">
                  <div>
                    <p className="text-xs text-ink-muted uppercase tracking-wider font-semibold mb-1">
                      Selected Student
                    </p>
                    <p className="font-bold text-lg">
                      {targetStudent.first_name} {targetStudent.last_name}
                    </p>
                    <p className="text-sm text-ink-muted">
                      Adm No: {targetStudent.admission_number}
                    </p>
                  </div>
                  <button
                    onClick={() => setTargetStudent(null)}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-ink">
                    2. Select Drop/Pickup Stop
                  </label>
                  <select
                    className="w-full border border-border-strong rounded-md p-2"
                    value={targetStopId}
                    onChange={(e) => setTargetStopId(e.target.value)}
                  >
                    <option value="">Select Stop...</option>
                    {stops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.stop_name} (Fee: ₹{s.monthly_fee})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAssign}
                  disabled={!targetStopId || assigning}
                  className="w-full bg-primary-600 text-white p-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 transition-opacity"
                >
                  {assigning ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            )}
          </div>

          {/* Right Col: Manifest List */}
          <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-4 bg-surface border-b flex justify-between items-center">
              <h3 className="font-bold text-ink">Current Passengers ({assignedStudents.length})</h3>
            </div>
            <div className="overflow-y-auto max-h-[500px]">
              {assignedStudents.length === 0 ? (
                <div className="text-center py-12 text-ink-faint">
                  No students mapped to this route.
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface-card border-b uppercase text-xs text-ink-muted sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Adm No</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Stop</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedStudents.map((s) => (
                      <tr key={s.student_id} className="border-b hover:bg-surface">
                        <td className="px-4 py-3 font-mono text-xs">{s.admission_number}</td>
                        <td className="px-4 py-3 font-medium">{s.student_name}</td>
                        <td className="px-4 py-3 text-xs text-ink-muted flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {s.stop_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

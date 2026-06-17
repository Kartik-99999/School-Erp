"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { getRooms, getAllocations, assignRoom, vacateRoom } from "@/lib/api/hostel";
import { getStudents, Student } from "@/lib/api/students";
import { getAcademicYears } from "@/lib/api/setup";
import { Search, UserPlus, LogOut } from "lucide-react";

export default function HostelAllocationsPage() {
  const pathname = usePathname();

  const [activeYearId, setActiveYearId] = useState("");
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assignment Context
  const [isAssignMode, setIsAssignMode] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  const [searchStudent, setSearchStudent] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [assigning, setAssigning] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [yrRes, allocRes] = await Promise.all([getAcademicYears(), getAllocations()]);
      const active = yrRes.data.find((y: any) => y.is_active);
      if (active) setActiveYearId(active.id);
      setAllocations(allocRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Pre-load assign lookups
    Promise.all([getStudents(), getRooms()]).then(([sRes, rRes]) => {
      setStudents(sRes.data || []);
      setRooms(rRes.data || []);
    });
  }, []);

  const handleAssign = async () => {
    if (!selectedStudent || !selectedRoom || !activeYearId) return;
    setAssigning(true);
    try {
      await assignRoom({
        student_id: selectedStudent.id,
        room_id: selectedRoom,
        academic_year_id: activeYearId,
      });
      alert("Student allocated successfully!");
      setIsAssignMode(false);
      setSelectedStudent(null);
      setSelectedRoom("");
      setSearchStudent("");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to allocate room. Ensure room has capacity.");
    } finally {
      setAssigning(false);
    }
  };

  const handleVacate = async (allocId: string) => {
    if (!confirm("Are you sure you want to vacate this room?")) return;
    try {
      await vacateRoom(allocId);
      loadData();
    } catch (err) {
      alert("Failed to vacate room.");
    }
  };

  const filteredStudents =
    searchStudent.length > 2
      ? students
          .filter((s) =>
            `${s.first_name} ${s.last_name} ${s.admission_number}`
              .toLowerCase()
              .includes(searchStudent.toLowerCase())
          )
          .slice(0, 5)
      : [];

  const columns = [
    {
      accessorKey: "student_name",
      header: "Student Name",
      cell: ({ row }: any) => (
        <span className="font-bold text-ink">{row.original.student_name}</span>
      ),
    },
    {
      accessorKey: "admission_number",
      header: "Adm No.",
      cell: ({ row }: any) => (
        <span className="font-mono text-xs">{row.original.admission_number}</span>
      ),
    },
    { accessorKey: "building_name", header: "Hostel Building" },
    {
      accessorKey: "room_number",
      header: "Room No.",
      cell: ({ row }: any) => (
        <span className="font-bold text-ink">{row.original.room_number}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <button
          onClick={() => handleVacate(row.original.id)}
          className="bg-surface-card border border-border-strong text-red-600 px-3 py-1 rounded text-xs font-medium hover:bg-red-50 flex items-center gap-1 shadow-sm"
        >
          <LogOut className="w-3 h-3" /> Vacate
        </button>
      ),
    },
  ];

  return (
    <div className="pb-12">
      <div className="flex gap-4 border-b mb-6 pb-2">
        <Link
          href="/admin/hostel/rooms"
          className={`font-semibold ${pathname === "/admin/hostel/rooms" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Buildings & Rooms
        </Link>
        <Link
          href="/admin/hostel/allocations"
          className={`font-semibold ${pathname === "/admin/hostel/allocations" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Room Allocations
        </Link>
      </div>

      <PageHeader
        title="Hostel Allocations"
        description="Assign rooms to students and monitor active occupancies."
        action={
          !isAssignMode ? (
            <button
              onClick={() => setIsAssignMode(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium flex items-center gap-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4" /> Allocate Room
            </button>
          ) : (
            <button
              onClick={() => setIsAssignMode(false)}
              className="bg-surface text-ink px-4 py-2 rounded-md hover:bg-border font-medium shadow-sm"
            >
              Cancel Allocation
            </button>
          )
        }
      />

      {isAssignMode && (
        <div className="bg-surface-card p-6 rounded-xl shadow-sm border border-primary-100 mb-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="relative border-r pr-8">
            <h3 className="font-bold text-lg mb-4 text-ink">1. Identify Student</h3>
            {!selectedStudent ? (
              <div>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-2.5 text-ink-faint" />
                  <input
                    type="text"
                    placeholder="Search Student by Name or Adm No..."
                    className="w-full pl-10 pr-4 py-2 border rounded-md"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                  />
                </div>
                {filteredStudents.length > 0 && (
                  <div className="absolute z-10 w-[calc(100%-2rem)] mt-1 bg-surface-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredStudents.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => {
                          setSelectedStudent(st);
                          setSearchStudent("");
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-primary-50 text-sm border-b last:border-0"
                      >
                        <div className="font-bold">
                          {st.first_name} {st.last_name}
                        </div>
                        <div className="text-ink-muted text-xs">Adm: {st.admission_number}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-primary-50 p-4 rounded-lg border border-primary-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-ink">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </p>
                  <p className="text-sm text-primary-700">
                    Adm No: {selectedStudent.admission_number}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-xs font-medium text-primary-600 hover:underline"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <h3 className="font-bold text-lg mb-4 text-ink">2. Select Room</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Available Rooms</label>
                <select
                  className="w-full border rounded p-2"
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                >
                  <option value="">Select a room...</option>
                  {rooms
                    .filter((r) => r.occupancy < r.capacity)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.building_name} - Room {r.room_number} ({r.capacity - r.occupancy} beds
                        free)
                      </option>
                    ))}
                </select>
              </div>
              <button
                onClick={handleAssign}
                disabled={!selectedStudent || !selectedRoom || assigning}
                className="w-full bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50"
              >
                {assigning ? "Processing..." : "Confirm Room Allocation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-ink-muted">Loading active allocations...</div>
      ) : (
        <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 bg-surface border-b">
            <h3 className="font-bold text-ink">Active Allocations ({allocations.length})</h3>
          </div>
          <DataTable columns={columns} data={allocations} />
        </div>
      )}
    </div>
  );
}

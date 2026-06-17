"use client";
import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubNav } from "@/components/ui/SubNav";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { getBuildings, createBuilding, getRooms, createRoom } from "@/lib/api/hostel";
import { Plus, Home, BedDouble } from "lucide-react";

const tabs = [
  { href: "/admin/hostel/rooms", label: "Buildings & Rooms" },
  { href: "/admin/hostel/allocations", label: "Room Allocations" },
];

export default function HostelRoomsPage() {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [buildingForm, setBuildingForm] = useState({
    name: "",
    type: "Co-ed",
    warden_name: "",
    warden_contact: "",
  });
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomForm, setRoomForm] = useState({
    room_number: "",
    room_type: "Double",
    capacity: 2,
    monthly_fee: 0,
  });

  const loadBaseData = async () => {
    try {
      const [bRes, rRes] = await Promise.all([getBuildings(), getRooms()]);
      setBuildings(bRes.data || []);
      setRooms(rRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => {
    loadBaseData();
  }, []);
  useEffect(() => {
    getRooms(selectedBuilding || undefined)
      .then((res) => setRooms(res.data || []))
      .catch(() => {});
  }, [selectedBuilding]);

  const handleBuildingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBuilding(buildingForm);
      setIsBuildingModalOpen(false);
      setBuildingForm({ name: "", type: "Co-ed", warden_name: "", warden_contact: "" });
      loadBaseData();
    } catch {
      alert("Failed to add building");
    }
  };
  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuilding) return alert("Please select a building first.");
    try {
      await createRoom({ ...roomForm, building_id: selectedBuilding });
      setIsRoomModalOpen(false);
      setRoomForm({ room_number: "", room_type: "Double", capacity: 2, monthly_fee: 0 });
      getRooms(selectedBuilding).then((res) => setRooms(res.data || []));
    } catch {
      alert("Failed to add room");
    }
  };

  const columns = [
    {
      accessorKey: "room_number",
      header: "Room No.",
      cell: ({ row }: any) => (
        <span className="font-semibold text-ink">{row.original.room_number}</span>
      ),
    },
    { accessorKey: "building_name", header: "Building" },
    { accessorKey: "room_type", header: "Type" },
    {
      id: "occupancy",
      header: "Occupancy",
      cell: ({ row }: any) => {
        const o = row.original.occupancy,
          c = row.original.capacity;
        return (
          <span className={cn("font-semibold", o >= c ? "text-danger-text" : "text-success-text")}>
            {o} / {c}
          </span>
        );
      },
    },
    {
      accessorKey: "monthly_fee",
      header: "Fee (₹/mo)",
      cell: ({ row }: any) => <span className="text-ink-muted">₹{row.original.monthly_fee}</span>,
    },
  ];

  return (
    <div>
      <SubNav items={tabs} />
      <PageHeader
        title="Hostel Configuration"
        description="Manage hostel buildings and define room capacities and fees."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsBuildingModalOpen(true)}>
              <Home size={16} /> Add Building
            </Button>
            <Button onClick={() => setIsRoomModalOpen(true)} disabled={!selectedBuilding}>
              <Plus size={16} /> Add Room
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-surface-card rounded-card border border-border shadow-card overflow-hidden flex flex-col">
          <div className="p-4 bg-surface border-b border-border text-sm font-semibold text-ink">
            Hostel Buildings
          </div>
          <div className="p-2 space-y-1.5 max-h-[60vh] overflow-y-auto">
            <button
              onClick={() => setSelectedBuilding("")}
              className={cn(
                "w-full text-left p-3 rounded-input border transition-colors",
                !selectedBuilding
                  ? "bg-primary-50 border-primary-500"
                  : "border-transparent hover:bg-surface"
              )}
            >
              <div className="font-semibold text-ink text-sm">All Buildings</div>
            </button>
            {buildings.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBuilding(b.id)}
                className={cn(
                  "w-full text-left p-3 rounded-input border transition-colors",
                  selectedBuilding === b.id
                    ? "bg-primary-50 border-primary-500"
                    : "border-border hover:bg-surface"
                )}
              >
                <div className="font-semibold text-ink text-sm flex justify-between items-start gap-2">
                  {b.name}
                  <Badge variant="neutral">{b.type}</Badge>
                </div>
                <div className="text-xs text-ink-muted mt-1.5">Warden: {b.warden_name || "—"}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
          <div className="p-4 bg-surface border-b border-border flex items-center gap-2">
            <BedDouble size={18} className="text-ink-muted" />
            <h3 className="text-sm font-semibold text-ink">Room Inventory ({rooms.length})</h3>
          </div>
          <DataTable columns={columns} data={rooms} />
        </div>
      </div>

      <Modal
        open={isBuildingModalOpen}
        onClose={() => setIsBuildingModalOpen(false)}
        title="Add Hostel Building"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsBuildingModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="building-form">
              Add
            </Button>
          </>
        }
      >
        <form id="building-form" onSubmit={handleBuildingSubmit} className="space-y-4">
          <div>
            <Label required>Building Name</Label>
            <Input
              required
              value={buildingForm.name}
              onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
            />
          </div>
          <div>
            <Label required>Type</Label>
            <Select
              required
              value={buildingForm.type}
              onChange={(e) => setBuildingForm({ ...buildingForm, type: e.target.value })}
            >
              <option value="Boys">Boys</option>
              <option value="Girls">Girls</option>
              <option value="Co-ed">Co-ed</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Warden Name</Label>
              <Input
                value={buildingForm.warden_name}
                onChange={(e) => setBuildingForm({ ...buildingForm, warden_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Warden Contact</Label>
              <Input
                value={buildingForm.warden_contact}
                onChange={(e) =>
                  setBuildingForm({ ...buildingForm, warden_contact: e.target.value })
                }
              />
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        title="Add Room"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsRoomModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="room-form">
              Add
            </Button>
          </>
        }
      >
        <form id="room-form" onSubmit={handleRoomSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Room Number</Label>
              <Input
                required
                value={roomForm.room_number}
                onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
              />
            </div>
            <div>
              <Label required>Room Type</Label>
              <Select
                required
                value={roomForm.room_type}
                onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}
              >
                <option value="Single">Single</option>
                <option value="Double">Double</option>
                <option value="Triple">Triple</option>
                <option value="Dormitory">Dormitory</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Capacity (Beds)</Label>
              <Input
                required
                type="number"
                min="1"
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label required>Monthly Fee (₹)</Label>
              <Input
                required
                type="number"
                min="0"
                step="100"
                value={roomForm.monthly_fee}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, monthly_fee: parseFloat(e.target.value) })
                }
              />
            </div>
          </div>
          <p className="text-xs text-ink-muted">
            This fee links to the student's dues when they're assigned to this room.
          </p>
        </form>
      </Modal>
    </div>
  );
}

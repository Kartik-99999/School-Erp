"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Home, Users, BedDouble, Search, Plus } from "lucide-react";

export default function AdminHostelPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/hostel/rooms");
        setRooms(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalCapacity = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
  const occupied = rooms.reduce((acc, r) => acc + (r.occupancy || 0), 0);
  const available = totalCapacity - occupied;
  const filtered = rooms.filter(
    (r) =>
      (r.room_number || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.building_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Hostel & Dormitory"
        description="Manage rooms, allocations, and warden assignments."
        action={
          <Button onClick={() => router.push("/admin/hostel/rooms")}>
            <Plus size={16} /> Add Room
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Capacity"
          value={totalCapacity}
          icon={<Home size={20} />}
          iconClassName="bg-primary-50 text-primary-600"
        />
        <StatCard
          title="Currently Occupied"
          value={occupied}
          icon={<Users size={20} />}
          iconClassName="bg-success-bg text-success-text"
        />
        <StatCard
          title="Available Beds"
          value={available}
          icon={<BedDouble size={20} />}
          iconClassName="bg-warning-bg text-warning-text"
        />
      </div>

      <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Input
              placeholder="Search rooms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Home size={22} />}
            title={search ? "No matching rooms" : "No rooms configured"}
            description={
              search ? "Try a different search." : "Add a building and rooms to get started."
            }
            action={
              !search && (
                <Button onClick={() => router.push("/admin/hostel/rooms")}>
                  <Plus size={16} /> Configure Rooms
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Room No", "Block", "Type / Capacity", "Occupancy", "Status"].map((h) => (
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
                {filtered.map((room, idx) => {
                  const full = room.occupancy >= room.capacity;
                  return (
                    <tr key={idx} className="hover:bg-surface transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-ink">
                        {room.room_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-muted">{room.building_name}</td>
                      <td className="px-4 py-3 text-sm text-ink-muted">
                        {room.room_type} / {room.capacity} beds
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-ink">
                        {room.occupancy} / {room.capacity}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={full ? "danger" : "success"}>
                          {full ? "Full" : "Available"}
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

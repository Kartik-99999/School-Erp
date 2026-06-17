"use client";
import React, { useEffect, useState } from "react";
import { Bus, Home, MapPin, User, Phone, Clock } from "lucide-react";
import { getMyFacilities } from "@/lib/api/studentPortal";

const Row = ({ icon: Icon, label, value }: { icon: any; label: string; value: any }) => (
  <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
    <span className="flex items-center gap-2 text-sm text-ink-muted">
      <Icon className="w-4 h-4" /> {label}
    </span>
    <span className="font-bold text-ink text-sm text-right">{value ?? "—"}</span>
  </div>
);

export default function StudentFacilitiesPage() {
  const [loading, setLoading] = useState(true);
  const [hostel, setHostel] = useState<any>(null);
  const [transport, setTransport] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyFacilities();
        setHostel(res.data.hostel);
        setTransport(res.data.transport);
      } catch (e) {
        console.error("Failed to load facilities", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-ink">Facilities</h2>
        <p className="text-ink-muted mt-1">Your hostel allotment and transport subscription.</p>
      </div>

      {loading ? (
        <div className="animate-pulse grid md:grid-cols-2 gap-6">
          <div className="h-64 bg-surface rounded-card" />
          <div className="h-64 bg-surface rounded-card" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hostel */}
          <div className="bg-surface-card p-6 rounded-card border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                <Home className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-ink">Hostel</h3>
            </div>
            {hostel ? (
              <div>
                <Row icon={Home} label="Building" value={hostel.building} />
                <Row
                  icon={MapPin}
                  label="Room"
                  value={`${hostel.room_number ?? "—"}${hostel.room_type ? ` (${hostel.room_type})` : ""}`}
                />
                <Row icon={User} label="Warden" value={hostel.warden} />
                <Row icon={Phone} label="Warden Contact" value={hostel.warden_contact} />
                <Row
                  icon={Clock}
                  label="Monthly Fee"
                  value={
                    hostel.monthly_fee != null ? `₹${Number(hostel.monthly_fee).toFixed(2)}` : "—"
                  }
                />
              </div>
            ) : (
              <p className="text-ink-muted text-sm py-8 text-center">
                You are not allotted a hostel room.
              </p>
            )}
          </div>

          {/* Transport */}
          <div className="bg-surface-card p-6 rounded-card border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Bus className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-ink">Transport</h3>
            </div>
            {transport ? (
              <div>
                <Row icon={MapPin} label="Route" value={transport.route_name} />
                <Row icon={MapPin} label="Stop" value={transport.stop_name} />
                <Row icon={Clock} label="Pickup" value={transport.pickup_time} />
                <Row icon={Clock} label="Drop" value={transport.drop_time} />
                <Row icon={Bus} label="Vehicle" value={transport.vehicle_number} />
                <Row icon={User} label="Driver" value={transport.driver_name} />
                <Row icon={Phone} label="Driver Contact" value={transport.driver_contact} />
              </div>
            ) : (
              <p className="text-ink-muted text-sm py-8 text-center">
                You have not subscribed to school transport.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

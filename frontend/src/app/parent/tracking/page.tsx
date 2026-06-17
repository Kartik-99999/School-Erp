"use client";
import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
import { MapPin, Bus, Navigation, Phone, ShieldAlert, CheckCircle, Clock } from "lucide-react";

export default function ParentBusTrackingPage() {
  const [eta, setEta] = useState(14);
  const [isLive, setIsLive] = useState(true);
  const [routeData, setRouteData] = useState({
    routeName: "Fetching...",
    passenger: "Fetching...",
    driverName: "Fetching...",
  });

  useEffect(() => {
    const fetchRouteInfo = async () => {
      try {
        // Fallback to fetch routes to simulate getting user's route info
        const res = await api.get("/transport/routes");
        if (res.data.success && res.data.data.length > 0) {
          const route = res.data.data[0];
          setRouteData({
            routeName: route.name || "R-14 (Vasant Kunj)",
            passenger: "Assigned Student",
            driverName: "Driver Assigned",
          });
        } else {
          setRouteData({
            routeName: "R-14 (Vasant Kunj)",
            passenger: "Rahul Sharma",
            driverName: "Ramesh Singh",
          });
        }
      } catch (e) {
        setRouteData({
          routeName: "R-14 (Vasant Kunj)",
          passenger: "Rahul Sharma",
          driverName: "Ramesh Singh",
        });
      }
    };
    fetchRouteInfo();
  }, []);

  // Simulate bus moving closer
  useEffect(() => {
    const interval = setInterval(() => {
      setEta((prev) => (prev > 1 ? prev - 1 : 0));
    }, 60000); // Reduce ETA every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-ink">Live Bus Tracking</h2>
        <p className="text-ink-muted mt-1">Track your child's school bus in real-time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Map Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface rounded-card border border-border h-[500px] relative overflow-hidden shadow-inner flex items-center justify-center bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=28.6139,77.2090&zoom=14&size=800x500&maptype=roadmap&style=feature:all|element:geometry.fill|color:0xeeeeee&style=feature:water|element:geometry.fill|color:0xc8d7d4&style=feature:poi|element:geometry.fill|color:0xd3e1d1&style=feature:road|element:geometry.fill|color:0xffffff&style=feature:road|element:geometry.stroke|color:0xe6e6e6')] bg-cover bg-center">
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none"></div>

            {/* Live Status Badge */}
            <div className="absolute top-6 left-6 bg-surface-card/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-border">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-ink text-sm">GPS Active</span>
            </div>

            {/* Simulated Bus Pin */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-bounce [transition-duration:3000ms]">
              <div className="bg-amber-400 p-3 rounded-full shadow-xl border-4 border-white text-amber-900">
                <Bus className="w-6 h-6" />
              </div>
              <div className="mt-2 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> DL-1P-1234
              </div>
            </div>

            {/* Home Pin */}
            <div className="absolute bottom-1/4 right-1/4 flex flex-col items-center">
              <div className="bg-primary-600 p-2 rounded-full shadow-lg border-2 border-white text-white">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="mt-1 bg-surface-card text-ink text-xs font-bold px-2 py-0.5 rounded shadow">
                Home Drop
              </div>
            </div>

            {/* Route Line (Simulated via SVG) */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }}
            >
              <path
                d="M 400 250 Q 500 300 600 375"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="6"
                strokeDasharray="10, 10"
                className="animate-[dash_20s_linear_infinite]"
              />
            </svg>
          </div>
        </div>

        {/* Bus Details & Status */}
        <div className="space-y-6">
          <div className="bg-primary-600 rounded-card p-6 text-white shadow-lg shadow-blue-600/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Bus className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h3 className="text-blue-200 font-medium mb-1">Estimated Arrival</h3>
              <div className="text-5xl font-bold mb-4">
                {eta} <span className="text-2xl font-bold">mins</span>
              </div>
              <div className="flex items-center gap-2 text-blue-100 bg-primary-700/50 w-fit px-3 py-1.5 rounded-full text-sm font-medium">
                <Navigation className="w-4 h-4" /> 2.4 km away
              </div>
            </div>
          </div>

          <div className="bg-surface-card rounded-card border border-border shadow-sm p-6">
            <h3 className="font-bold text-ink mb-4 flex items-center gap-2">
              <Bus className="w-5 h-5 text-ink-faint" /> Trip Details
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-ink-muted">Route Name</span>
                <span className="font-bold text-ink">{routeData.routeName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-ink-muted">Passenger</span>
                <span className="font-bold text-ink">{routeData.passenger}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-ink-muted">Speed</span>
                <span className="font-bold text-emerald-600">32 km/h</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-card rounded-card border border-border shadow-sm p-6">
            <h3 className="font-bold text-ink mb-4">Driver Contact</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center font-bold text-ink-muted border border-border uppercase">
                {routeData.driverName.substring(0, 2)}
              </div>
              <div>
                <p className="font-bold text-ink">{routeData.driverName}</p>
                <p className="text-sm text-ink-muted">Experience: 5 Years</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-bold transition-colors">
                <Phone className="w-4 h-4" /> Call Driver
              </button>
              <button className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-bold transition-colors">
                <ShieldAlert className="w-4 h-4" /> SOS Alert
              </button>
            </div>
          </div>

          <div className="bg-surface border border-border p-4 rounded-card flex gap-3 items-start">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm text-ink-muted leading-relaxed">
              <strong className="text-ink block mb-1">Boarding Confirmed</strong>
              Rahul boarded the bus safely at 3:15 PM from the school campus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

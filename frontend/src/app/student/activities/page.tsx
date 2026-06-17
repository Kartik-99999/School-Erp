"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Shield, Sparkles, Trophy } from "lucide-react";

export default function StudentActivitiesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/activities/me")
      .then((r) => setData(r.data.data))
      .catch(() => setData({ house: null, clubs: [], sports: [] }))
      .finally(() => setLoading(false));
  }, []);

  const empty = data && !data.house && !data.clubs?.length && !data.sports?.length;

  return (
    <div>
      <PageHeader title="My Activities" description="Your house, clubs, and sports at school." />

      {loading ? (
        <p className="text-ink-muted">Loading…</p>
      ) : empty ? (
        <EmptyState
          icon={<Trophy size={22} />}
          title="Nothing yet"
          description="You haven't been assigned to a house, club, or sport yet. Check with the school office."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* House */}
          <div className="bg-surface-card rounded-card border border-border shadow-card p-5">
            <div className="flex items-center gap-2 text-ink-muted text-sm font-semibold mb-3">
              <Shield size={16} /> House
            </div>
            {data.house ? (
              <div>
                <p className="text-lg font-bold" style={{ color: data.house.color || undefined }}>
                  {data.house.name}
                </p>
                <p className="text-sm text-ink-muted">{data.house.points} house points</p>
              </div>
            ) : (
              <p className="text-sm text-ink-faint">Not assigned</p>
            )}
          </div>

          {/* Clubs */}
          <div className="bg-surface-card rounded-card border border-border shadow-card p-5">
            <div className="flex items-center gap-2 text-ink-muted text-sm font-semibold mb-3">
              <Sparkles size={16} /> Clubs
            </div>
            {data.clubs?.length ? (
              <ul className="space-y-1">
                {data.clubs.map((c: any) => (
                  <li key={c.id} className="text-sm text-ink">
                    {c.name}
                    {c.role && c.role !== "Member" && (
                      <span className="text-ink-faint"> · {c.role}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-faint">None</p>
            )}
          </div>

          {/* Sports */}
          <div className="bg-surface-card rounded-card border border-border shadow-card p-5">
            <div className="flex items-center gap-2 text-ink-muted text-sm font-semibold mb-3">
              <Trophy size={16} /> Sports
            </div>
            {data.sports?.length ? (
              <ul className="space-y-1">
                {data.sports.map((s: any) => (
                  <li key={s.id} className="text-sm text-ink">
                    {s.name}
                    {(s.team || s.position) && (
                      <span className="text-ink-faint">
                        {" "}
                        · {[s.team, s.position].filter(Boolean).join(" ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-faint">None</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Shield, Sparkles, Trophy, GraduationCap } from "lucide-react";

export default function ParentActivitiesPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/activities/my-children")
      .then((r) => setChildren(r.data.data || []))
      .catch(() => setChildren([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Activities" description="Your children's house, clubs, and sports." />

      {loading ? (
        <p className="text-ink-muted">Loading…</p>
      ) : children.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={22} />}
          title="No children linked"
          description="No student records are linked to your account. Please contact the school office."
        />
      ) : (
        <div className="space-y-6">
          {children.map((c) => {
            const a = c.activities || {};
            return (
              <div
                key={c.student.id}
                className="bg-surface-card rounded-card border border-border shadow-card p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap size={18} className="text-primary-600" />
                  <h3 className="font-bold text-ink">{c.student.name}</h3>
                  {c.student.admission_number && (
                    <span className="text-xs text-ink-faint">· {c.student.admission_number}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-input border border-border p-4">
                    <div className="flex items-center gap-2 text-ink-muted text-sm font-semibold mb-2">
                      <Shield size={15} /> House
                    </div>
                    {a.house ? (
                      <div>
                        <p className="font-bold" style={{ color: a.house.color || undefined }}>
                          {a.house.name}
                        </p>
                        <p className="text-sm text-ink-muted">{a.house.points} house points</p>
                      </div>
                    ) : (
                      <p className="text-sm text-ink-faint">Not assigned</p>
                    )}
                  </div>
                  <div className="rounded-input border border-border p-4">
                    <div className="flex items-center gap-2 text-ink-muted text-sm font-semibold mb-2">
                      <Sparkles size={15} /> Clubs
                    </div>
                    {a.clubs?.length ? (
                      <ul className="space-y-1">
                        {a.clubs.map((cl: any) => (
                          <li key={cl.id} className="text-sm text-ink">
                            {cl.name}
                            {cl.role && cl.role !== "Member" && (
                              <span className="text-ink-faint"> · {cl.role}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-ink-faint">None</p>
                    )}
                  </div>
                  <div className="rounded-input border border-border p-4">
                    <div className="flex items-center gap-2 text-ink-muted text-sm font-semibold mb-2">
                      <Trophy size={15} /> Sports
                    </div>
                    {a.sports?.length ? (
                      <ul className="space-y-1">
                        {a.sports.map((s: any) => (
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

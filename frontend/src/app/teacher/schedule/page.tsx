"use client";
import React, { useEffect, useState } from "react";
import { Clock, CalendarDays } from "lucide-react";
import api from "@/lib/axios";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TeacherSchedulePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [week, setWeek] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    new Date().getDay()
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/staff?role=Teacher`);
        const me = res.data?.data?.find((t: any) => t.user_id === (session?.user as any)?.id);
        if (me) setProfile(me);
        else setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    if ((session?.user as any)?.id) fetchProfile();
  }, [session]);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const res = await api.get(`/academics/timetable/teacher/${profile.id}`);
        setWeek(res.data?.data || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile]);

  const slotsFor = (day: string) =>
    (week[day] || []).filter((s) => s.subject_name !== "-" && !s.is_break);
  const totalThisWeek = DAYS.reduce((n, d) => n + slotsFor(d).length, 0);

  return (
    <div>
      <PageHeader
        title="My Schedule"
        description={`Your weekly teaching timetable — ${totalThisWeek} lectures.`}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-48 rounded-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {DAYS.map((day) => {
            const slots = slotsFor(day);
            const isToday = day === todayName;
            return (
              <div
                key={day}
                className={cn(
                  "bg-surface-card rounded-card border shadow-card overflow-hidden",
                  isToday ? "border-primary-500 ring-1 ring-primary-100" : "border-border"
                )}
              >
                <div
                  className={cn(
                    "px-4 py-3 border-b border-border flex items-center justify-between",
                    isToday && "bg-primary-50"
                  )}
                >
                  <h3
                    className={cn(
                      "text-sm font-semibold flex items-center gap-2",
                      isToday ? "text-primary-700" : "text-ink"
                    )}
                  >
                    <CalendarDays size={15} /> {day}
                  </h3>
                  {isToday && (
                    <span className="text-[11px] font-semibold text-primary-600">Today</span>
                  )}
                </div>
                {slots.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-ink-faint text-center">No classes</p>
                ) : (
                  <div className="divide-y divide-border">
                    {slots.map((s, i) => (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-ink">
                            {s.class_name}
                            {s.section_name && s.section_name !== "-" ? ` - ${s.section_name}` : ""}
                          </p>
                          <span className="text-xs text-ink-muted flex items-center gap-1">
                            <Clock size={12} /> {s.start_time}
                          </span>
                        </div>
                        <p className="text-sm text-ink-muted">{s.subject_name}</p>
                        <p className="text-[11px] text-ink-faint mt-0.5">
                          {s.period_name}
                          {s.room_number ? ` · Room ${s.room_number}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

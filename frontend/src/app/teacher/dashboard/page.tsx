"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BookOpen, Users, Calendar as CalendarIcon, CheckCircle } from "lucide-react";

export default function TeacherDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/staff?role=Teacher`);
        const me = res.data?.data?.find((t: any) => t.user_id === (session?.user as any)?.id);
        if (me) setProfile(me);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if ((session?.user as any)?.id) fetchProfile();
  }, [session]);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!profile?.id) return;
      try {
        const timetableRes = await api.get(`/academics/timetable/teacher/${profile.id}`);
        // data is mapped by days. Let's get today's day
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const todayStr = days[new Date().getDay()];
        const todaySlots = timetableRes.data?.data?.[todayStr] || [];
        const activeClasses = todaySlots.filter((s: any) => s.subject_name !== "-" && !s.is_break);
        setSchedule(activeClasses);
        setStats({
          classesScheduled: activeClasses.length,
          pendingAssignments: 3,
          attendanceMarked: false,
        });
      } catch (err) {
        console.error("Dashboard fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    if (profile) fetchDashboard();
  }, [profile]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-card p-8 sm:p-10 text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-surface-card/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-pink-500/20 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Good morning, {profile?.first_name || session?.user?.name || "Teacher"}! ✨
          </h1>
          <p className="text-indigo-100 text-lg max-w-2xl">
            You have <strong className="text-white">{stats?.classesScheduled || 0} classes</strong>{" "}
            today. Your first class is in 15 minutes.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-card h-40 rounded-card border border-border shadow-sm"></div>
          <div className="bg-surface-card h-40 rounded-card border border-border shadow-sm"></div>
          <div className="bg-surface-card h-40 rounded-card border border-border shadow-sm"></div>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              onClick={() => router.push("/teacher/schedule")}
              className="bg-surface-card p-6 rounded-card shadow-sm border border-border hover:shadow-md transition-shadow group cursor-pointer flex items-center justify-between"
            >
              <div>
                <p className="text-ink-muted font-medium mb-1">Today's Classes</p>
                <h3 className="font-bold text-3xl text-ink">{stats?.classesScheduled || 0}</h3>
                <p className="text-ink-muted text-sm font-medium mt-2">First class: 09:00 AM</p>
              </div>
              <div className="w-16 h-16 rounded-card bg-primary-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CalendarIcon className="w-8 h-8 text-primary-600" />
              </div>
            </div>

            <div className="bg-surface-card p-6 rounded-card shadow-sm border border-border hover:shadow-md transition-shadow group cursor-pointer flex items-center justify-between">
              <div>
                <p className="text-ink-muted font-medium mb-1">Pending Grading</p>
                <h3 className="font-bold text-3xl text-ink">{stats?.pendingAssignments || 0}</h3>
                <p className="text-orange-500 text-sm font-medium mt-2">Needs attention</p>
              </div>
              <div className="w-16 h-16 rounded-card bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8 text-orange-600" />
              </div>
            </div>

            <div className="bg-surface-card p-6 rounded-card shadow-sm border border-border hover:shadow-md transition-shadow group cursor-pointer flex items-center justify-between">
              <div>
                <p className="text-ink-muted font-medium mb-1">Attendance</p>
                <h3 className="font-bold text-xl text-ink mt-1">
                  {stats?.attendanceMarked ? "Completed" : "Pending"}
                </h3>
                <p className="text-red-500 text-sm font-medium mt-2">No missing attendance</p>
              </div>
              <div className="w-16 h-16 rounded-card bg-red-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Grid Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upcoming Classes */}
            <div className="bg-surface-card rounded-card p-6 sm:p-8 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-ink">Today's Schedule</h3>
                <button
                  onClick={() => router.push("/teacher/schedule")}
                  className="text-primary-600 text-sm font-semibold hover:underline"
                >
                  View Timetable
                </button>
              </div>
              <div className="space-y-4">
                {schedule.length > 0 ? (
                  schedule.slice(0, 4).map((cls, idx) => (
                    <div
                      key={idx}
                      className={`p-5 rounded-card border ${idx === 0 ? "border-primary-100 bg-primary-50" : "border-border hover:border-border"}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className={`font-bold text-lg ${idx === 0 ? "text-ink" : "text-ink"}`}>
                          {cls.class_name}
                        </h4>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full ${idx === 0 ? "bg-indigo-200 text-indigo-800" : "bg-surface text-ink-muted"}`}
                        >
                          {cls.start_time} - {cls.end_time}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm mt-3">
                        <span className="flex items-center gap-1 text-ink-muted font-medium">
                          <BookOpen className="w-4 h-4" /> {cls.subject_name}
                        </span>
                        <span className="flex items-center gap-1 text-ink-muted">
                          <Users className="w-4 h-4" /> Room {cls.room_number || "TBA"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-ink-muted bg-surface rounded-card border border-dashed border-border">
                    You have no scheduled classes today.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions / Tasks */}
            <div className="bg-surface-card rounded-card p-6 sm:p-8 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-ink">Tasks requiring attention</h3>
              </div>
              <div className="space-y-4">
                <div className="p-8 text-center text-ink-muted bg-surface rounded-card border border-dashed border-border">
                  You have no pending tasks right now.
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

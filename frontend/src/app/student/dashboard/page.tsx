"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useSession } from "next-auth/react";
import { GraduationCap, Book, Calendar, CheckSquare } from "lucide-react";

export default function StudentDashboard() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/students/me`);
        setProfile(res.data?.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (session) {
      if ((session.user as any)?.id) {
        fetchProfile();
      } else {
        setLoading(false);
      }
    }
  }, [session]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-card p-8 sm:p-10 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-surface-card/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Welcome back, {profile?.first_name || "Student"}! 👋
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl">
            You have <strong className="text-white">2 pending assignments</strong> due this week and
            your next class is Physics in 45 minutes.
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
            <div className="bg-surface-card p-6 rounded-card shadow-sm border border-border hover:shadow-md transition-shadow group cursor-pointer flex items-center justify-between">
              <div>
                <p className="text-ink-muted font-medium mb-1">Current GPA</p>
                <h3 className="font-bold text-3xl text-ink">3.8</h3>
                <p className="text-emerald-500 text-sm font-medium mt-2 flex items-center gap-1">
                  ↑ 0.2 from last term
                </p>
              </div>
              <div className="w-16 h-16 rounded-card bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <GraduationCap className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-surface-card p-6 rounded-card shadow-sm border border-border hover:shadow-md transition-shadow group cursor-pointer flex items-center justify-between">
              <div>
                <p className="text-ink-muted font-medium mb-1">Attendance</p>
                <h3 className="font-bold text-3xl text-ink">96%</h3>
                <p className="text-ink-muted text-sm font-medium mt-2 flex items-center gap-1">
                  Target: 85%
                </p>
              </div>
              <div className="w-16 h-16 rounded-card bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-8 h-8 text-emerald-600" />
              </div>
            </div>

            <div className="bg-surface-card p-6 rounded-card shadow-sm border border-border hover:shadow-md transition-shadow group cursor-pointer flex items-center justify-between">
              <div>
                <p className="text-ink-muted font-medium mb-1">Homework</p>
                <h3 className="font-bold text-3xl text-ink">2</h3>
                <p className="text-amber-500 text-sm font-medium mt-2 flex items-center gap-1">
                  Due tomorrow
                </p>
              </div>
              <div className="w-16 h-16 rounded-card bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Book className="w-8 h-8 text-amber-600" />
              </div>
            </div>
          </div>

          {/* Grid Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Today's Schedule */}
            <div className="bg-surface-card rounded-card p-6 sm:p-8 shadow-sm border border-border">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-ink">Today's Schedule</h3>
                <button className="text-primary-600 text-sm font-semibold hover:underline">
                  View Full
                </button>
              </div>
              <div className="space-y-6">
                {[].map((cls: any, idx: number) => (
                  <div key={idx} className="flex gap-4 relative">
                    <div className="w-24 text-right shrink-0">
                      <span
                        className={`text-sm font-bold ${cls.status === "active" ? "text-primary-600" : "text-ink-muted"}`}
                      >
                        {cls.time}
                      </span>
                    </div>
                    <div className="relative">
                      <div
                        className={`w-3 h-3 rounded-full mt-1.5 ${
                          cls.status === "completed"
                            ? "bg-border"
                            : cls.status === "active"
                              ? "bg-primary-600 ring-4 ring-blue-100"
                              : "bg-surface"
                        }`}
                      ></div>
                      {idx !== 3 && (
                        <div className="absolute top-4 bottom-[-1.5rem] left-1.5 w-px bg-surface"></div>
                      )}
                    </div>
                    <div className="pb-6">
                      <h4
                        className={`font-bold ${cls.status === "active" ? "text-ink" : "text-ink"}`}
                      >
                        {cls.subject}
                      </h4>
                      {cls.teacher && <p className="text-sm text-ink-muted">{cls.teacher}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-surface-card rounded-card p-6 sm:p-8 shadow-sm border border-border flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-ink">Upcoming Deadlines</h3>
                <button className="text-primary-600 text-sm font-semibold hover:underline">
                  All Tasks
                </button>
              </div>
              <div className="space-y-4 flex-1">
                <div className="group p-4 rounded-card border border-border hover:border-primary-100 hover:bg-primary-50 transition-colors flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <Book className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink group-hover:text-primary-700 transition-colors">
                      Physics Lab Report
                    </h4>
                    <p className="text-sm text-ink-muted mt-1">Due Tomorrow, 11:59 PM</p>
                  </div>
                </div>

                <div className="group p-4 rounded-card border border-border hover:border-primary-100 hover:bg-primary-50 transition-colors flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <CheckSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink group-hover:text-primary-700 transition-colors">
                      History Essay Draft
                    </h4>
                    <p className="text-sm text-ink-muted mt-1">Due Friday, 5:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Notices */}
            <div className="bg-surface-card rounded-card p-6 sm:p-8 shadow-sm border border-border lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-ink">Recent Notices & Announcements</h3>
                <a
                  href="/student/notices"
                  className="text-primary-600 text-sm font-semibold hover:underline"
                >
                  Go to Noticeboard
                </a>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-card border border-border hover:border-primary-100 hover:shadow-md transition-all flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                      Circular
                    </span>
                    <span className="text-xs text-ink-faint font-medium ml-auto">
                      Today, 09:00 AM
                    </span>
                  </div>
                  <h4 className="font-bold text-ink">Change in Winter Timings</h4>
                  <p className="text-sm text-ink-muted line-clamp-2">
                    Starting next Monday, the school will begin at 8:30 AM instead of 8:00 AM due to
                    the winter season.
                  </p>
                </div>
                <div className="p-5 rounded-card border border-border hover:border-primary-100 hover:shadow-md transition-all flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                      Announcement
                    </span>
                    <span className="text-xs text-ink-faint font-medium ml-auto">Yesterday</span>
                  </div>
                  <h4 className="font-bold text-ink">Annual Sports Day Registrations</h4>
                  <p className="text-sm text-ink-muted line-clamp-2">
                    Registrations for the Annual Sports Day are now open. Please submit your names
                    to your class teachers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

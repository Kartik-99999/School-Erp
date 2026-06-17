"use client";
import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Users, CreditCard, Bell, Calendar } from "lucide-react";
import { useSession } from "next-auth/react";
import api from "@/lib/axios";

export default function ParentDashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState({
    students: [],
    notices: [],
    pendingFees: 14500,
    events: 3,
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [studentsRes, noticesRes] = await Promise.all([
          api.get("/students"),
          api.get("/communication/notices?target=Parents"),
        ]);

        setData({
          students: studentsRes.data.success ? studentsRes.data.data.slice(0, 2) : [],
          notices: noticesRes.data.success ? noticesRes.data.data.slice(0, 2) : [],
          pendingFees: 0,
          events: 3,
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <div>
      <PageHeader
        title="Parent Dashboard"
        description={`Welcome back, ${session?.user?.name || "Parent"}!`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-surface-card p-6 rounded-lg border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary-50 text-primary-600 rounded-full">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-ink-muted">Linked Students</p>
            <h3 className="text-2xl font-bold">{data.students.length || 0}</h3>
          </div>
        </div>

        <div className="bg-surface-card p-6 rounded-lg border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-ink-muted">Pending Fees</p>
            <h3 className="text-2xl font-bold">₹ {data.pendingFees.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-surface-card p-6 rounded-lg border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-ink-muted">Upcoming Events</p>
            <h3 className="text-2xl font-bold">{data.events}</h3>
          </div>
        </div>

        <div className="bg-surface-card p-6 rounded-lg border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-ink-muted">New Notices</p>
            <h3 className="text-2xl font-bold">{data.notices.length || 0}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold">My Children Overview</h3>
            </div>
            <div className="p-6">
              <p className="text-ink-muted mb-4">
                Select a student to view detailed performance, attendance, and academics.
              </p>

              <div className="space-y-4">
                {data.students.length > 0 ? (
                  data.students.map((student: any) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-surface"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                          {student.first_name[0]}
                        </div>
                        <div>
                          <h4 className="font-bold">
                            {student.first_name} {student.last_name}
                          </h4>
                          <p className="text-sm text-ink-muted">
                            Adm No: {student.admission_number}
                          </p>
                        </div>
                      </div>
                      <button className="text-primary-600 font-medium hover:underline">
                        View Profile
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-ink-muted p-4 border rounded-lg border-dashed">
                    No students linked to your account yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface-card rounded-lg border border-border shadow-sm">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-bold">Recent Notices</h3>
            </div>
            <div className="p-6 space-y-4">
              {data.notices.length > 0 ? (
                data.notices.map((notice: any) => (
                  <div key={notice.id} className="border-l-4 border-primary-500 pl-4 py-1">
                    <p className="text-xs text-ink-muted">
                      {new Date(notice.created_at).toLocaleDateString()}
                    </p>
                    <h4 className="font-semibold text-sm">{notice.title}</h4>
                    <p className="text-xs text-ink-muted mt-1">
                      {notice.content.substring(0, 60)}...
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-ink-muted text-sm">No new notices at this time.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

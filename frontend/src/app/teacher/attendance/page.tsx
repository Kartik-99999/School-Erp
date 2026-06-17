"use client";
import React, { useEffect, useState } from "react";
import { ClipboardList, CheckCircle } from "lucide-react";
import api from "@/lib/axios";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

export default function TeacherAttendancePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/staff?role=Teacher`);
        const me = res.data?.data?.find((t: any) => t.user_id === (session?.user as any)?.id);
        if (me) setProfile(me);
      } catch (err) {
        console.error(err);
      }
    };
    if ((session?.user as any)?.id) fetchProfile();
  }, [session]);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!profile?.id) return;
      try {
        const res = await api.get(`/academics/timetable/teacher/${profile.id}`);
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const todayStr = days[new Date().getDay()];
        const todaySlots = res.data?.data?.[todayStr] || [];

        const uniqueClassesMap = new Map();
        todaySlots.forEach((s: any) => {
          if (s.class_id && s.section_id) {
            const key = `${s.class_id}-${s.section_id}`;
            if (!uniqueClassesMap.has(key)) {
              uniqueClassesMap.set(key, {
                class_id: s.class_id,
                section_id: s.section_id,
                name: s.class_name,
              });
            }
          }
        });

        setClasses(Array.from(uniqueClassesMap.values()));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (profile) fetchSchedule();
  }, [profile]);

  const loadStudents = async (cls: any) => {
    setSelectedClass(cls);
    setStudents([]);
    try {
      const res = await api.get(`/students?class_id=${cls.class_id}&section_id=${cls.section_id}`);
      const studs = res.data?.data || [];
      setStudents(studs);

      const initAtt: any = {};
      studs.forEach((s: any) => {
        initAtt[s.id] = "Present";
      });
      setAttendance(initAtt);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load students");
    }
  };

  const handleMark = (studentId: string, status: string) => {
    setAttendance((prev: any) => ({ ...prev, [studentId]: status }));
  };

  const submitAttendance = async () => {
    if (!selectedClass) return;
    try {
      const records = Object.keys(attendance).map((studentId) => ({
        student_id: studentId,
        status: attendance[studentId],
        remarks: "",
      }));

      const payload = {
        class_id: selectedClass.class_id,
        section_id: selectedClass.section_id,
        date: new Date().toISOString().split("T")[0],
        attendance_records: records,
      };

      await api.post("/attendance/students/bulk", payload);
      toast.success("Attendance submitted successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to submit attendance");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink">Mark Attendance</h2>
        <div className="text-sm text-ink-muted font-medium">
          Date: <span className="text-ink ml-1">{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <div className="bg-surface-card rounded-card p-8 shadow-sm border border-border">
        <h3 className="text-lg font-bold text-ink mb-4">Your Classes Today</h3>
        {loading ? (
          <div className="animate-pulse flex gap-4">
            <div className="h-20 w-1/3 bg-surface rounded-xl"></div>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-ink-muted mb-8">You have no classes assigned for today.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {classes.map((cls, idx) => {
              const isSelected =
                selectedClass?.class_id === cls.class_id &&
                selectedClass?.section_id === cls.section_id;
              return (
                <button
                  key={idx}
                  onClick={() => loadStudents(cls)}
                  className={`p-4 rounded-xl border text-left transition-colors ${isSelected ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500" : "border-border hover:border-border-strong"}`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`font-bold ${isSelected ? "text-ink" : "text-ink"}`}>
                      {cls.name}
                    </span>
                  </div>
                  <p
                    className={`text-sm mt-1 ${isSelected ? "text-primary-600" : "text-ink-muted"}`}
                  >
                    Select to mark
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {selectedClass && (
          <div className="border border-border rounded-card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="p-4 text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="p-4 text-xs font-semibold text-ink-muted uppercase tracking-wider text-center">
                    Present
                  </th>
                  <th className="p-4 text-xs font-semibold text-ink-muted uppercase tracking-wider text-center">
                    Absent
                  </th>
                  <th className="p-4 text-xs font-semibold text-ink-muted uppercase tracking-wider text-center">
                    Late
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((student, idx) => (
                  <tr key={idx} className="hover:bg-surface transition-colors">
                    <td className="p-4 font-medium text-ink">
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="p-4 text-center">
                      <input
                        type="radio"
                        name={`att-${student.id}`}
                        onChange={() => handleMark(student.id, "Present")}
                        checked={attendance[student.id] === "Present"}
                        className="w-5 h-5 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <input
                        type="radio"
                        name={`att-${student.id}`}
                        onChange={() => handleMark(student.id, "Absent")}
                        checked={attendance[student.id] === "Absent"}
                        className="w-5 h-5 text-red-600 focus:ring-red-500"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <input
                        type="radio"
                        name={`att-${student.id}`}
                        onChange={() => handleMark(student.id, "Late")}
                        checked={attendance[student.id] === "Late"}
                        className="w-5 h-5 text-amber-600 focus:ring-amber-500"
                      />
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-ink-muted">
                      No students found in this class.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {students.length > 0 && (
              <div className="p-4 bg-surface border-t border-border flex justify-end">
                <button
                  onClick={submitAttendance}
                  className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                  Submit Attendance
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

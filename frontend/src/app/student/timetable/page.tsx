"use client";
import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import api from "@/lib/axios";

export default function TimetablePage() {
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState("");

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        // 1. Get student profile to find their class and section
        const profileRes = await api.get("/students/me");
        const profile = profileRes.data.data;

        if (!profile?.current_class_id || !profile?.current_section_id) {
          setLoading(false);
          return;
        }

        // 2. Fetch detailed timetable for that class and section
        const timetableRes = await api.get(
          `/academics/timetable/detailed?class_id=${profile.current_class_id}&section_id=${profile.current_section_id}`
        );

        setScheduleData(timetableRes.data.data);

        // Default to today's day of week, or Monday if weekend
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const todayDay = days[new Date().getDay()];
        if (timetableRes.data.data.days.includes(todayDay)) {
          setSelectedDay(todayDay);
        } else {
          setSelectedDay("Monday"); // Default fallback
        }
      } catch (err) {
        console.error("Failed to fetch timetable", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, []);

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDay(e.target.value);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-surface-card rounded-card p-8 shadow-sm border border-border">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-ink">Weekly Timetable</h2>
            <p className="text-ink-muted mt-1">View your classes for the week.</p>
          </div>

          <select
            value={selectedDay}
            onChange={handleDayChange}
            className="px-4 py-2 bg-surface border border-border rounded-xl text-ink font-medium outline-none focus:ring-2 focus:ring-primary-500"
          >
            {scheduleData?.days?.map((day: string) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-surface rounded-card"></div>
            ))}
          </div>
        ) : scheduleData && scheduleData.schedule[selectedDay] ? (
          <div className="space-y-4">
            {scheduleData.schedule[selectedDay].map((cls: any, idx: number) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-5 rounded-card border transition-all group ${cls.is_break ? "bg-surface border-border border-dashed" : "border-border hover:border-primary-100 hover:bg-primary-50"}`}
              >
                <div className="flex items-center gap-6">
                  <div className="w-24 text-right">
                    <span className="text-sm font-bold text-ink-muted group-hover:text-primary-600 transition-colors">
                      {cls.start_time}
                    </span>
                    <div className="text-xs text-ink-faint mt-1">{cls.end_time}</div>
                  </div>

                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${cls.is_break ? "bg-surface text-ink-muted" : "bg-primary-50 text-primary-600"}`}
                  >
                    <Clock className="w-6 h-6" />
                  </div>

                  <div>
                    <h4 className="font-bold text-lg text-ink">
                      {cls.is_break ? cls.period_name : cls.subject_name}
                    </h4>
                    {!cls.is_break && <p className="text-sm text-ink-muted">{cls.teacher_name}</p>}
                  </div>
                </div>

                <div className="px-4 py-2 bg-surface text-ink-muted rounded-lg text-sm font-bold group-hover:bg-surface-card transition-colors">
                  {cls.is_break ? "Break" : "Classroom"}
                </div>
              </div>
            ))}

            {scheduleData.schedule[selectedDay].length === 0 && (
              <div className="text-center py-12 text-ink-muted">
                No classes scheduled for {selectedDay}.
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-ink-muted">Could not load timetable data.</div>
        )}
      </div>
    </div>
  );
}

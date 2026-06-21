import { getStudentProfile } from "./profile";
import { getMyAttendance, getMyFees, getTimetable, TimetableDay } from "./portal";

export interface NextPeriod {
  subject?: string;
  teacher?: string;
  start_time?: string;
}
export interface Overview {
  name: string;
  class_label?: string;
  photo_url?: string | null;
  attendance_pct: number;
  balance: number;
  next_period: NextPeriod | null;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseMins(t?: string): number | null {
  if (!t) return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

function pickNextPeriod(days: TimetableDay[]): NextPeriod | null {
  const now = new Date();
  const day = days.find((d) => d.day === DAYS[now.getDay()]);
  if (!day || day.periods.length === 0) return null;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const upcoming = day.periods
    .map((p) => ({ p, m: parseMins(p.start_time) }))
    .filter((x) => x.m != null && (x.m as number) >= nowMins)
    .sort((a, b) => (a.m as number) - (b.m as number));
  const chosen = upcoming[0]?.p || day.periods[0];
  return { subject: chosen.subject, teacher: chosen.teacher, start_time: chosen.start_time };
}

// Composes the profile + attendance + fees + timetable reads (each already mock-aware),
// so the dashboard previews per-persona and stays parent-scoped via the passed ids.
export async function getOverview(opts?: { studentId?: string; classId?: string; sectionId?: string }): Promise<Overview> {
  const ttOpts = opts && (opts.classId || opts.sectionId) ? { classId: opts.classId, sectionId: opts.sectionId } : undefined;
  const [profile, attendance, fees, timetable] = await Promise.all([
    getStudentProfile(opts?.studentId),
    getMyAttendance(opts?.studentId),
    getMyFees(opts?.studentId),
    getTimetable(ttOpts),
  ]);
  const cls = [profile.class_name, profile.section_name].filter(Boolean).join("-");
  return {
    name: profile.name,
    class_label: cls || undefined,
    photo_url: profile.photo_url ?? null,
    attendance_pct: attendance.summary.percentage,
    balance: fees.summary.balance,
    next_period: pickNextPeriod(timetable),
  };
}

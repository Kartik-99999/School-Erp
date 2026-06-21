import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_dev";

export interface Notice {
  id: string;
  title: string;
  content?: string;
  notice_type?: string;
  created_at?: string;
}
export async function getNotices(): Promise<Notice[]> {
  if (DEV_FAKE_ROLE) return mock.notices;
  const res = await api.get("/communication/notices");
  return (res.data?.data ?? []) as Notice[];
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  total: number;
  percentage: number;
}
export interface AttendanceData {
  records: { date: string; status: string }[];
  summary: AttendanceSummary;
}
const EMPTY_ATT: AttendanceData = {
  records: [],
  summary: { present: 0, absent: 0, late: 0, total: 0, percentage: 0 },
};
// studentId is supplied by a parent (their child); a student omits it (self).
export async function getMyAttendance(studentId?: string): Promise<AttendanceData> {
  if (DEV_FAKE_ROLE) return mock.attendance;
  const q = studentId ? `?student_id=${studentId}` : "";
  const res = await api.get(`/student-portal/attendance${q}`);
  return (res.data?.data ?? EMPTY_ATT) as AttendanceData;
}

export interface FeeDue {
  fee_head?: string;
  head?: string;
  due_date?: string | null;
  net_due_amount: number;
  amount_paid: number;
  balance: number;
}
export interface FeesData {
  dues: FeeDue[];
  summary: { total_due: number; total_paid: number; balance: number };
}
const EMPTY_FEES: FeesData = { dues: [], summary: { total_due: 0, total_paid: 0, balance: 0 } };
export async function getMyFees(studentId?: string): Promise<FeesData> {
  if (DEV_FAKE_ROLE) return mock.fees;
  const q = studentId ? `?student_id=${studentId}` : "";
  const res = await api.get(`/student-portal/fees${q}`);
  return (res.data?.data ?? EMPTY_FEES) as FeesData;
}

async function getStudentClass(): Promise<{ classId?: string; sectionId?: string }> {
  try {
    const r = await api.get("/students/me");
    const p = r.data?.data;
    return { classId: p?.current_class_id, sectionId: p?.current_section_id };
  } catch {
    return {};
  }
}

export interface Period {
  period?: number | string;
  start_time?: string;
  end_time?: string;
  subject?: string;
  teacher?: string;
}
export interface TimetableDay {
  day: string;
  periods: Period[];
}
const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
function groupTimetable(slots: any[]): TimetableDay[] {
  const byDay: Record<string, Period[]> = {};
  for (const s of slots) {
    const day = String(s.day_of_week ?? s.day ?? "").trim() || "Other";
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push({
      period: s.period ?? s.period_number,
      start_time: s.start_time,
      end_time: s.end_time,
      subject: s.subject ?? s.subject_name,
      teacher: s.teacher ?? s.teacher_name,
    });
  }
  const rank = (d: string) => {
    const i = DAY_ORDER.indexOf(d);
    return i < 0 ? 99 : i;
  };
  return Object.keys(byDay)
    .map((day) => ({
      day,
      periods: byDay[day].sort((a, b) => Number(a.period || 0) - Number(b.period || 0)),
    }))
    .sort((a, b) => rank(a.day) - rank(b.day));
}
// A parent passes the child's class/section; a student resolves their own via /students/me.
export async function getTimetable(opts?: { classId?: string; sectionId?: string }): Promise<TimetableDay[]> {
  if (DEV_FAKE_ROLE) return mock.timetable;
  let classId = opts?.classId;
  let sectionId = opts?.sectionId;
  if (!classId || !sectionId) {
    const r = await getStudentClass();
    classId = r.classId;
    sectionId = r.sectionId;
  }
  if (!classId || !sectionId) return [];
  const r = await api.get(`/academics/timetable?class_id=${classId}&section_id=${sectionId}`);
  return groupTimetable((r.data?.data ?? []) as any[]);
}

export interface Homework {
  title: string;
  subject?: string;
  due_date?: string;
  description?: string;
}
export async function getHomework(opts?: { classId?: string; sectionId?: string }): Promise<Homework[]> {
  if (DEV_FAKE_ROLE) return mock.homework;
  let classId = opts?.classId;
  let sectionId = opts?.sectionId;
  if (!classId || !sectionId) {
    const r = await getStudentClass();
    classId = r.classId;
    sectionId = r.sectionId;
  }
  if (!classId || !sectionId) return [];
  const r = await api.get(`/academics/homework?class_id=${classId}&section_id=${sectionId}`);
  return (r.data?.data ?? []) as Homework[];
}

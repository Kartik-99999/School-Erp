import { api } from "./client";
import { DEV_FAKE_ROLE } from "../config";
import * as mock from "./_devTeacher";

export interface TeacherClass {
  class_id: string;
  section_id: string;
  name: string;
}
export interface SectionStudent {
  id: string;
  name: string;
  roll?: string;
}
export interface AttendanceMark {
  student_id: string;
  status: string;
}

// The classes a teacher takes — resolved the way the web does: find my staff record,
// then dedupe my timetable slots into distinct class-sections.
export async function getMyClasses(userId?: string): Promise<TeacherClass[]> {
  if (DEV_FAKE_ROLE) return mock.classes;
  const staffRes = await api.get(`/staff?role=Teacher`);
  const me = ((staffRes.data?.data ?? []) as any[]).find((s) => s.user_id === userId);
  if (!me) return [];
  const ttRes = await api.get(`/academics/timetable/teacher/${me.id}`);
  const slots = (ttRes.data?.data ?? []) as any[];
  const seen: Record<string, TeacherClass> = {};
  for (const s of slots) {
    if (s.class_id && s.section_id) {
      const key = `${s.class_id}-${s.section_id}`;
      if (!seen[key]) seen[key] = { class_id: s.class_id, section_id: s.section_id, name: s.class_name || "Class" };
    }
  }
  return Object.values(seen);
}

export async function getSectionStudents(classId: string, sectionId: string): Promise<SectionStudent[]> {
  if (DEV_FAKE_ROLE) return mock.students;
  const res = await api.get(`/students?class_id=${classId}&section_id=${sectionId}`);
  return ((res.data?.data ?? []) as any[]).map((s) => ({
    id: s.id,
    name: s.name || [s.first_name, s.last_name].filter(Boolean).join(" ") || "Student",
    roll: s.roll_number || s.admission_number,
  }));
}

export async function submitAttendance(
  classId: string,
  sectionId: string,
  marks: AttendanceMark[]
): Promise<void> {
  if (DEV_FAKE_ROLE) return; // pretend success in preview
  await api.post("/attendance/students/bulk", {
    class_id: classId,
    section_id: sectionId,
    date: new Date().toISOString().split("T")[0],
    records: marks,
  });
}

export interface ScheduleEntry {
  period_name?: string;
  start_time?: string;
  end_time?: string;
  is_break?: boolean;
  subject_name?: string;
  class_name?: string;
  section_name?: string;
}
export interface ScheduleDay {
  day: string;
  entries: ScheduleEntry[];
}
// A teacher's own weekly timetable: /academics/timetable/teacher/{staffId} -> { day: entries }.
export async function getMySchedule(userId?: string): Promise<ScheduleDay[]> {
  if (DEV_FAKE_ROLE) return mock.schedule;
  const staffRes = await api.get(`/staff?role=Teacher`);
  const me = ((staffRes.data?.data ?? []) as any[]).find((s) => s.user_id === userId);
  if (!me) return [];
  const r = await api.get(`/academics/timetable/teacher/${me.id}`);
  const byDay = (r.data?.data ?? {}) as Record<string, ScheduleEntry[]>;
  return Object.keys(byDay)
    .map((day) => ({ day, entries: byDay[day] || [] }))
    .filter((d) => d.entries.length > 0);
}

// --- Homework (teacher: view + create for a class/section) ---
export interface TeacherHomework {
  id?: string;
  title: string;
  subject_id?: string;
  due_date?: string;
  description?: string;
  status?: string;
}
export interface HomeworkMeta {
  teacherId: string;
  academicYearId: string;
  subjects: { id: string; name: string }[];
}
export interface CreateHomeworkInput {
  class_id: string;
  section_id: string;
  subject_id: string;
  title: string;
  description?: string;
  due_date: string;
}

export async function getClassHomework(classId: string, sectionId: string): Promise<TeacherHomework[]> {
  if (DEV_FAKE_ROLE) return mock.classHomework;
  const res = await api.get(`/academics/homework?class_id=${classId}&section_id=${sectionId}`);
  return (res.data?.data ?? []) as TeacherHomework[];
}

// Supporting data the create form needs: the teacher's staff id, the active academic year,
// and the subjects mapped to this class.
export async function getHomeworkMeta(classId: string, userId?: string): Promise<HomeworkMeta> {
  if (DEV_FAKE_ROLE) return { teacherId: "t1", academicYearId: "ay1", subjects: mock.subjects };
  const [staffRes, yrRes, subjRes] = await Promise.all([
    api.get(`/staff?role=Teacher`),
    api.get(`/academic-years`),
    api.get(`/classes/${classId}/subjects`),
  ]);
  const me = ((staffRes.data?.data ?? []) as any[]).find((s) => s.user_id === userId);
  const years = (yrRes.data?.data ?? []) as any[];
  const activeYear = years.find((y) => y.is_active) || years[0];
  const subjects = ((subjRes.data?.data ?? []) as any[]).map((s) => ({ id: String(s.id), name: s.name }));
  return {
    teacherId: me ? String(me.id) : "",
    academicYearId: activeYear ? String(activeYear.id) : "",
    subjects,
  };
}

export async function createHomework(input: CreateHomeworkInput, meta: HomeworkMeta): Promise<void> {
  if (DEV_FAKE_ROLE) return; // pretend success in preview
  await api.post("/academics/homework", {
    class_id: input.class_id,
    section_id: input.section_id,
    subject_id: input.subject_id,
    title: input.title,
    description: input.description,
    due_date: input.due_date,
    academic_year_id: meta.academicYearId,
    teacher_id: meta.teacherId,
  });
}

// --- Marks entry (teacher: pick exam + subject -> enter marks -> submit) ---
export interface ExamLite {
  id: string;
  name: string;
  class_id: string;
  status?: string;
}
export interface ExamScheduleLite {
  id: string;
  subject_id: string;
  subject_name?: string;
  max_marks: number;
  passing_marks: number;
}
export interface MarkInput {
  student_id: string;
  name: string;
  roll?: string;
  marks_obtained: string;
  is_absent: boolean;
}
export interface MarkSubmit {
  student_id: string;
  marks_obtained: number | null;
  is_absent: boolean;
}

// Exams for the classes this teacher takes.
export async function getTeacherExams(classIds: string[]): Promise<ExamLite[]> {
  if (DEV_FAKE_ROLE) return mock.exams;
  const res = await api.get("/exams");
  const all = ((res.data?.data ?? []) as any[]).map((e) => ({
    id: String(e.id),
    name: e.name,
    class_id: String(e.class_id),
    status: e.status,
  }));
  return classIds.length ? all.filter((e) => classIds.includes(e.class_id)) : all;
}

export async function getExamSchedules(examId: string): Promise<ExamScheduleLite[]> {
  if (DEV_FAKE_ROLE) return mock.examSchedules;
  const [schRes, subjRes] = await Promise.all([
    api.get(`/exams/${examId}/schedules`),
    api.get(`/subjects`).catch(() => ({ data: { data: [] } })),
  ]);
  const names: Record<string, string> = {};
  for (const s of (subjRes.data?.data ?? []) as any[]) names[String(s.id)] = s.name;
  return ((schRes.data?.data ?? []) as any[]).map((s) => ({
    id: String(s.id),
    subject_id: String(s.subject_id),
    subject_name: names[String(s.subject_id)],
    max_marks: Number(s.max_marks ?? 0),
    passing_marks: Number(s.passing_marks ?? 0),
  }));
}

// The class roster pre-filled with any marks already entered for this schedule.
export async function getMarksRoster(classId: string, scheduleId: string): Promise<MarkInput[]> {
  if (DEV_FAKE_ROLE) return mock.marksRoster;
  const [studRes, markRes] = await Promise.all([
    api.get(`/students?class_id=${classId}`),
    api.get(`/exams/schedules/${scheduleId}/marks`),
  ]);
  const existing: Record<string, any> = {};
  for (const m of (markRes.data?.data ?? []) as any[]) existing[String(m.student_id)] = m;
  return ((studRes.data?.data ?? []) as any[]).map((s) => {
    const id = String(s.id);
    const ex = existing[id];
    return {
      student_id: id,
      name: s.name || [s.first_name, s.last_name].filter(Boolean).join(" ") || "Student",
      roll: s.roll_number ? String(s.roll_number) : s.admission_number,
      marks_obtained: ex && ex.marks_obtained != null ? String(ex.marks_obtained) : "",
      is_absent: ex ? !!ex.is_absent : false,
    };
  });
}

export async function submitMarks(scheduleId: string, marks: MarkSubmit[]): Promise<void> {
  if (DEV_FAKE_ROLE) return; // pretend success in preview
  await api.post("/exams/marks/bulk", { exam_schedule_id: scheduleId, marks });
}


// --- Staff leave (a teacher applies for their OWN leave) ---
export interface StaffLeaveType {
  id: string;
  name: string;
}
export interface StaffLeave {
  id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status: string; // "Pending" | "Approved" | "Rejected"
}
export interface StaffLeaveApply {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string;
}

export async function getStaffLeaveTypes(): Promise<StaffLeaveType[]> {
  if (DEV_FAKE_ROLE) return mock.leaveTypes;
  const res = await api.get("/leaves/types");
  return ((res.data?.data ?? []) as any[]).map((t) => ({ id: String(t.id), name: t.name }));
}

// The caller's own staff leave applications (backend resolves the staff row from the token).
export async function getMyStaffLeaves(): Promise<StaffLeave[]> {
  if (DEV_FAKE_ROLE) return mock.staffLeaves;
  const res = await api.get("/leaves/applications/me");
  return ((res.data?.data ?? []) as any[]).map((l) => ({
    id: String(l.id),
    leave_type_id: String(l.leave_type_id),
    start_date: l.start_date,
    end_date: l.end_date,
    reason: l.reason,
    status: l.status,
  }));
}

export async function applyStaffLeave(payload: StaffLeaveApply): Promise<void> {
  if (DEV_FAKE_ROLE) return; // pretend success in preview
  await api.post("/leaves/applications", payload);
}

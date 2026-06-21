// DEV-ONLY sample data for the teacher flow (only used when EXPO_PUBLIC_DEV_FAKE_ROLE is set).
import type { ExamLite, ExamScheduleLite, MarkInput, ScheduleDay, SectionStudent, TeacherClass, TeacherHomework } from "./teacher";

export const classes: TeacherClass[] = [
  { class_id: "c8", section_id: "a", name: "Class VIII-A" },
  { class_id: "c8", section_id: "b", name: "Class VIII-B" },
  { class_id: "c9", section_id: "a", name: "Class IX-A" },
];

export const students: SectionStudent[] = [
  { id: "1", name: "Aarav Sharma", roll: "01" },
  { id: "2", name: "Diya Patel", roll: "02" },
  { id: "3", name: "Ishaan Gupta", roll: "03" },
  { id: "4", name: "Kavya Reddy", roll: "04" },
  { id: "5", name: "Rohan Mehta", roll: "05" },
  { id: "6", name: "Saanvi Iyer", roll: "06" },
  { id: "7", name: "Vivaan Khan", roll: "07" },
  { id: "8", name: "Ananya Nair", roll: "08" },
];

export const schedule: ScheduleDay[] = [
  { day: "Monday", entries: [
    { period_name: "I", start_time: "08:00 AM", end_time: "08:45 AM", subject_name: "Mathematics", class_name: "VIII", section_name: "A" },
    { period_name: "II", start_time: "08:45 AM", end_time: "09:30 AM", subject_name: "Mathematics", class_name: "VIII", section_name: "B" },
    { period_name: "III", start_time: "09:30 AM", end_time: "09:45 AM", is_break: true },
    { period_name: "IV", start_time: "09:45 AM", end_time: "10:30 AM", subject_name: "Mathematics", class_name: "IX", section_name: "A" },
  ] },
  { day: "Tuesday", entries: [
    { period_name: "I", start_time: "08:00 AM", end_time: "08:45 AM", subject_name: "Mathematics", class_name: "IX", section_name: "A" },
    { period_name: "II", start_time: "08:45 AM", end_time: "09:30 AM", subject_name: "Mathematics", class_name: "VIII", section_name: "A" },
  ] },
]

export const subjects: { id: string; name: string }[] = [
  { id: "sub-math", name: "Mathematics" },
  { id: "sub-eng", name: "English" },
  { id: "sub-sci", name: "Science" },
];

export const classHomework: TeacherHomework[] = [
  { id: "h1", title: "Algebra — Exercise 4.3", subject_id: "sub-math", due_date: "2026-06-25", description: "Solve Q1–Q12 in the classwork notebook; show each step.", status: "Active" },
  { id: "h2", title: "Read 'The Sermon at Benares'", subject_id: "sub-eng", due_date: "2026-06-24", description: "Prepare a short summary and list three key lessons.", status: "Active" },
];

export const exams: ExamLite[] = [
  { id: "ex1", name: "Half-Yearly Examination", class_id: "c8", status: "Marks Entry" },
  { id: "ex2", name: "Unit Test II", class_id: "c8", status: "Scheduled" },
];

export const examSchedules: ExamScheduleLite[] = [
  { id: "es1", subject_id: "sub-math", subject_name: "Mathematics", max_marks: 100, passing_marks: 33 },
  { id: "es2", subject_id: "sub-sci", subject_name: "Science", max_marks: 100, passing_marks: 33 },
];

export const marksRoster: MarkInput[] = [
  { student_id: "1", name: "Aarav Sharma", roll: "01", marks_obtained: "78", is_absent: false },
  { student_id: "2", name: "Diya Patel", roll: "02", marks_obtained: "", is_absent: false },
  { student_id: "3", name: "Ishaan Gupta", roll: "03", marks_obtained: "", is_absent: true },
  { student_id: "4", name: "Kavya Reddy", roll: "04", marks_obtained: "65", is_absent: false },
];

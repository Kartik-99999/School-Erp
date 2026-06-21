// DEV-ONLY sample data so signed-in screens can be previewed without a backend.
// Only returned when EXPO_PUBLIC_DEV_FAKE_ROLE is set (see config DEV_FAKE_ROLE).
import type { AttendanceData, FeesData, Homework, Notice, TimetableDay } from "./portal";
import type { Child } from "./children";
import type { ExamResult } from "./exams";
import type { LibraryData } from "./library";
import type { LeaveApplication } from "./leaves";
import type { Resource } from "./resources";

export const notices: Notice[] = [
  { id: "1", title: "Annual Sports Day — 12 December", notice_type: "event", created_at: "2026-06-16", content: "Track and field events begin at 8:00 AM on the main ground. Parents are warmly invited to attend and cheer." },
  { id: "2", title: "Parent–Teacher Meeting this Saturday", notice_type: "academic", created_at: "2026-06-14", content: "Classes VIII–X, 9:00 AM to 12:30 PM. Please carry your ward's school diary." },
  { id: "3", title: "Term 2 fees due by 10 July", notice_type: "fees", created_at: "2026-06-10", content: "Kindly clear the second-term fees before the due date to avoid a late charge." },
  { id: "4", title: "School closed on Monday", notice_type: "holiday", created_at: "2026-06-06", content: "The school will remain closed on account of a public holiday. Classes resume Tuesday." },
];

export const attendance: AttendanceData = {
  summary: { present: 82, absent: 5, late: 3, total: 90, percentage: 91.7 },
  records: [
    { date: "2026-06-19", status: "Present" },
    { date: "2026-06-18", status: "Present" },
    { date: "2026-06-17", status: "Late" },
    { date: "2026-06-16", status: "Present" },
    { date: "2026-06-13", status: "Absent" },
    { date: "2026-06-12", status: "Present" },
    { date: "2026-06-11", status: "Present" },
    { date: "2026-06-10", status: "Present" },
  ],
};

export const fees: FeesData = {
  student_id: "s1",
  summary: { total_due: 48000, total_paid: 36000, balance: 12000 },
  dues: [
    { id: "fs1", fee_head: "Term 2 — Tuition", due_date: "2026-07-10", net_due_amount: 12000, amount_paid: 0, balance: 12000 },
    { id: "fs2", fee_head: "Transport (Jul–Sep)", due_date: "2026-07-10", net_due_amount: 4500, amount_paid: 4500, balance: 0 },
  ],
};

export const timetable: TimetableDay[] = [
  { day: "Monday", periods: [
    { period: 1, start_time: "08:00 AM", end_time: "08:45 AM", subject: "Mathematics", teacher: "Mr. Rao" },
    { period: 2, start_time: "08:45 AM", end_time: "09:30 AM", subject: "English", teacher: "Ms. Iyer" },
    { period: 3, start_time: "09:45 AM", end_time: "10:30 AM", subject: "Science", teacher: "Mrs. Nair" },
    { period: 4, start_time: "10:30 AM", end_time: "11:15 AM", subject: "Hindi", teacher: "Mr. Verma" },
  ]},
  { day: "Tuesday", periods: [
    { period: 1, start_time: "08:00 AM", end_time: "08:45 AM", subject: "Social Science", teacher: "Ms. Banerjee" },
    { period: 2, start_time: "08:45 AM", end_time: "09:30 AM", subject: "Mathematics", teacher: "Mr. Rao" },
    { period: 3, start_time: "09:45 AM", end_time: "10:30 AM", subject: "Computer", teacher: "Mr. Khan" },
    { period: 4, start_time: "10:30 AM", end_time: "11:15 AM", subject: "Physical Education", teacher: "Coach Singh" },
  ]},
];

export const homework: Homework[] = [
  { title: "Algebra — Exercise 4.3 (Q1–Q12)", subject: "Mathematics", due_date: "2026-06-22", description: "Solve all problems in your classwork notebook. Show each step clearly." },
  { title: "Write a short book review", subject: "English", due_date: "2026-06-23", description: "300 words on the novel read in class. Focus on theme and your favourite character." },
  { title: "Leaf venation diagram", subject: "Science", due_date: "2026-06-25", description: "Draw and label reticulate vs parallel venation with two examples each." },
];

export const children: Child[] = [
  { id: "s1", name: "Aarav Sharma", classLabel: "VIII-A", classId: "c8", sectionId: "a" },
  { id: "s2", name: "Diya Sharma", classLabel: "V-B", classId: "c5", sectionId: "b" },
]

export const examResults: ExamResult[] = [
  { exam_id: "e1", exam_name: "Half-Yearly Examination", obtained_marks: 412, total_marks: 500, percentage: 82.4, grade: "A", rank: 4, status: "Pass" },
  { exam_id: "e2", exam_name: "Unit Test II", obtained_marks: 88, total_marks: 100, percentage: 88, grade: "A", rank: 2, status: "Pass" },
  { exam_id: "e3", exam_name: "Unit Test I", obtained_marks: 71, total_marks: 100, percentage: 71, grade: "B", rank: 9, status: "Pass" },
];

export const library: LibraryData = {
  summary: { active: 2, total: 3, total_fine: 30 },
  issues: [
    { id: "l1", book_title: "Wings of Fire", author: "A.P.J. Abdul Kalam", issue_date: "2026-06-05", due_date: "2026-06-19", return_date: null, status: "Overdue", fine_amount: 30 },
    { id: "l2", book_title: "Malgudi Days", author: "R.K. Narayan", issue_date: "2026-06-12", due_date: "2026-06-26", return_date: null, status: "Issued", fine_amount: 0 },
    { id: "l3", book_title: "Indian Constitution at Work", author: "NCERT", issue_date: "2026-05-20", due_date: "2026-06-03", return_date: "2026-06-02", status: "Returned", fine_amount: 0 },
  ],
};

export const leaves: LeaveApplication[] = [
  { id: "lv1", leave_type: "Sick", from_date: "2026-06-15", to_date: "2026-06-16", reason: "Down with fever; rest advised by the doctor.", status: "Approved", applied_at: "2026-06-14" },
  { id: "lv2", leave_type: "Casual", from_date: "2026-07-02", to_date: "2026-07-02", reason: "Attending a family function out of town.", status: "Pending", applied_at: "2026-06-20" },
];

export const resources: Resource[] = [
  { id: "r1", title: "Science Notes — Crop Production (Ch. 5)", description: "Summary notes and key diagrams for the chapter.", category: "Study Material", file_url: "https://example.com/science-ch5.pdf", file_name: "science-ch5.pdf", file_type: "pdf", external_url: null, created_at: "2026-06-18" },
  { id: "r2", title: "Holiday Homework — Mathematics", description: "Practice set for the summer break.", category: "Study Material", file_url: "https://example.com/maths-holiday.pdf", file_name: "maths-holiday.pdf", file_type: "pdf", external_url: null, created_at: "2026-06-15" },
  { id: "r3", title: "Circular — Revised School Timings", description: "New timings effective 1 July. Please read carefully.", category: "Notice Circular", file_url: null, file_name: null, file_type: null, external_url: "https://example.com/circular-timings", created_at: "2026-06-12" },
];

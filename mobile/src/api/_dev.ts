// DEV-ONLY sample data so signed-in screens can be previewed without a backend.
// Only returned when EXPO_PUBLIC_DEV_FAKE_ROLE is set (see config DEV_FAKE_ROLE).
import type { AttendanceData, FeesData, Homework, Notice, TimetableDay } from "./portal";
import type { Child } from "./children";
import type { ExamResult } from "./exams";
import type { LibraryData } from "./library";
import type { LeaveApplication } from "./leaves";
import type { Resource } from "./resources";
import type { SchoolEvent } from "./events";
import type { StudentProfile } from "./profile";
import type { ParentMessage } from "./messages";
import type { AcademicYear } from "./academicYears";
import type { Poll } from "./polls";
import type { Gallery, GalleryDetail } from "./galleries";
import type { Syllabus } from "./syllabus";
import type { Appointment, Slot } from "./appointments";
import type { AppNotification } from "./notifications";

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
    { id: "fs1", fee_head: "Term 1 — Tuition", due_date: "2026-04-01", net_due_amount: 24000, amount_paid: 24000, balance: 0 },
    { id: "fs2", fee_head: "Transport (Apr–Jun)", due_date: "2026-04-15", net_due_amount: 4500, amount_paid: 4500, balance: 0 },
    { id: "fs3", fee_head: "Examination fee", due_date: "2026-06-20", net_due_amount: 3000, amount_paid: 3000, balance: 0 },
    { id: "fs4", fee_head: "Transport (Jul–Sep)", due_date: "2026-07-01", net_due_amount: 4500, amount_paid: 4500, balance: 0 },
    { id: "fs5", fee_head: "Term 2 — Tuition", due_date: "2026-07-10", net_due_amount: 12000, amount_paid: 0, balance: 12000 },
  ],
  receipts: [
    { id: "rc1", receipt_number: "RC-2026-0042", payment_date: "2026-04-10", payment_mode: "Razorpay", total_amount: 24000 },
    { id: "rc2", receipt_number: "RC-2026-0051", payment_date: "2026-04-20", payment_mode: "Cash", total_amount: 4500 },
    { id: "rc3", receipt_number: "RC-2026-0066", payment_date: "2026-06-25", payment_mode: "Razorpay", total_amount: 3000 },
    { id: "rc4", receipt_number: "RC-2026-0079", payment_date: "2026-07-05", payment_mode: "Cash", total_amount: 4500 },
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

export const events: SchoolEvent[] = [
  { id: "ev1", title: "Annual Sports Day", description: "Track and field events on the main ground. Parents are welcome.", start_date: "2026-07-05", end_date: "2026-07-05", event_type: "Sports" },
  { id: "ev2", title: "Half-Yearly Examinations", description: "Classes VI–X. See the exam timetable for the schedule.", start_date: "2026-07-15", end_date: "2026-07-24", event_type: "Exam" },
  { id: "ev3", title: "Independence Day", description: "Flag hoisting at 8:00 AM followed by a cultural programme.", start_date: "2026-08-15", end_date: "2026-08-15", event_type: "Holiday" },
];

export const profile: StudentProfile = {
  name: "Aarav Sharma",
  admission_number: "ADM-2024-0142",
  roll_number: 12,
  class_name: "VIII",
  section_name: "A",
  blood_group: "O+",
  photo_url: null,
};

export const messages: ParentMessage[] = [
  { id: "m1", sender: "Parent", body: "Good morning. Will there be class this Saturday?", is_read: true, created_at: "2026-06-19T09:10:00Z" },
  { id: "m2", sender: "School", body: "Good morning! Yes, Saturday is a working day this week (8:00 AM–12:00 PM).", is_read: true, created_at: "2026-06-19T09:40:00Z" },
  { id: "m3", sender: "Parent", body: "Thank you for confirming.", is_read: true, created_at: "2026-06-19T09:42:00Z" },
];

export const academicYears: AcademicYear[] = [
  { id: "ay-2026", name: "2026–27", start_date: "2026-04-01", end_date: "2027-03-31", is_active: true },
  { id: "ay-2025", name: "2025–26", start_date: "2025-04-01", end_date: "2026-03-31", is_active: false },
];

export const polls: Poll[] = [
  {
    id: "p1", question: "Which day works best for the next PTM?", target_audience: "Parents", is_active: true, total_votes: 18, my_option_id: null,
    options: [
      { id: "p1o1", text: "Friday afternoon", votes: 7 },
      { id: "p1o2", text: "Saturday morning", votes: 11 },
    ],
  },
  {
    id: "p2", question: "Pick the Annual Day theme", target_audience: "All", is_active: true, total_votes: 0, my_option_id: null,
    options: [
      { id: "p2o1", text: "Heritage of India", votes: 0 },
      { id: "p2o2", text: "Space & Science", votes: 0 },
      { id: "p2o3", text: "Save the Environment", votes: 0 },
    ],
  },
];

export const galleries: Gallery[] = [
  { id: "g1", title: "Annual Sports Day", description: "Track & field highlights.", cover_url: "https://picsum.photos/seed/sports/600/400", event_date: "2026-06-01", photo_count: 4 },
  { id: "g2", title: "Science Exhibition", description: "Class project showcase.", cover_url: "https://picsum.photos/seed/science/600/400", event_date: "2026-05-20", photo_count: 3 },
];

export const galleryDetails: Record<string, GalleryDetail> = {
  g1: {
    id: "g1", title: "Annual Sports Day", description: "Track & field highlights.", event_date: "2026-06-01",
    photos: [
      { id: "g1p1", image_url: "https://picsum.photos/seed/sp1/800/600", caption: "100m final" },
      { id: "g1p2", image_url: "https://picsum.photos/seed/sp2/800/600", caption: "Relay" },
      { id: "g1p3", image_url: "https://picsum.photos/seed/sp3/800/600", caption: "Long jump" },
      { id: "g1p4", image_url: "https://picsum.photos/seed/sp4/800/600", caption: "Medal ceremony" },
    ],
  },
  g2: {
    id: "g2", title: "Science Exhibition", description: "Class project showcase.", event_date: "2026-05-20",
    photos: [
      { id: "g2p1", image_url: "https://picsum.photos/seed/sc1/800/600" },
      { id: "g2p2", image_url: "https://picsum.photos/seed/sc2/800/600" },
      { id: "g2p3", image_url: "https://picsum.photos/seed/sc3/800/600" },
    ],
  },
};

export const syllabus: Syllabus = {
  overall: { total: 6, completed: 3, percent: 50 },
  subjects: [
    {
      subject_id: "m", subject_name: "Mathematics", total: 3, completed: 2, percent: 67,
      chapters: [
        { id: "m1", chapter_name: "Algebra Basics", description: "Variables and expressions", completed: true },
        { id: "m2", chapter_name: "Linear Equations", description: "Solving for one variable", completed: true },
        { id: "m3", chapter_name: "Quadratic Equations", description: null, completed: false },
      ],
    },
    {
      subject_id: "s", subject_name: "Science", total: 3, completed: 1, percent: 33,
      chapters: [
        { id: "s1", chapter_name: "Cell — Structure & Function", description: null, completed: true },
        { id: "s2", chapter_name: "Photosynthesis", description: null, completed: false },
        { id: "s3", chapter_name: "Force & Motion", description: null, completed: false },
      ],
    },
  ],
};

export const appointmentSlots: Slot[] = [
  { id: "sl1", teacher_id: "t1", teacher_name: "Asha Rao · Mathematics", start_time: "2026-06-24T04:30:00Z", end_time: "2026-06-24T05:00:00Z" },
  { id: "sl2", teacher_id: "t2", teacher_name: "Vikram Nair · Science", start_time: "2026-06-25T05:30:00Z", end_time: "2026-06-25T06:00:00Z" },
];

export const myAppointments: Appointment[] = [
  { id: "ap1", teacher_name: "Priya Menon · Class Teacher", start_time: "2026-06-20T05:00:00Z", end_time: "2026-06-20T05:30:00Z", status: "Booked", note: "Mid-term review" },
];

export const notifications: AppNotification[] = [
  { id: "n1", title: "PTM this Saturday", body: "Parent-teacher meeting, 9 AM–12:30 PM.", type: "notice", ref_id: "1", is_read: false, created_at: "2026-06-21T03:30:00Z" },
  { id: "n2", title: "Term 2 fees due", body: "₹12,000 due by 10 July.", type: "fee", ref_id: null, is_read: false, created_at: "2026-06-20T06:00:00Z" },
  { id: "n3", title: "Attendance update", body: "Marked present today.", type: "absence", ref_id: null, is_read: true, created_at: "2026-06-19T04:00:00Z" },
];

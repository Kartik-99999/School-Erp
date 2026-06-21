// DEV-ONLY sample data for the teacher flow (only used when EXPO_PUBLIC_DEV_FAKE_ROLE is set).
import type { ScheduleDay, SectionStudent, TeacherClass } from "./teacher";

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

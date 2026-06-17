"use client";
import React from "react";
import DashboardShell, { NavGroup } from "@/components/layout/DashboardShell";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  GraduationCap,
  BookOpen,
  UserCheck,
  DollarSign,
  BookOpenCheck,
  Bus,
  Megaphone,
  Trophy,
} from "lucide-react";

const nav: NavGroup[] = [
  {
    label: "Academics",
    items: [
      { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
      { name: "Timetable", href: "/student/timetable", icon: Calendar },
      { name: "Attendance", href: "/student/attendance", icon: CheckSquare },
      { name: "Exams", href: "/student/exams", icon: GraduationCap },
      { name: "Homework", href: "/student/homework", icon: BookOpen },
      { name: "My Activities", href: "/student/activities", icon: Trophy },
    ],
  },
  {
    label: "Services",
    items: [
      { name: "Apply Leave", href: "/student/leaves", icon: UserCheck },
      { name: "Fees & Dues", href: "/student/fees", icon: DollarSign },
      { name: "My Library", href: "/student/library", icon: BookOpenCheck },
      { name: "Facilities", href: "/student/facilities", icon: Bus },
    ],
  },
  { label: "Updates", items: [{ name: "Noticeboard", href: "/student/notices", icon: Megaphone }] },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell brand="Educore" roleLabel="Student" nav={nav}>
      {children}
    </DashboardShell>
  );
}

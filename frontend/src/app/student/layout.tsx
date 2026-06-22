"use client";
import React from "react";
import DashboardShell, { NavGroup } from "@/components/layout/DashboardShell";
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  GraduationCap,
  ListChecks,
  BookOpen,
  UserCheck,
  DollarSign,
  BookOpenCheck,
  Bus,
  Megaphone,
  Trophy,
  FolderOpen,
  User,
  BarChart3,
  Images,
  Bell,
} from "lucide-react";

const nav: NavGroup[] = [
  {
    label: "Academics",
    items: [
      { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
      { name: "Timetable", href: "/student/timetable", icon: Calendar },
      { name: "Attendance", href: "/student/attendance", icon: CheckSquare },
      { name: "Exams", href: "/student/exams", icon: GraduationCap },
      { name: "Syllabus", href: "/student/syllabus", icon: ListChecks },
      { name: "Homework", href: "/student/homework", icon: BookOpen },
      { name: "My Activities", href: "/student/activities", icon: Trophy },
      { name: "Profile", href: "/student/profile", icon: User },
      { name: "Resources", href: "/student/resources", icon: FolderOpen },
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
  {
    label: "Updates",
    items: [
      { name: "Noticeboard", href: "/student/notices", icon: Megaphone },
      { name: "Polls", href: "/student/polls", icon: BarChart3 },
      { name: "Galleries", href: "/student/galleries", icon: Images },
      { name: "Notifications", href: "/student/notifications", icon: Bell },
    ],
  },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell brand="Educore" roleLabel="Student" nav={nav}>
      {children}
    </DashboardShell>
  );
}

"use client";
import React from "react";
import DashboardShell, { NavGroup } from "@/components/layout/DashboardShell";
import {
  LayoutDashboard,
  Calendar,
  Users,
  BookOpen,
  ClipboardList,
  Megaphone,
  FolderOpen,
} from "lucide-react";

const nav: NavGroup[] = [
  {
    label: "Main Menu",
    items: [
      { name: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
      { name: "My Schedule", href: "/teacher/schedule", icon: Calendar },
      { name: "My Classes", href: "/teacher/classes", icon: Users },
      { name: "Assignments", href: "/teacher/assignments", icon: BookOpen },
      { name: "Attendance", href: "/teacher/attendance", icon: ClipboardList },
      { name: "Feed & Resources", href: "/teacher/feed", icon: Megaphone },
      { name: "Resources", href: "/teacher/resources", icon: FolderOpen },
    ],
  },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell brand="Educore" roleLabel="Teacher" nav={nav}>
      {children}
    </DashboardShell>
  );
}

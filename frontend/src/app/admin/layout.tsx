"use client";
import React from "react";
import DashboardShell, { NavGroup } from "@/components/layout/DashboardShell";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Briefcase,
  ClipboardCheck,
  UserCheck,
  Library,
  FileSpreadsheet,
  Megaphone,
  Bus,
  BookOpenCheck,
  Home,
  PieChart,
  DollarSign,
  Calendar,
  Layers,
  Settings,
  MessageSquare,
  ShieldCheck,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react";

const nav: NavGroup[] = [
  {
    label: "Overview",
    items: [{ name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "People",
    items: [
      { name: "Admissions", href: "/admin/admissions", icon: Users },
      { name: "Students", href: "/admin/students", icon: GraduationCap },
      { name: "Staff", href: "/admin/staff", icon: Briefcase },
    ],
  },
  {
    label: "Academics",
    items: [
      { name: "Attendance", href: "/admin/attendance", icon: ClipboardCheck },
      { name: "Leaves", href: "/admin/leaves", icon: UserCheck },
      { name: "Academics", href: "/admin/academics", icon: Library },
      { name: "Exams & Results", href: "/admin/exams", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Co-curricular",
    items: [
      { name: "Houses", href: "/admin/activities/houses", icon: Shield },
      { name: "Clubs", href: "/admin/activities/clubs", icon: Sparkles },
      { name: "Sports", href: "/admin/activities/sports", icon: Trophy },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Communication", href: "/admin/communication", icon: Megaphone },
      { name: "Messages", href: "/admin/messages", icon: MessageSquare },
      { name: "Transport", href: "/admin/transport", icon: Bus },
      { name: "Library", href: "/admin/library", icon: BookOpenCheck },
      { name: "Hostel", href: "/admin/hostel", icon: Home },
    ],
  },
  {
    label: "Insights",
    items: [
      { name: "Reports Hub", href: "/admin/reports", icon: PieChart },
      { name: "Audit Log", href: "/admin/audit", icon: ShieldCheck },
    ],
  },
  {
    label: "Setup",
    items: [
      { name: "Fee Setup", href: "/admin/setup/fees", icon: DollarSign },
      { name: "Academic Years", href: "/admin/setup/academic-years", icon: Calendar },
      { name: "Classes & Sections", href: "/admin/setup/classes", icon: Layers },
      { name: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell brand="Educore" roleLabel="Admin" nav={nav} settingsHref="/admin/settings">
      {children}
    </DashboardShell>
  );
}

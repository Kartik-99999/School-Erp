"use client";
import React from "react";
import DashboardShell, { NavGroup } from "@/components/layout/DashboardShell";
import {
  LayoutDashboard,
  CreditCard,
  MapPin,
  Megaphone,
  MessageSquare,
  Trophy,
  FolderOpen,
  CheckSquare,
  ListChecks,
  GraduationCap,
  User,
  BarChart3,
  Images,
} from "lucide-react";

const nav: NavGroup[] = [
  {
    label: "Academics",
    items: [
      { name: "Attendance", href: "/parent/attendance", icon: CheckSquare },
      { name: "Syllabus", href: "/parent/syllabus", icon: ListChecks },
      { name: "Report Cards", href: "/parent/exams", icon: GraduationCap },
      { name: "Profile", href: "/parent/profile", icon: User },
    ],
  },
  {
    label: "Community",
    items: [
      { name: "Polls", href: "/parent/polls", icon: BarChart3 },
      { name: "Galleries", href: "/parent/galleries", icon: Images },
    ],
  },
  {
    label: "Main Menu",
    items: [
      { name: "Dashboard", href: "/parent/dashboard", icon: LayoutDashboard },
      { name: "Fee Payments", href: "/parent/fees", icon: CreditCard },
      { name: "Activities", href: "/parent/activities", icon: Trophy },
      { name: "Live Bus Tracking", href: "/parent/tracking", icon: MapPin },
      { name: "Noticeboard", href: "/parent/notices", icon: Megaphone },
      { name: "Messages", href: "/parent/messages", icon: MessageSquare },
      { name: "Resources", href: "/parent/resources", icon: FolderOpen },
    ],
  },
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell brand="Educore" roleLabel="Parent" nav={nav}>
      {children}
    </DashboardShell>
  );
}

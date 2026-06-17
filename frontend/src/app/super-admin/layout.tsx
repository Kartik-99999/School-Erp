"use client";
import React from "react";
import DashboardShell, { NavGroup } from "@/components/layout/DashboardShell";
import { LayoutDashboard, Building2, CreditCard } from "lucide-react";

const nav: NavGroup[] = [
  {
    label: "Platform",
    items: [
      { name: "Global Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
      { name: "Schools", href: "/super-admin/schools", icon: Building2 },
      { name: "Billing & Subscriptions", href: "/super-admin/billing", icon: CreditCard },
    ],
  },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell brand="Educore" roleLabel="Platform" nav={nav}>
      {children}
    </DashboardShell>
  );
}

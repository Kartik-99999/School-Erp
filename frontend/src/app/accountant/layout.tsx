"use client";
import React from "react";
import DashboardShell, { NavGroup } from "@/components/layout/DashboardShell";
import {
  LayoutDashboard,
  CreditCard,
  DollarSign,
  FileText,
  Receipt,
  Briefcase,
} from "lucide-react";

const nav: NavGroup[] = [
  {
    label: "Main Menu",
    items: [
      { name: "Dashboard", href: "/accountant/dashboard", icon: LayoutDashboard },
      { name: "Fee Collection", href: "/accountant/fees/payments", icon: CreditCard },
      { name: "Pending Dues", href: "/accountant/fees/dues", icon: DollarSign },
      { name: "Financial Reports", href: "/accountant/fees/reports", icon: FileText },
      { name: "Receipts", href: "/accountant/receipts", icon: Receipt },
      { name: "Payroll", href: "/accountant/payroll", icon: Briefcase },
    ],
  },
];

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell brand="Educore" roleLabel="Accountant" nav={nav}>
      {children}
    </DashboardShell>
  );
}

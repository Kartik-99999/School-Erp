"use client";
import React from "react";
import { DollarSign, TrendingUp, Users, AlertCircle, FileText, Download } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AccountantDashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Financial Overview"
          description="Track fee collections, pending dues, and revenue metrics."
        />
        <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-card p-6 rounded-card border border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign className="w-24 h-24 text-emerald-600" />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6" />
            </div>
            <p className="text-ink-muted font-medium mb-1">Total Collections (MTD)</p>
            <h3 className="text-3xl font-bold text-ink">₹ 14.5L</h3>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 font-bold bg-emerald-50 w-fit px-2 py-1 rounded-md relative z-10">
            <TrendingUp className="w-4 h-4" /> +12% from last month
          </div>
        </div>

        <div className="bg-surface-card p-6 rounded-card border border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle className="w-24 h-24 text-rose-600" />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-ink-muted font-medium mb-1">Pending Dues</p>
            <h3 className="text-3xl font-bold text-ink">₹ 3.2L</h3>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-rose-600 font-bold bg-rose-50 w-fit px-2 py-1 rounded-md relative z-10">
            145 Students Pending
          </div>
        </div>

        <div className="bg-surface-card p-6 rounded-card border border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <FileText className="w-24 h-24 text-primary-600" />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-ink-muted font-medium mb-1">Invoices Generated</p>
            <h3 className="text-3xl font-bold text-ink">850</h3>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-primary-600 font-bold bg-primary-50 w-fit px-2 py-1 rounded-md relative z-10">
            Q2 Invoices Sent
          </div>
        </div>

        <div className="bg-surface-card p-6 rounded-card border border-border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="w-24 h-24 text-primary-600" />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-ink-muted font-medium mb-1">Defaulter Rate</p>
            <h3 className="text-3xl font-bold text-ink">12%</h3>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-ink-muted font-bold bg-surface w-fit px-2 py-1 rounded-md relative z-10">
            Requires follow-up
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface-card rounded-card border border-border shadow-sm p-6">
          <h3 className="text-lg font-bold text-ink mb-6 border-b border-border pb-4">
            Recent Transactions
          </h3>
          <div className="space-y-4">
            {[].map((txn: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 hover:bg-surface rounded-xl transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-ink">
                    {txn.student}{" "}
                    <span className="text-xs text-ink-faint font-medium ml-1">({txn.class})</span>
                  </span>
                  <span className="text-xs text-ink-muted">
                    {txn.date} • {txn.method}
                  </span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="font-bold text-ink">{txn.amount}</span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1 ${txn.status === "Success" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {txn.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-card rounded-card border border-border shadow-sm p-6">
          <h3 className="text-lg font-bold text-ink mb-6 border-b border-border pb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-6 bg-surface hover:bg-emerald-50 hover:border-emerald-200 border border-transparent rounded-card transition-colors text-left group">
              <DollarSign className="w-8 h-8 text-ink-faint group-hover:text-emerald-600 mb-4 transition-colors" />
              <h4 className="font-bold text-ink">Collect Payment</h4>
              <p className="text-xs text-ink-muted mt-1">Process a new fee receipt manually</p>
            </button>
            <button className="p-6 bg-surface hover:bg-primary-50 hover:border-primary-100 border border-transparent rounded-card transition-colors text-left group">
              <AlertCircle className="w-8 h-8 text-ink-faint group-hover:text-primary-600 mb-4 transition-colors" />
              <h4 className="font-bold text-ink">Send Reminders</h4>
              <p className="text-xs text-ink-muted mt-1">SMS/Email alerts to defaulters</p>
            </button>
            <button className="p-6 bg-surface hover:bg-primary-50 hover:border-primary-100 border border-transparent rounded-card transition-colors text-left group">
              <FileText className="w-8 h-8 text-ink-faint group-hover:text-primary-600 mb-4 transition-colors" />
              <h4 className="font-bold text-ink">Generate Invoices</h4>
              <p className="text-xs text-ink-muted mt-1">Bulk create invoices for Q3</p>
            </button>
            <button className="p-6 bg-surface hover:bg-amber-50 hover:border-amber-200 border border-transparent rounded-card transition-colors text-left group">
              <TrendingUp className="w-8 h-8 text-ink-faint group-hover:text-amber-600 mb-4 transition-colors" />
              <h4 className="font-bold text-ink">View Ledgers</h4>
              <p className="text-xs text-ink-muted mt-1">Check detailed student statements</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

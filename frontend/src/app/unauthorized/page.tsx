"use client";
import React from "react";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Suspense } from "react";

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="bg-surface-card max-w-md w-full rounded-card border border-border shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">Access Denied</h1>
        <p className="text-ink-muted mb-8">
          {reason === "subdomain_required"
            ? "Please access your school's specific portal via its subdomain."
            : "You do not have permission to view this page."}
        </p>
        <Link
          href="/login"
          className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors inline-block w-full"
        >
          Return to Login
        </Link>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}
    >
      <UnauthorizedContent />
    </Suspense>
  );
}

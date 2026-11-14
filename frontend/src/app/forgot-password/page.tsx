"use client";
import React, { useState } from "react";
import Link from "next/link";
import { getTenantSubdomain } from "@/lib/config";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const subdomain =
        (typeof window !== "undefined" && getTenantSubdomain(window.location.host)) || undefined;
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subdomain }),
      });
      if (!res.ok) throw new Error("Request failed");
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-surface-card rounded-card shadow-xl overflow-hidden">
        <div className="bg-slate-800 p-8 text-center border-b border-slate-700">
          <h1 className="text-2xl font-bold text-white">Forgot your password?</h1>
          <p className="text-ink-faint mt-2">We'll email you a reset link.</p>
        </div>
        <div className="p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-success-bg text-success-text rounded-lg text-sm">
                If an account exists for <strong>{email}</strong>, a password reset link has been
                sent. The link expires in 60 minutes.
              </div>
              <Link
                href="/login"
                className="inline-block text-primary-600 font-semibold hover:underline"
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-ink mb-1">Email address</label>
                  <input
                    required
                    type="email"
                    className="w-full border border-border-strong rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-primary-600 text-white font-bold py-4 rounded-lg shadow-lg hover:bg-primary-700 transition-all ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>
              <div className="mt-6 text-center">
                <Link href="/login" className="text-sm text-ink-muted hover:text-primary-600">
                  ← Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearTokenCache } from "@/lib/axios";

export default function CoreTeamForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    // Component mounted successfully
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        // New user session — drop any token cached for a previous user in this tab.
        clearTokenCache();
        // Fetch fresh session directly from NextAuth to bypass client cache
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        const role = sessionData?.user?.role || sessionData?.role;
        const subdomain = sessionData?.user?.subdomain || sessionData?.subdomain;

        let path = "/";
        if (role === "Super Admin") path = "/super-admin/dashboard";
        else if (role === "School Admin") path = "/admin/dashboard";
        else if (role === "Teacher") path = "/teacher/dashboard";
        else if (role === "Student") path = "/student/dashboard";
        else if (role === "Parent") path = "/parent/dashboard";
        else if (role === "Accountant") path = "/accountant/dashboard";

        const currentHost = window.location.host;
        const isBaseDomain =
          currentHost.startsWith("localhost:") ||
          currentHost === "localhost" ||
          currentHost.split(".").length === 2;

        if (isBaseDomain && role !== "Super Admin") {
          // If a school user tries to login on the base domain, tell them they must use their subdomain
          await fetch("/api/auth/signout", { method: "POST" }); // clear the invalid session
          setError(
            `Access Denied: Please log in from your school's specific subdomain (e.g., ${subdomain}.${currentHost})`
          );
          setLoading(false);
          return;
        }

        window.location.href = path;
      }
    } catch (err) {
      setError("An unexpected error occurred. Please ensure the backend is running.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-surface-card rounded-card shadow-xl overflow-hidden">
        <div className="bg-slate-800 p-8 text-center border-b border-slate-700">
          <h1 className="text-3xl font-bold text-white">Core Team Portal</h1>
          <p className="text-ink-faint mt-2">Super Admin & Developer Access</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-ink mb-1">Super Admin Email</label>
              <input
                required
                type="text"
                className="w-full border border-border-strong rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                placeholder="e.g. admin@educore.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-ink mb-1">Password</label>
              <input
                required
                type="password"
                className="w-full border border-border-strong rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-primary-600 text-white font-bold py-4 rounded-lg shadow-lg hover:bg-primary-700 transform hover:-translate-y-0.5 active:scale-95 transition-all ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {loading ? "Authenticating..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-primary-600 hover:underline">
              Forgot password?
            </Link>
            <Link href="/signup" className="text-primary-600 hover:underline">
              Create a school →
            </Link>
          </div>

          <div className="mt-8 text-center text-ink-faint text-xs">
            <p>© 2026 School ERP Multi-Tenant SaaS</p>
          </div>
        </div>
      </div>
    </div>
  );
}

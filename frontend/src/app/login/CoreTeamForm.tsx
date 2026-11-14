"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { clearTokenCache } from "@/lib/axios";
import { parseAuthError, prettyAuthError, TWO_FACTOR_REQUIRED } from "@/lib/authError";
import { BASE_DOMAIN, getTenantSubdomain } from "@/lib/config";

export default function CoreTeamForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetTwoFactor = () => {
    setTwoFactorRequired(false);
    setOtp("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        otp: twoFactorRequired ? otp : "",
        redirect: false,
      });

      const authErr = parseAuthError(result);
      if (authErr === TWO_FACTOR_REQUIRED) {
        // Password OK — step up to the 2FA code.
        setTwoFactorRequired(true);
        setError("");
        setLoading(false);
        return;
      }
      if (authErr) {
        setError(prettyAuthError(authErr));
        setLoading(false);
        return;
      }

      // Success — drop any token cached for a previous user in this tab.
      clearTokenCache();
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
      const isBaseDomain = !getTenantSubdomain(currentHost);

      if (isBaseDomain && role !== "Super Admin") {
        // A school user logging in on the base domain — bounce them to their subdomain.
        await fetch("/api/auth/signout", { method: "POST" });
        setError(
          `Access Denied: Please log in from your school's specific subdomain (e.g., ${subdomain}.${currentHost})`
        );
        setLoading(false);
        return;
      }

      window.location.href = path;
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
            {!twoFactorRequired ? (
              <>
                <div>
                  <label className="block text-sm font-bold text-ink mb-1">Super Admin Email</label>
                  <input
                    required
                    type="text"
                    className="w-full border border-border-strong rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    placeholder={`e.g. admin@${BASE_DOMAIN}`}
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
              </>
            ) : (
              <div>
                <label className="block text-sm font-bold text-ink mb-1">Two-factor code</label>
                <p className="text-xs text-ink-muted mb-2">
                  Enter the 6-digit code from your authenticator app, or a recovery code.
                </p>
                <input
                  required
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="w-full border border-border-strong rounded-lg p-3 text-center tracking-widest focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <button
                  type="button"
                  onClick={resetTwoFactor}
                  className="mt-2 text-xs text-primary-600 hover:underline"
                >
                  ← Use a different account
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-primary-600 text-white font-bold py-4 rounded-lg shadow-lg hover:bg-primary-700 transform hover:-translate-y-0.5 active:scale-95 transition-all ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {loading
                ? twoFactorRequired
                  ? "Verifying..."
                  : "Authenticating..."
                : twoFactorRequired
                  ? "Verify"
                  : "Sign In"}
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

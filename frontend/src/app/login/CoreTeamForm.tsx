"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { clearTokenCache } from "@/lib/axios";
import { parseAuthError, prettyAuthError, TWO_FACTOR_REQUIRED } from "@/lib/authError";
import { BASE_DOMAIN, getTenantSubdomain } from "@/lib/config";
import GridMark from "@/components/brand/GridMark";

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

      const isBaseDomain = !getTenantSubdomain(window.location.host);

      if (isBaseDomain && role !== "Super Admin") {
        // A school user logging in on the base domain — bounce them to their subdomain.
        await fetch("/api/auth/signout", { method: "POST" });
        setError(
          subdomain
            ? `This account belongs to a school. Sign in at ${subdomain}.${BASE_DOMAIN} instead.`
            : `This account belongs to a school. Sign in at your school's own address instead.`
        );
        setLoading(false);
        return;
      }

      window.location.href = path;
    } catch (err) {
      setError("Couldn't reach the Erpcore server. Check your connection and try again.");
      setLoading(false);
    }
  };

  const field =
    "mt-2 block w-full rounded-lg border border-white/[0.12] bg-void-800 px-3.5 py-3 text-[15px] text-warm placeholder:text-warm-600 outline-none transition focus:border-gold/70 focus:ring-2 focus:ring-gold/20";

  return (
    <main className="flex min-h-screen flex-col bg-void px-6 font-body text-warm antialiased">
      <div className="mx-auto w-full max-w-6xl py-6 lg:px-4">
        <Link href="/" className="inline-flex items-center gap-3 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
          <GridMark />
          <span className="font-display text-[19px] font-semibold tracking-tight">Erpcore</span>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center pb-24 pt-8">
        <div className="w-full max-w-[24rem]">
          <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-[-0.02em]">Erpcore team sign-in</h1>
          <p className="mt-3 text-[15px] leading-[1.6] text-warm-400">
            School staff, parents and students sign in at their school&apos;s own address, like{" "}
            <span className="whitespace-nowrap text-warm">yourschool.{BASE_DOMAIN}</span>.
          </p>

          {error && (
            <p role="alert" className="mt-6 rounded-lg border border-[#6B2F2A] bg-[#22110F] px-4 py-3 text-sm leading-relaxed text-[#F2B8B0]">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {!twoFactorRequired ? (
              <>
                <label className="block text-sm font-medium text-warm">
                  Email
                  <input
                    required
                    type="email"
                    autoComplete="username"
                    className={field}
                    placeholder={`admin@${BASE_DOMAIN}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium text-warm">
                  Password
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    className={field}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-warm">
                  Two-step code
                  <span className="mt-1 block text-[13px] font-normal text-warm-400">
                    Enter the 6-digit code from your authenticator app, or a recovery code.
                  </span>
                  <input
                    required
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className={`${field} font-mono tracking-[0.3em]`}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </label>
                <button type="button" onClick={resetTwoFactor} className="mt-3 text-sm text-warm-400 underline-offset-4 hover:text-warm hover:underline">
                  Use a different account
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gold py-3.5 text-sm font-semibold text-void transition hover:bg-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? twoFactorRequired
                  ? "Checking code…"
                  : "Signing in…"
                : twoFactorRequired
                  ? "Verify code"
                  : "Sign in"}
            </button>
          </form>

          <div className="mt-7 flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-warm-400 underline-offset-4 hover:text-warm hover:underline">
              Forgot password?
            </Link>
            <Link href="/signup" className="text-gold underline-offset-4 hover:underline">
              Create a school
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

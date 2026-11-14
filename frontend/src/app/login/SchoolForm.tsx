"use client";
import React, { useState } from "react";
import Link from "next/link";
import { parseAuthError, prettyAuthError, TWO_FACTOR_REQUIRED } from "@/lib/authError";
import { BASE_DOMAIN, getTenantSubdomain } from "@/lib/config";
import GridMark from "@/components/brand/GridMark";

interface SchoolInfo {
  id?: string;
  name?: string;
  logo_url?: string | null;
  subdomain?: string;
  board_affiliation?: string | null;
}

/** Up to two initials from the school's real name — the crest fallback when no logo is set. */
function crestInitials(name?: string): string {
  const words = (name || "").trim().split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
  if (words.length === 0) return "";
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function SchoolForm({ school }: { school?: SchoolInfo | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

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
      let csrfToken;
      try {
        const csrfRes = await fetch("/api/auth/csrf", { credentials: "include" });
        const data = await csrfRes.json();
        csrfToken = data.csrfToken;
      } catch (err: any) {
        throw new Error("Failed at CSRF fetch: " + err.message);
      }

      let result;
      try {
        const res = await fetch("/api/auth/callback/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          credentials: "include",
          body: new URLSearchParams({
            email,
            password,
            otp: twoFactorRequired ? otp : "",
            csrfToken,
            redirect: "false",
            json: "true",
          }),
        });
        result = await res.json();
      } catch (err: any) {
        throw new Error("Failed at Login POST: " + err.message);
      }

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

      let sessionData;
      try {
        const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
        sessionData = await sessionRes.json();
      } catch (err: any) {
        throw new Error("Failed at Session fetch: " + err.message);
      }

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

      if (isBaseDomain && role !== "Super Admin" && role !== "super_admin") {
        // If a school user tries to login on the base domain, tell them they must use their subdomain
        await fetch("/api/auth/signout", { method: "POST" }); // clear the invalid session
        setError(
          `This account belongs to a school. Sign in at ${subdomain}.${currentHost} instead.`
        );
        setLoading(false);
        return;
      }

      window.location.href = path;
    } catch (err: any) {
      // Keep the technical detail in the console; show the person something they can act on.
      console.error("[login]", err);
      setError("We couldn't reach the sign-in service. Check your connection and try again.");
      setLoading(false);
    }
  };

  const schoolName = school?.name || "School portal";
  const host = school?.subdomain ? `${school.subdomain}.${BASE_DOMAIN}` : BASE_DOMAIN;
  const showLogo = school?.logo_url && !logoFailed;

  return (
    <div className="min-h-screen bg-void font-body text-warm antialiased lg:grid lg:grid-cols-[minmax(0,44%)_minmax(0,56%)]">
      {/* ── Institution panel ───────────────────────────────────────────────
          The school itself is the largest element on the page. On a
          multi-tenant login the most valuable thing to establish is *whose*
          system this is, so every value here is real tenant data. */}
      <aside className="relative flex flex-col border-b border-white/[0.07] bg-void-800 px-6 py-7 lg:border-b-0 lg:border-r lg:px-12 lg:py-14">
        {/* my-auto centres the identity block and pushes the footer to the bottom edge. */}
        <div className="flex items-center gap-4 lg:my-auto lg:block">
          {/* Crest: the school's real logo, or its initials. */}
          {(showLogo || crestInitials(school?.name)) && (
          <div className="shrink-0">
            {showLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={school!.logo_url as string}
                alt=""
                onError={() => setLogoFailed(true)}
                className="h-12 w-12 rounded-full object-cover ring-1 ring-gold/40 lg:h-16 lg:w-16"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full font-display text-base font-semibold tracking-tight text-gold ring-1 ring-gold/40 lg:h-16 lg:w-16 lg:text-xl">
                {crestInitials(school?.name)}
              </div>
            )}
          </div>
          )}

          <div className="min-w-0 lg:mt-8">
            <h1 className="font-display text-xl font-semibold leading-tight tracking-tight text-warm lg:text-[2.25rem] lg:leading-[1.12]">
              {schoolName}
            </h1>

            <p className="mt-1 text-sm text-warm-400 lg:mt-4 lg:text-[15px]">
              <span className="text-warm">{host}</span>
              {school?.board_affiliation ? <span className="block lg:mt-1">Affiliated to {school.board_affiliation}</span> : null}
            </p>

            {/* Only claim the school's name when we actually resolved it. */}
            <p className="mt-8 hidden max-w-xs text-[15px] leading-relaxed text-warm-400 lg:block">
              {school?.name
                ? `The portal for students, parents, teachers and staff at ${school.name}.`
                : "The portal for students, parents, teachers and staff."}
            </p>
          </div>
        </div>

        <a href={`https://${BASE_DOMAIN}`} className="hidden items-center gap-2.5 self-start text-sm text-warm-600 transition-colors hover:text-warm-400 lg:inline-flex">
          <GridMark cell={4} gap={2} />
          Runs on Erpcore
        </a>
      </aside>

      {/* ── Sign-in ─────────────────────────────────────────────────────── */}
      <main className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-[400px] motion-safe:animate-fade-in">
          <h2 className="font-display text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-warm">Sign in</h2>
          <p className="mt-2 text-[15px] text-warm-400">
            {twoFactorRequired
              ? "One more step to confirm it's you."
              : "Use the email address your school gave you."}
          </p>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mt-6 rounded-lg border border-[#6B2F2A] bg-[#22110F] px-4 py-3 text-sm leading-relaxed text-[#F2B8B0]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {!twoFactorRequired ? (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-warm">
                    Email
                  </label>
                  <input
                    id="email"
                    required
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    className="mt-2 w-full rounded-lg border border-white/[0.12] bg-void-800 px-3.5 py-3 text-[15px] text-warm placeholder:text-warm-600 outline-none transition focus:border-gold/70 focus:ring-2 focus:ring-gold/20"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-warm">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="rounded-sm text-[13px] text-warm-400 hover:text-warm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    id="password"
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="mt-2 w-full rounded-lg border border-white/[0.12] bg-void-800 px-3.5 py-3 text-[15px] text-warm placeholder:text-warm-600 outline-none transition focus:border-gold/70 focus:ring-2 focus:ring-gold/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-warm">
                  Two-factor code
                </label>
                <p className="mt-1 text-[13px] text-warm-400">
                  Enter the 6-digit code from your authenticator app, or a recovery code.
                </p>
                <input
                  id="otp"
                  required
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="mt-2 w-full rounded-lg border border-white/[0.12] bg-void-800 px-3.5 py-3 text-center font-mono text-base tracking-[0.4em] text-warm placeholder:tracking-[0.4em] placeholder:text-warm-600 outline-none transition focus:border-gold/70 focus:ring-2 focus:ring-gold/20"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <button
                  type="button"
                  onClick={resetTwoFactor}
                  className="mt-3 rounded-sm text-sm text-warm-400 underline-offset-4 hover:text-warm hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                >
                  Use a different account
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full rounded-full bg-gold py-3.5 text-sm font-semibold text-void transition hover:bg-gold-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? twoFactorRequired
                  ? "Verifying…"
                  : "Signing in…"
                : twoFactorRequired
                  ? "Verify code"
                  : "Sign in"}
            </button>
          </form>

          {!twoFactorRequired && (
            <Link
              href="/forgot-password"
              className="mt-6 inline-block rounded-sm text-sm text-warm-400 underline-offset-4 hover:text-warm hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            >
              Forgot your password?
            </Link>
          )}

          <div className="mt-10 border-t border-white/[0.07] pt-5">
            <p className="flex gap-5 text-[13px] text-warm-600">
              <Link href="/privacy" className="hover:text-warm-400">
                Privacy policy
              </Link>
              <Link href="/terms" className="hover:text-warm-400">
                Terms of use
              </Link>
              <a href={`https://${BASE_DOMAIN}`} className="ml-auto hover:text-warm-400 lg:hidden">
                Runs on Erpcore
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

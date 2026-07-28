"use client";
import React, { useState } from "react";
import Link from "next/link";
import { parseAuthError, prettyAuthError, TWO_FACTOR_REQUIRED } from "@/lib/authError";
import { BASE_DOMAIN, getTenantSubdomain } from "@/lib/config";

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
  if (words.length === 0) return "SCH";
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
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[minmax(0,44%)_minmax(0,56%)]">
      {/* ── Institution panel ───────────────────────────────────────────────
          The school itself is the largest element on the page. On a
          multi-tenant login the most valuable thing to establish is *whose*
          system this is, so every value here is real tenant data. */}
      <aside className="relative isolate flex flex-col overflow-hidden bg-void px-6 py-7 lg:px-12 lg:py-14">
        {/* One soft gold light source, top-left. No pattern, no blobs. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(120% 85% at 6% -5%, rgba(235,203,135,0.14) 0%, rgba(235,203,135,0.045) 34%, transparent 68%)",
          }}
        />

        {/* my-auto centres the identity block and pushes the footer to the bottom edge. */}
        <div className="flex items-center gap-4 lg:my-auto lg:block">
          {/* Crest: the school's real logo, or its initials. */}
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

          <div className="min-w-0 lg:mt-8">
            <h1 className="font-display text-xl font-semibold leading-tight tracking-tight text-warm lg:text-[2.25rem] lg:leading-[1.12]">
              {schoolName}
            </h1>

            {/* Signature element: the institutional record line. Monospaced so the
                address you're signing in to is legible character by character. */}
            <div className="mt-1.5 lg:mt-5">
              <div aria-hidden="true" className="hidden h-px w-14 bg-gold/45 lg:block" />
              <p className="font-mono text-[10.5px] tracking-[0.14em] text-gold-600 lg:mt-4 lg:text-xs lg:tracking-[0.18em]">
                {host}
                {school?.board_affiliation ? (
                  <span className="text-warm-400"> · {school.board_affiliation}</span>
                ) : null}
              </p>
            </div>

            {/* Only claim the school's name when we actually resolved it. */}
            <p className="mt-7 hidden max-w-xs text-sm leading-relaxed text-warm-400 lg:block">
              {school?.name
                ? `The portal for students, parents, teachers and staff at ${school.name}.`
                : "The portal for students, parents, teachers and staff."}
            </p>
          </div>
        </div>

        <p className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-warm-400 lg:block">
          Powered by ERPCore
        </p>
      </aside>

      {/* ── Sign-in ─────────────────────────────────────────────────────── */}
      <main className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-[400px] motion-safe:animate-fade-in">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Sign in</h2>
          <p className="mt-1.5 text-sm text-ink-muted">
            {twoFactorRequired
              ? "One more step to confirm it's you."
              : "Use the email address your school gave you."}
          </p>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mt-6 rounded-input border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-text"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {!twoFactorRequired ? (
              <>
                <div>
                  <label htmlFor="email" className="block text-[13px] font-medium text-ink">
                    Email
                  </label>
                  <input
                    id="email"
                    required
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    className="mt-1.5 w-full rounded-input border border-border-strong bg-surface-card px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="password" className="block text-[13px] font-medium text-ink">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="rounded-sm text-xs font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    id="password"
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="mt-1.5 w-full rounded-input border border-border-strong bg-surface-card px-3.5 py-2.5 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="otp" className="block text-[13px] font-medium text-ink">
                  Two-factor code
                </label>
                <p className="mt-1 text-xs text-ink-muted">
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
                  className="mt-2 w-full rounded-input border border-border-strong bg-surface-card px-3.5 py-2.5 text-center font-mono text-base tracking-[0.4em] text-ink placeholder:tracking-[0.4em] placeholder:text-ink-faint focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <button
                  type="button"
                  onClick={resetTwoFactor}
                  className="mt-2.5 rounded-sm text-xs font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                >
                  Use a different account
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full rounded-btn bg-primary-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="mt-5 inline-block rounded-sm text-sm text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            >
              Forgot your password?
            </Link>
          )}

          <div className="mt-10 border-t border-border pt-5">
            <p className="text-xs text-ink-faint">
              <Link href="/privacy" className="hover:text-ink-muted hover:underline">
                Privacy policy
              </Link>
              <span className="px-1.5">·</span>
              <Link href="/terms" className="hover:text-ink-muted hover:underline">
                Terms of use
              </Link>
            </p>
            <p className="mt-3 text-xs text-ink-faint lg:hidden">Powered by ERPCore</p>
          </div>
        </div>
      </main>
    </div>
  );
}

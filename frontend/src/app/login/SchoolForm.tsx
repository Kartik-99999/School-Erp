"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseAuthError, prettyAuthError, TWO_FACTOR_REQUIRED } from "@/lib/authError";
import { BASE_DOMAIN, getTenantSubdomain } from "@/lib/config";

interface SchoolInfo {
  id?: string;
  name?: string;
  logo_url?: string | null;
  subdomain?: string;
}

export default function SchoolForm({ school }: { school?: SchoolInfo | null }) {
  const router = useRouter();
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
  useEffect(() => {
    // Component mounted successfully
  }, []);

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
          `Access Denied: Please log in from your school's specific subdomain (e.g., ${subdomain}.${currentHost})`
        );
        setLoading(false);
        return;
      }

      window.location.href = path;
    } catch (err: any) {
      setError(`Crash error: ${err?.message || JSON.stringify(err)}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 font-sans">
      <div className="max-w-5xl w-full flex flex-col md:flex-row bg-transparent overflow-hidden">
        {/* Left Column - School Image & App Links */}
        <div className="md:w-3/5 flex flex-col items-center justify-center p-4">
          <div className="w-full bg-surface-card rounded-md shadow-sm border border-border overflow-hidden mb-4">
            {/* Placeholder for School Image - simulating the DCM school image */}
            <div className="relative w-full aspect-video bg-primary-50 flex items-center justify-center border-b-4 border-blue-800">
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              <div className="z-10 text-center text-white p-6">
                <h2
                  className="text-4xl font-extrabold text-red-600 drop-shadow-md bg-surface-card/90 px-4 py-2 inline-block rounded border border-red-200 mb-4"
                  style={{ fontFamily: "serif" }}
                >
                  {school?.name || "School Portal"}
                </h2>
                <div className="text-2xl font-bold drop-shadow-lg">WELCOME</div>
                <div className="text-lg drop-shadow-md">
                  {school?.subdomain
                    ? `${school.subdomain}.${BASE_DOMAIN}`
                    : "Student & Parent Portal"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mb-4">
            {/* App Store Badge Placeholder */}
            <div className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-gray-800 transition">
              <span className="text-2xl">🍎</span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] leading-tight">Download on the</span>
                <span className="text-lg font-semibold leading-tight">App Store</span>
              </div>
            </div>
            {/* Google Play Badge Placeholder */}
            <div className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-gray-800 transition">
              <span className="text-2xl">▶️</span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] leading-tight">GET IT ON</span>
                <span className="text-lg font-semibold leading-tight">Google Play</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-card px-6 py-2 rounded shadow-sm border border-border text-sm font-bold text-ink">
            School Code For Mobile App : <span className="text-black">113212</span>
          </div>
        </div>

        {/* Right Column - Login Form */}
        <div className="md:w-2/5 p-4 flex items-center justify-center">
          <div className="bg-surface-card w-full rounded-md shadow-sm border border-border p-8">
            {/* School Logo (dynamic) */}
            <div className="flex flex-col items-center mb-6">
              {school?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={school.logo_url}
                  alt={school?.name || "School"}
                  className="w-24 h-24 rounded-full border-2 border-yellow-400 object-cover shadow-inner"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-2 border-yellow-400 bg-primary-600 flex items-center justify-center text-white text-center shadow-inner overflow-hidden">
                  <span className="text-xl font-bold px-2">
                    {school?.name ? school.name.slice(0, 2).toUpperCase() : "SCH"}
                  </span>
                </div>
              )}
              {school?.name && (
                <p className="mt-3 text-sm font-bold text-ink text-center">{school.name}</p>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!twoFactorRequired ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Username</label>
                    <input
                      required
                      type="text"
                      className="w-full border border-primary-500 rounded px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-all text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-1">Password</label>
                    <input
                      required
                      type="password"
                      className="w-full border border-border-strong rounded px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none transition-all text-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="remember"
                      className="rounded border-border-strong text-primary-700 focus:ring-blue-800"
                    />
                    <label htmlFor="remember" className="text-xs text-ink">
                      Remember Password
                    </label>
                  </div>

                  <div className="text-xs text-primary-700 pt-1">
                    <a href="#" className="hover:underline">
                      Privacy Policy
                    </a>{" "}
                    |{" "}
                    <a href="#" className="hover:underline">
                      Terms of Use
                    </a>
                    .
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Two-factor code</label>
                  <p className="text-xs text-ink-muted mb-2">
                    Enter the 6-digit code from your authenticator app, or a recovery code.
                  </p>
                  <input
                    required
                    autoFocus
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="w-full border border-primary-500 rounded px-3 py-2 text-center tracking-widest focus:ring-1 focus:ring-blue-600 focus:outline-none transition-all text-sm"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={resetTwoFactor}
                    className="mt-2 text-xs text-primary-700 hover:underline"
                  >
                    ← Use a different account
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-[#0a2387] text-white font-bold py-2.5 rounded shadow-sm hover:bg-blue-900 transition-colors mt-2 ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {loading
                  ? twoFactorRequired
                    ? "Verifying..."
                    : "Signing in..."
                  : twoFactorRequired
                    ? "Verify"
                    : "Sign In"}
              </button>
            </form>

            <div className="mt-3 text-left">
              <Link
                href="/forgot-password"
                className="text-xs text-ink-muted hover:text-primary-700 hover:underline"
              >
                Forgot your password? Click here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

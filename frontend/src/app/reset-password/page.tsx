"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Read the token from the URL on the client (avoids the useSearchParams
  // Suspense requirement during static generation).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) return setError("This reset link is missing its token.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || "This reset link is invalid or has expired.");
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Could not reset your password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-surface-card rounded-card shadow-xl overflow-hidden">
        <div className="bg-slate-800 p-8 text-center border-b border-slate-700">
          <h1 className="text-2xl font-bold text-white">Set a new password</h1>
        </div>
        <div className="p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-success-bg text-success-text rounded-lg text-sm">
                Your password has been reset. You can now sign in with your new password.
              </div>
              <Link
                href="/login"
                className="inline-block bg-primary-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-primary-700"
              >
                Go to sign in
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
                  <label className="block text-sm font-bold text-ink mb-1">New password</label>
                  <input
                    required
                    type="password"
                    className="w-full border border-border-strong rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-ink mb-1">
                    Confirm new password
                  </label>
                  <input
                    required
                    type="password"
                    className="w-full border border-border-strong rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    placeholder="Re-enter your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !token}
                  className={`w-full bg-primary-600 text-white font-bold py-4 rounded-lg shadow-lg hover:bg-primary-700 transition-all ${loading || !token ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {loading ? "Resetting..." : "Reset password"}
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

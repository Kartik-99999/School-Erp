"use client";
import React, { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function SignupPage() {
  const [form, setForm] = useState({
    school_name: "",
    subdomain: "",
    admin_name: "",
    admin_email: "",
    admin_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ subdomain: string; admin_email: string } | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Mirror the backend rule: lowercase letters/digits/hyphens, 3–50 chars.
  const onSubdomain = (v: string) => set("subdomain", v.toLowerCase().replace(/[^a-z0-9-]/g, ""));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/schools/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.detail || "Could not create your school.");
      setCreated(json?.data ?? { subdomain: form.subdomain, admin_email: form.admin_email });
    } catch (err: any) {
      setError(err.message || "Could not create your school.");
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="max-w-md w-full bg-surface-card rounded-card shadow-xl overflow-hidden">
          <div className="bg-slate-800 p-8 text-center border-b border-slate-700">
            <h1 className="text-2xl font-bold text-white">You're all set! 🎉</h1>
          </div>
          <div className="p-8 text-center space-y-4">
            <p className="text-ink">
              Your school portal is ready at <strong>{created.subdomain}</strong>. Sign in as the
              School Admin with <strong>{created.admin_email}</strong>.
            </p>
            <Link
              href="/login"
              className="inline-block bg-primary-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-primary-700"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-surface-card rounded-card shadow-xl overflow-hidden">
        <div className="bg-slate-800 p-8 text-center border-b border-slate-700">
          <h1 className="text-2xl font-bold text-white">Create your school</h1>
          <p className="text-ink-faint mt-2">Spin up a tenant in seconds — start a free trial.</p>
        </div>
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-ink mb-1">School name</label>
              <input
                required
                type="text"
                className="w-full border border-border-strong rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Springfield High School"
                value={form.school_name}
                onChange={(e) => set("school_name", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink mb-1">Subdomain</label>
              <div className="flex items-center">
                <input
                  required
                  type="text"
                  className="w-full border border-border-strong rounded-l-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="springfield"
                  value={form.subdomain}
                  onChange={(e) => onSubdomain(e.target.value)}
                />
                <span className="bg-surface border border-l-0 border-border-strong rounded-r-lg p-3 text-ink-muted text-sm">
                  .educore.com
                </span>
              </div>
              <p className="text-xs text-ink-faint mt-1">
                3–50 chars, lowercase letters, digits, and hyphens.
              </p>
            </div>
            <div>
              <label className="block text-sm font-bold text-ink mb-1">Admin name</label>
              <input
                required
                type="text"
                className="w-full border border-border-strong rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="Jane Doe"
                value={form.admin_name}
                onChange={(e) => set("admin_name", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink mb-1">Admin email</label>
              <input
                required
                type="email"
                className="w-full border border-border-strong rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="admin@springfield.edu"
                value={form.admin_email}
                onChange={(e) => set("admin_email", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink mb-1">Admin password</label>
              <input
                required
                type="password"
                className="w-full border border-border-strong rounded-lg p-3 focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="At least 6 characters"
                value={form.admin_password}
                onChange={(e) => set("admin_password", e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-primary-600 text-white font-bold py-4 rounded-lg shadow-lg hover:bg-primary-700 transition-all ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {loading ? "Creating your school..." : "Create school"}
            </button>
          </form>
          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-ink-muted hover:text-primary-600">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

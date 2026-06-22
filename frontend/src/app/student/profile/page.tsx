"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import ProfileView from "@/components/profile/ProfileView";

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get("/students/me");
      setProfile(res.data.data);
    } catch (e) {
      console.error("Failed to load profile", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-ink">My Profile</h2>
        <p className="text-ink-muted mt-1">Your school record.</p>
      </div>
      {loading ? (
        <div className="py-16 text-center text-ink-muted">Loading…</div>
      ) : error ? (
        <div className="bg-surface-card rounded-card border border-border p-8 text-center text-red-600">
          Couldn't load your profile.
          <button onClick={load} className="underline font-medium ml-1">
            Retry
          </button>
        </div>
      ) : profile ? (
        <ProfileView p={profile} />
      ) : (
        <div className="bg-surface-card rounded-card border border-border p-12 text-center text-ink-muted">
          Profile not found.
        </div>
      )}
    </div>
  );
}

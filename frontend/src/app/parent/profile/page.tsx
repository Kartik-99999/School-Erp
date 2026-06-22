"use client";
import React, { useEffect, useState } from "react";
import { getStudentProfile } from "@/lib/api/students";
import ProfileView from "@/components/profile/ProfileView";
import { useChildren, ChildPicker } from "@/components/parent/ChildPicker";

export default function ParentProfilePage() {
  const { students, childId, setChildId, loading: childrenLoading, error: childrenError } = useChildren();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!childId) return;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const res = await getStudentProfile(childId);
        setProfile(res.data);
      } catch (e) {
        console.error("Failed to load profile", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [childId]);

  if (childrenLoading)
    return <div className="max-w-3xl mx-auto py-16 text-center text-ink-muted">Loading…</div>;
  if (childrenError)
    return <div className="max-w-3xl mx-auto py-16 text-center text-red-600">Couldn't load your children. Please try again.</div>;
  if (students.length === 0)
    return <div className="max-w-3xl mx-auto py-16 text-center text-ink-muted">No students are linked to your account yet.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Student Profile</h2>
          <p className="text-ink-muted mt-1">Your child's school record.</p>
        </div>
        <ChildPicker students={students} childId={childId} onChange={setChildId} />
      </div>
      {loading ? (
        <div className="py-16 text-center text-ink-muted">Loading…</div>
      ) : error ? (
        <div className="bg-surface-card rounded-card border border-border p-8 text-center text-red-600">
          Couldn't load the profile. Please try again.
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

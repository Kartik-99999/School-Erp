"use client";
import React, { useEffect, useState } from "react";
import { getSyllabus } from "@/lib/api/studentPortal";
import SyllabusView, { Syllabus } from "@/components/academics/SyllabusView";
import { useChildren, ChildPicker } from "@/components/parent/ChildPicker";

export default function ParentSyllabusPage() {
  const { students, childId, setChildId, loading: childrenLoading, error: childrenError } = useChildren();
  const [data, setData] = useState<Syllabus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!childId) return;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const res = await getSyllabus(childId);
        setData(res.data ?? null);
      } catch (e) {
        console.error("Failed to load syllabus", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [childId]);

  if (childrenLoading)
    return <div className="max-w-5xl mx-auto py-16 text-center text-ink-muted">Loading…</div>;
  if (childrenError)
    return <div className="max-w-5xl mx-auto py-16 text-center text-red-600">Couldn't load your children. Please try again.</div>;
  if (students.length === 0)
    return <div className="max-w-5xl mx-auto py-16 text-center text-ink-muted">No students are linked to your account yet.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Syllabus</h2>
          <p className="text-ink-muted mt-1">Chapter-wise progress across your child's subjects.</p>
        </div>
        <ChildPicker students={students} childId={childId} onChange={setChildId} />
      </div>
      <SyllabusView data={data} loading={loading} error={error} />
    </div>
  );
}

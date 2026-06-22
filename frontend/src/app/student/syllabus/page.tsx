"use client";
import React, { useEffect, useState } from "react";
import { getSyllabus } from "@/lib/api/studentPortal";
import SyllabusView, { Syllabus } from "@/components/academics/SyllabusView";

export default function StudentSyllabusPage() {
  const [data, setData] = useState<Syllabus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getSyllabus();
      setData(res.data ?? null);
    } catch (e) {
      console.error("Failed to load syllabus", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-ink">Syllabus</h2>
        <p className="text-ink-muted mt-1">Chapter-wise progress across your subjects.</p>
      </div>
      <SyllabusView data={data} loading={loading} error={error} onRetry={load} />
    </div>
  );
}

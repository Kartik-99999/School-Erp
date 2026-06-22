"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";

export interface Child {
  id: string;
  first_name: string;
  last_name: string;
  admission_number?: string;
}

// Loads the parent's own children (the backend scopes GET /students to the caller's wards)
// and tracks the selected child, defaulting to the first. Used by every parent academic page.
export function useChildren() {
  const [students, setStudents] = useState<Child[]>([]);
  const [childId, setChildId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/students");
        const kids: Child[] = res.data?.data || [];
        setStudents(kids);
        if (kids[0]) setChildId(kids[0].id);
      } catch (e) {
        console.error("Failed to load children", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { students, childId, setChildId, loading, error };
}

// A simple tab row to switch between children. Renders nothing for a single child.
export function ChildPicker({
  students,
  childId,
  onChange,
}: {
  students: Child[];
  childId: string;
  onChange: (id: string) => void;
}) {
  if (students.length <= 1) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {students.map((c) => {
        const on = c.id === childId;
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              on
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-surface-card text-ink border-border hover:bg-surface"
            }`}
          >
            {c.first_name} {c.last_name}
          </button>
        );
      })}
    </div>
  );
}

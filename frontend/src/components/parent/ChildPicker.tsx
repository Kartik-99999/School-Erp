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
    <div className="flex flex-wrap gap-2 p-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
      {students.map((c) => {
        const on = c.id === childId;
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              on
                ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-[0_2px_10px_rgb(0,0,0,0.08)] scale-100 ring-1 ring-black/5 dark:ring-white/10"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 scale-95 hover:scale-100"
            }`}
          >
            {c.first_name} {c.last_name}
          </button>
        );
      })}
    </div>
  );
}

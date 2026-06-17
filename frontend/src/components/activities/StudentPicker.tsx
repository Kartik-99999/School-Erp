"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Input } from "@/components/ui/Input";

/** Debounced student search that calls onPick(student) when a result is chosen. */
export function StudentPicker({ onPick }: { onPick: (student: any) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/students/paged?search=${encodeURIComponent(q)}&limit=6`);
        setResults(res.data?.data?.items || []);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <Input
        placeholder="Search a student by name or admission no…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {results.length > 0 && (
        <div className="mt-2 border border-border rounded-input divide-y divide-border max-h-48 overflow-auto">
          {results.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onPick(s);
                setQ("");
                setResults([]);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-surface"
            >
              {s.first_name} {s.last_name}{" "}
              <span className="text-ink-faint">· {s.admission_number || "—"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

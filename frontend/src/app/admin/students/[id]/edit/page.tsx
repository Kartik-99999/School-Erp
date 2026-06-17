"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { PageHeader } from "@/components/ui/PageHeader";
import { StudentForm, emptyStudentForm } from "@/components/students/StudentForm";
import { updateStudent } from "@/lib/api/students";

/** Flatten a StudentProfileResponse (student + nested parent + medical) into the
 * flat key/value shape StudentForm expects. */
function flatten(s: any): Record<string, string> {
  const p = s.parent || {};
  const m = s.medical || {};
  const out: Record<string, string> = { ...emptyStudentForm };
  const studentKeys = [
    "academic_year_id",
    "current_class_id",
    "current_section_id",
    "date_of_joining",
    "first_name",
    "last_name",
    "dob",
    "gender",
    "blood_group",
    "nationality",
    "religion",
    "category",
    "mother_tongue",
    "apaar_id",
    "aadhaar_no",
    "pen_number",
  ];
  studentKeys.forEach((k) => (out[k] = s[k] ?? ""));
  out.allergies = m.allergies ?? "";
  out.address = p.address ?? "";
  // All father_/mother_/guardian_ fields map straight across.
  Object.keys(emptyStudentForm).forEach((k) => {
    if (k.startsWith("father_") || k.startsWith("mother_") || k.startsWith("guardian_")) {
      out[k] = p[k] ?? "";
    }
  });
  return out;
}

export default function EditStudentPage() {
  const { id } = useParams();
  const router = useRouter();
  const [initial, setInitial] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    api
      .get(`/students/${id}`)
      .then((res) => setInitial(flatten(res.data.data)))
      .catch(() => {
        alert("Failed to load student");
        router.push("/admin/students");
      });
  }, [id, router]);

  if (!initial) return <div className="p-8 text-ink-muted">Loading student…</div>;

  return (
    <div>
      <PageHeader
        title="Edit Student"
        description="Update the student profile, contacts, and identifiers."
      />
      <StudentForm
        initial={initial}
        submitLabel="Save Changes"
        onSubmit={async (payload) => {
          await updateStudent(id as string, payload);
          alert("Student updated.");
          router.push(`/admin/students/${id}`);
        }}
      />
    </div>
  );
}

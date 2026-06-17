"use client";
import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { StudentForm, emptyStudentForm } from "@/components/students/StudentForm";
import { createStudent } from "@/lib/api/students";

function NewStudentInner() {
  const router = useRouter();
  const enquiryId = useSearchParams().get("enquiry_id");

  return (
    <div>
      <PageHeader
        title={enquiryId ? "Convert Enquiry to Student" : "Register New Student"}
        description="Complete the student profile. A parent portal account will be generated automatically."
      />
      <StudentForm
        initial={emptyStudentForm}
        submitLabel="Register Student"
        onSubmit={async (payload) => {
          await createStudent({ ...payload, enquiry_id: enquiryId || undefined });
          alert("Student created. A parent portal account was generated.");
          router.push("/admin/students");
        }}
      />
    </div>
  );
}

export default function NewStudentPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 max-w-4xl">
          <Skeleton className="h-40 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      }
    >
      <NewStudentInner />
    </Suspense>
  );
}

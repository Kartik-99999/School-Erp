"use client";
import React from "react";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 px-5 py-3 border-b border-border last:border-0">
      <span className="text-ink-muted text-sm">{label}</span>
      <span className="text-ink font-medium text-sm text-right">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-card rounded-card border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-bold text-ink">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

// Read-only student profile, shared by the student (self) and parent (child) pages.
export default function ProfileView({ p }: { p: any }) {
  const parent = p.parent || {};
  const med = p.medical || {};
  const initials = `${p.first_name?.[0] || ""}${p.last_name?.[0] || ""}`.toUpperCase();
  const hasPersonal = !!(
    p.dob || p.gender || p.blood_group || p.nationality || p.religion || p.category || p.mother_tongue || p.date_of_joining
  );
  const hasParent = !!(
    parent.father_name || parent.mother_name || parent.guardian_name || parent.primary_contact_email ||
    parent.address || parent.father_phone || parent.mother_phone || parent.guardian_phone
  );
  const hasMed = !!(med.allergies || med.chronic_conditions || med.doctor_name || med.doctor_phone);

  return (
    <div className="space-y-6">
      <div className="bg-surface-card rounded-card border border-border shadow-sm p-6 flex items-center gap-5">
        {p.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photo_url} alt="" className="w-20 h-20 rounded-2xl object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-2xl font-bold">
            {initials || "S"}
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold text-ink">
            {p.first_name} {p.last_name}
          </h2>
          <p className="text-ink-muted mt-1">
            {[p.class_name && `Class ${p.class_name}`, p.section_name && `Sec ${p.section_name}`]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
          <div className="flex flex-wrap gap-2 mt-2 text-sm">
            {p.admission_number ? (
              <span className="px-2.5 py-1 rounded-full bg-surface text-ink-muted">
                Adm: {p.admission_number}
              </span>
            ) : null}
            {p.status ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                {p.status}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {hasPersonal && (
        <Section title="Personal details">
          <Row label="Date of birth" value={fmtDate(p.dob)} />
          <Row label="Gender" value={p.gender} />
          <Row label="Blood group" value={p.blood_group} />
          <Row label="Nationality" value={p.nationality} />
          <Row label="Religion" value={p.religion} />
          <Row label="Category" value={p.category} />
          <Row label="Mother tongue" value={p.mother_tongue} />
          <Row label="Date of joining" value={fmtDate(p.date_of_joining)} />
        </Section>
      )}

      {hasParent && (
        <Section title="Parent / Guardian">
          <Row label="Father" value={parent.father_name} />
          <Row label="Father phone" value={parent.father_phone} />
          <Row label="Mother" value={parent.mother_name} />
          <Row label="Mother phone" value={parent.mother_phone} />
          <Row label="Guardian" value={parent.guardian_name} />
          <Row label="Guardian phone" value={parent.guardian_phone} />
          <Row label="Contact email" value={parent.primary_contact_email} />
          <Row label="Address" value={parent.address} />
        </Section>
      )}

      {hasMed && (
        <Section title="Medical">
          <Row label="Allergies" value={med.allergies} />
          <Row label="Chronic conditions" value={med.chronic_conditions} />
          <Row label="Doctor" value={med.doctor_name} />
          <Row label="Doctor phone" value={med.doctor_phone} />
        </Section>
      )}
    </div>
  );
}

"use client";
import React from "react";
import { User, Phone, Mail, MapPin, HeartPulse, Shield, Calendar, Droplets, Globe, Book, Hash, Activity } from "lucide-react";

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;

function Row({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-surface/50 transition-colors duration-200">
      <div className="flex items-center gap-3 text-ink-muted shrink-0">
        {Icon && <Icon className="w-4 h-4 opacity-70" />}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-ink font-semibold text-sm text-right break-words">{value}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children, delay = 0 }: { title: string; icon?: React.ElementType; children: React.ReactNode; delay?: number }) {
  return (
    <div 
      className="bg-surface-card rounded-2xl border border-border shadow-sm overflow-hidden animate-fade-in"
      style={{ animationFillMode: "both", animationDelay: `${delay}ms` }}
    >
      <div className="px-6 py-4 border-b border-border/60 bg-surface/30">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="p-1.5 rounded-lg bg-primary-50 text-primary-600">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <h3 className="font-semibold text-ink text-base">{title}</h3>
        </div>
      </div>
      <div className="divide-y divide-border/40">
        {children}
      </div>
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
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Card */}
      <div className="relative bg-surface-card rounded-3xl border border-border shadow-soft overflow-hidden animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 via-transparent to-transparent opacity-100" />
        <div className="relative p-8 sm:p-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 text-center sm:text-left">
          {p.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photo_url} alt="" className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover ring-4 ring-primary-50 shadow-md" />
          ) : (
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center text-4xl font-bold shadow-md ring-4 ring-primary-50">
              {initials || "S"}
            </div>
          )}
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
                {p.first_name} {p.last_name}
              </h2>
              <p className="text-ink-muted mt-2 text-lg font-medium">
                {[p.class_name && `Class ${p.class_name}`, p.section_name && `Section ${p.section_name}`]
                  .filter(Boolean)
                  .join(" • ") || "—"}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4">
              {p.admission_number && (
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface border border-border text-ink-muted text-sm font-semibold">
                  <Hash className="w-4 h-4" />
                  <span>Adm: {p.admission_number}</span>
                </div>
              )}
              {p.status && (
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold uppercase tracking-wider">
                  <Shield className="w-4 h-4" />
                  <span>{p.status}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          {hasPersonal && (
            <Section title="Personal Details" icon={User} delay={100}>
              <Row icon={Calendar} label="Date of birth" value={fmtDate(p.dob)} />
              <Row icon={User} label="Gender" value={p.gender} />
              <Row icon={Droplets} label="Blood group" value={p.blood_group} />
              <Row icon={Globe} label="Nationality" value={p.nationality} />
              <Row icon={Book} label="Religion" value={p.religion} />
              <Row icon={Activity} label="Category" value={p.category} />
              <Row icon={Globe} label="Mother tongue" value={p.mother_tongue} />
              <Row icon={Calendar} label="Date of joining" value={fmtDate(p.date_of_joining)} />
            </Section>
          )}

          {hasMed && (
            <Section title="Medical Information" icon={HeartPulse} delay={200}>
              <Row icon={Activity} label="Allergies" value={med.allergies} />
              <Row icon={HeartPulse} label="Chronic conditions" value={med.chronic_conditions} />
              <Row icon={User} label="Doctor" value={med.doctor_name} />
              <Row icon={Phone} label="Doctor phone" value={med.doctor_phone} />
            </Section>
          )}
        </div>

        <div className="space-y-8">
          {hasParent && (
            <Section title="Parent & Guardian" icon={User} delay={150}>
              {parent.father_name && <Row icon={User} label="Father's Name" value={parent.father_name} />}
              {parent.father_phone && <Row icon={Phone} label="Father's Phone" value={parent.father_phone} />}
              {parent.mother_name && <Row icon={User} label="Mother's Name" value={parent.mother_name} />}
              {parent.mother_phone && <Row icon={Phone} label="Mother's Phone" value={parent.mother_phone} />}
              {parent.guardian_name && <Row icon={User} label="Guardian's Name" value={parent.guardian_name} />}
              {parent.guardian_phone && <Row icon={Phone} label="Guardian's Phone" value={parent.guardian_phone} />}
              {parent.primary_contact_email && <Row icon={Mail} label="Contact Email" value={parent.primary_contact_email} />}
              {parent.address && <Row icon={MapPin} label="Address" value={parent.address} />}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea, Label } from "@/components/ui/Input";
import { Info } from "lucide-react";
import {
  getAcademicYears,
  getClasses,
  getSectionsForClass,
  Class,
  Section,
  AcademicYear,
} from "@/lib/api/setup";

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-card rounded-card border border-border shadow-card p-6">
      <h2 className="text-base font-semibold text-ink mb-4">{title}</h2>
      {children}
    </section>
  );
}

type Setter = (k: string, v: string) => void;

/** One contact (Father / Mother / Guardian). */
function ContactBlock({
  title,
  prefix,
  data,
  set,
  extra,
  required,
}: {
  title: string;
  prefix: string;
  data: Record<string, string>;
  set: Setter;
  extra: { key: string; label: string; placeholder?: string };
  required?: boolean;
}) {
  const val = (k: string) => data[`${prefix}_${k}`] || "";
  const on = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(`${prefix}_${k}`, e.target.value);
  return (
    <>
      <p className="text-sm font-semibold text-ink mb-2">{title}</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <Label required={required}>Name</Label>
          <Input required={required} value={val("name")} onChange={on("name")} />
        </div>
        <div>
          <Label required={required}>Mobile</Label>
          <Input required={required} type="tel" value={val("phone")} onChange={on("phone")} />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={val("email")} onChange={on("email")} />
        </div>
        <div>
          <Label>{extra.label}</Label>
          <Input value={val(extra.key)} onChange={on(extra.key)} placeholder={extra.placeholder} />
        </div>
        <div>
          <Label>Religion</Label>
          <Input value={val("religion")} onChange={on("religion")} />
        </div>
        <div>
          <Label>Category</Label>
          <Input
            value={val("category")}
            onChange={on("category")}
            placeholder="General / OBC / SC / ST"
          />
        </div>
        <div>
          <Label>Nationality</Label>
          <Input value={val("nationality")} onChange={on("nationality")} placeholder="Indian" />
        </div>
        <div>
          <Label>Aadhaar No</Label>
          <Input value={val("aadhaar")} onChange={on("aadhaar")} placeholder="XXXX XXXX XXXX" />
        </div>
      </div>
    </>
  );
}

export const emptyStudentForm: Record<string, string> = {
  academic_year_id: "",
  current_class_id: "",
  current_section_id: "",
  date_of_joining: "",
  first_name: "",
  last_name: "",
  dob: "",
  gender: "",
  blood_group: "",
  nationality: "Indian",
  religion: "",
  category: "",
  mother_tongue: "",
  apaar_id: "",
  aadhaar_no: "",
  pen_number: "",
  allergies: "",
  address: "",
  father_name: "",
  father_phone: "",
  father_email: "",
  father_occupation: "",
  father_religion: "",
  father_category: "",
  father_nationality: "",
  father_aadhaar: "",
  mother_name: "",
  mother_phone: "",
  mother_email: "",
  mother_occupation: "",
  mother_religion: "",
  mother_category: "",
  mother_nationality: "",
  mother_aadhaar: "",
  guardian_name: "",
  guardian_phone: "",
  guardian_email: "",
  guardian_relation: "",
  guardian_religion: "",
  guardian_category: "",
  guardian_nationality: "",
  guardian_aadhaar: "",
};

/** Shared create/edit form. Builds the {student, parent, medical} payload and
 * hands it to onSubmit; the caller does the create or update API call. */
export function StudentForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: Record<string, string>;
  submitLabel: string;
  onSubmit: (payload: any) => Promise<void>;
}) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>(initial);
  const set: Setter = (k, v) => setFormData((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    Promise.all([getClasses(), getAcademicYears()]).then(([clsRes, yrRes]) => {
      setClasses(clsRes.data || []);
      setAcademicYears(yrRes.data || []);
      // Default to the active year only when creating (no year preselected).
      if (!formData.academic_year_id) {
        const activeYear = yrRes.data.find((y: any) => y.is_active);
        if (activeYear) setFormData((prev) => ({ ...prev, academic_year_id: activeYear.id }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (formData.current_class_id) {
      getSectionsForClass(formData.current_class_id).then((res) => setSections(res.data || []));
    } else {
      setSections([]);
    }
  }, [formData.current_class_id]);

  const buildPayload = () => {
    const f = formData;
    const parent: Record<string, any> = {
      address: f.address,
      primary_contact_email: f.father_email || f.mother_email || f.guardian_email,
    };
    for (const k of Object.keys(f)) {
      if (k.startsWith("father_") || k.startsWith("mother_") || k.startsWith("guardian_")) {
        parent[k] = f[k];
      }
    }
    return {
      first_name: f.first_name,
      last_name: f.last_name,
      dob: f.dob,
      date_of_joining: f.date_of_joining || undefined,
      gender: f.gender,
      blood_group: f.blood_group,
      nationality: f.nationality,
      religion: f.religion,
      category: f.category,
      mother_tongue: f.mother_tongue,
      apaar_id: f.apaar_id,
      aadhaar_no: f.aadhaar_no,
      pen_number: f.pen_number,
      current_class_id: f.current_class_id,
      current_section_id: f.current_section_id,
      academic_year_id: f.academic_year_id,
      parent,
      medical: { allergies: f.allergies },
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(buildPayload());
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <FormSection title="Academic Details">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <Label required>Academic Year</Label>
            <Select
              required
              value={formData.academic_year_id}
              onChange={(e) => set("academic_year_id", e.target.value)}
            >
              <option value="">Select Year</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {(y as any).is_active ? " (Active)" : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label required>Class</Label>
            <Select
              required
              value={formData.current_class_id}
              onChange={(e) => {
                set("current_class_id", e.target.value);
                set("current_section_id", "");
              }}
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label required>Section</Label>
            <Select
              required
              value={formData.current_section_id}
              onChange={(e) => set("current_section_id", e.target.value)}
            >
              <option value="">Select Section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Date of Joining</Label>
            <Input
              type="date"
              value={formData.date_of_joining}
              onChange={(e) => set("date_of_joining", e.target.value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Student Personal Details">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <Label required>First Name</Label>
            <Input
              required
              value={formData.first_name}
              onChange={(e) => set("first_name", e.target.value)}
            />
          </div>
          <div>
            <Label required>Last Name</Label>
            <Input
              required
              value={formData.last_name}
              onChange={(e) => set("last_name", e.target.value)}
            />
          </div>
          <div>
            <Label required>Date of Birth</Label>
            <Input
              required
              type="date"
              value={formData.dob}
              onChange={(e) => set("dob", e.target.value)}
            />
          </div>
          <div>
            <Label>Gender</Label>
            <Select value={formData.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </Select>
          </div>
          <div>
            <Label>Blood Group</Label>
            <Input
              value={formData.blood_group}
              onChange={(e) => set("blood_group", e.target.value)}
              placeholder="O+"
            />
          </div>
          <div>
            <Label>Mother Tongue</Label>
            <Input
              value={formData.mother_tongue}
              onChange={(e) => set("mother_tongue", e.target.value)}
              placeholder="Hindi"
            />
          </div>
          <div>
            <Label>Religion</Label>
            <Input value={formData.religion} onChange={(e) => set("religion", e.target.value)} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={formData.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Select</option>
              <option value="General">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="EWS">EWS</option>
            </Select>
          </div>
          <div>
            <Label>Nationality</Label>
            <Input
              value={formData.nationality}
              onChange={(e) => set("nationality", e.target.value)}
              placeholder="Indian"
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Identifiers (Govt. / Academic)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <Label>APAAR ID</Label>
            <Input
              value={formData.apaar_id}
              onChange={(e) => set("apaar_id", e.target.value)}
              placeholder="12-digit APAAR / ABC ID"
            />
          </div>
          <div>
            <Label>Aadhaar Number</Label>
            <Input
              value={formData.aadhaar_no}
              onChange={(e) => set("aadhaar_no", e.target.value)}
              placeholder="XXXX XXXX XXXX"
            />
          </div>
          <div>
            <Label>PEN</Label>
            <Input
              value={formData.pen_number}
              onChange={(e) => set("pen_number", e.target.value)}
              placeholder="Permanent Education Number"
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Contacts">
        <div className="flex items-start gap-2 text-sm text-info-text bg-info-bg border border-info-border rounded-input px-3 py-2 mb-5">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>
            The first available email and phone (Father → Mother → Guardian) are used for the Parent
            Portal login and WhatsApp alerts.
          </p>
        </div>

        <ContactBlock
          title="Father"
          prefix="father"
          data={formData}
          set={set}
          extra={{ key: "occupation", label: "Occupation" }}
          required
        />
        <ContactBlock
          title="Mother"
          prefix="mother"
          data={formData}
          set={set}
          extra={{ key: "occupation", label: "Occupation" }}
        />
        <ContactBlock
          title="Guardian (if applicable)"
          prefix="guardian"
          data={formData}
          set={set}
          extra={{ key: "relation", label: "Relation", placeholder: "Uncle / Grandfather" }}
        />

        <div>
          <Label>Residential Address</Label>
          <Textarea
            rows={2}
            value={formData.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </div>
      </FormSection>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

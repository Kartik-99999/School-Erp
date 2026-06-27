"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Edit,
  Download,
  GraduationCap,
  Phone,
  Mail,
  MapPin,
  HeartPulse,
  ShieldAlert,
  FileText,
  Upload,
  Trophy,
  Trash2,
} from "lucide-react";

export default function StudentProfileDeepDive() {
  const { id } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [activities, setActivities] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [docType, setDocType] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoUploading(true);
    try {
      const form = new FormData();
      form.append("file", f);
      await api.post(`/students/${id}/photo`, form);
      await fetchProfile();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to upload photo");
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    fetchProfile();
    loadDocuments();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/students/${id}`);
      setStudent(res.data.data);
      api
        .get(`/activities/student/${id}`)
        .then((r) => setActivities(r.data.data))
        .catch(() => setActivities(null));
    } catch (err) {
      console.error(err);
      alert("Failed to load student profile");
      router.push("/admin/students");
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const res = await api.get(`/students/${id}/documents`);
      setDocuments(res.data.data || []);
    } catch {
      setDocuments([]);
    }
  };

  const handleUploadDocument = async () => {
    if (!docType.trim() || (!docFile && !docUrl.trim())) {
      return alert("Enter a document type and choose a file or paste a URL.");
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("document_type", docType.trim());
      if (docFile) form.append("file", docFile);
      else if (docUrl.trim()) form.append("document_url", docUrl.trim());
      await api.post(`/students/${id}/documents`, form);
      setShowUpload(false);
      setDocType("");
      setDocUrl("");
      setDocFile(null);
      loadDocuments();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add document");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Remove this document?")) return;
    await api.delete(`/students/${id}/documents/${docId}`);
    setDocuments((d) => d.filter((x) => x.id !== docId));
  };

  const handleDownloadBonafide = async () => {
    try {
      const res = await api.get(`/students/${id}/certificates/bonafide`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Bonafide_${student.admission_number || "Cert"}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      alert("Failed to generate certificate.");
    }
  };

  if (loading) return <div className="p-8 text-ink-muted">Loading comprehensive profile...</div>;
  if (!student) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/admin/students")}
          className="flex items-center gap-2 text-ink-muted hover:text-ink font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Directory
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadBonafide}
            className="px-4 py-2 bg-surface-card border border-border text-ink rounded-xl font-bold hover:bg-surface transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Bonafide Certificate
          </button>
          <button
            onClick={() => router.push(`/admin/students/${id}/edit`)}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" /> Edit Profile
          </button>
        </div>
      </div>

      {/* Main Profile Header */}
      <div className="bg-surface-card rounded-card p-8 shadow-sm border border-border flex flex-col md:flex-row gap-8 items-start">
        <label
          className="relative w-32 h-32 rounded-card bg-surface flex-shrink-0 flex items-center justify-center overflow-hidden border border-border cursor-pointer group"
          title="Click to change photo"
        >
          {student.photo_url ? (
            <img src={student.photo_url} alt="Student" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-bold text-ink-faint">
              {student.first_name[0]}
              {student.last_name[0]}
            </span>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold text-center px-1">
            {photoUploading ? "Uploading…" : "Change photo"}
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
            disabled={photoUploading}
          />
        </label>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-ink">
              {student.first_name} {student.last_name}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${student.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
            >
              {student.status}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
            <div>
              <p className="text-xs text-ink-muted uppercase font-bold tracking-wider">
                Admission No
              </p>
              <p className="font-medium text-ink mt-1">{student.admission_number || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted uppercase font-bold tracking-wider">
                Class & Section
              </p>
              <p className="font-medium text-ink mt-1">
                {student.class_name || "N/A"} - {student.section_name || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-muted uppercase font-bold tracking-wider">
                Date of Birth
              </p>
              <p className="font-medium text-ink mt-1">{student.dob}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted uppercase font-bold tracking-wider">
                Blood Group
              </p>
              <p className="font-medium text-ink mt-1">{student.blood_group || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted uppercase font-bold tracking-wider">
                Date of Joining
              </p>
              <p className="font-medium text-ink mt-1">{student.date_of_joining || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted uppercase font-bold tracking-wider">APAAR ID</p>
              <p className="font-medium text-ink mt-1">{student.apaar_id || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted uppercase font-bold tracking-wider">
                Aadhaar No
              </p>
              <p className="font-medium text-ink mt-1">{student.aadhaar_no || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted uppercase font-bold tracking-wider">PEN</p>
              <p className="font-medium text-ink mt-1">{student.pen_number || "N/A"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Parents & Medical */}
        <div className="space-y-8 lg:col-span-1">
          {/* Parents Info */}
          <div className="bg-surface-card rounded-card p-6 shadow-sm border border-border">
            <h3 className="text-lg font-bold text-ink mb-6 flex items-center gap-2 border-b border-border pb-4">
              <Phone className="w-5 h-5 text-blue-500" /> Parent / Guardian
            </h3>
            {student.parent ? (
              <div className="space-y-4">
                {["father", "mother", "guardian"]
                  .map((p) => {
                    const g = (k: string) => student.parent[`${p}_${k}`];
                    return {
                      label: p.charAt(0).toUpperCase() + p.slice(1),
                      name: g("name"),
                      phone: g("phone"),
                      email: g("email"),
                      extra: g(p === "guardian" ? "relation" : "occupation"),
                      meta: [
                        ["Religion", g("religion")],
                        ["Category", g("category")],
                        ["Nationality", g("nationality")],
                        ["Aadhaar", g("aadhaar")],
                      ].filter(([, v]) => v) as [string, string][],
                    };
                  })
                  .filter((c) => c.name || c.phone || c.email)
                  .map((c) => (
                    <div key={c.label}>
                      <p className="text-xs text-ink-muted font-bold">
                        {c.label}
                        {c.extra ? ` · ${c.extra}` : ""}
                      </p>
                      <p className="text-sm font-medium text-ink">{c.name || "N/A"}</p>
                      {c.phone && (
                        <p className="text-sm text-ink-muted flex items-center gap-2">
                          <Phone className="w-3 h-3" /> {c.phone}
                        </p>
                      )}
                      {c.email && (
                        <p className="text-sm text-ink-muted flex items-center gap-2">
                          <Mail className="w-3 h-3" /> {c.email}
                        </p>
                      )}
                      {c.meta.length > 0 && (
                        <p className="text-xs text-ink-faint mt-0.5">
                          {c.meta.map(([k, v]) => `${k}: ${v}`).join("  ·  ")}
                        </p>
                      )}
                    </div>
                  ))}
                <div>
                  <p className="text-xs text-ink-muted font-bold">Login Email</p>
                  <p className="text-sm font-medium text-ink flex items-center gap-2">
                    <Mail className="w-3 h-3" /> {student.parent.primary_contact_email || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted font-bold">Residential Address</p>
                  <p className="text-sm font-medium text-ink flex items-start gap-2 mt-1">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-ink-faint" />
                    {student.parent.address || "Address not provided"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">No parent data linked.</p>
            )}
          </div>

          {/* Medical Info */}
          <div className="bg-surface-card rounded-card p-6 shadow-sm border border-border">
            <h3 className="text-lg font-bold text-ink mb-6 flex items-center gap-2 border-b border-border pb-4">
              <HeartPulse className="w-5 h-5 text-rose-500" /> Medical Records
            </h3>
            {student.medical ? (
              <div className="space-y-4">
                {student.medical.allergies && (
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-xs text-red-600 font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Allergies
                    </p>
                    <p className="text-sm font-medium text-red-900 mt-1">
                      {student.medical.allergies}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-ink-muted font-bold">Chronic Conditions</p>
                  <p className="text-sm font-medium text-ink">
                    {student.medical.chronic_conditions || "None reported"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-muted font-bold">Family Doctor</p>
                  <p className="text-sm font-medium text-ink">
                    {student.medical.doctor_name || "N/A"} ({student.medical.doctor_phone || "N/A"})
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">No medical records on file.</p>
            )}
          </div>

          {/* Co-curricular */}
          <div className="bg-surface-card rounded-card p-6 shadow-sm border border-border">
            <h3 className="text-lg font-bold text-ink mb-6 flex items-center gap-2 border-b border-border pb-4">
              <Trophy className="w-5 h-5 text-amber-500" /> Co-curricular
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-ink-muted font-bold">House</p>
                {activities?.house ? (
                  <span
                    className="inline-flex items-center gap-2 text-sm font-medium text-ink mt-1"
                    style={{ color: activities.house.color || undefined }}
                  >
                    ● {activities.house.name}{" "}
                    <span className="text-ink-muted">({activities.house.points} pts)</span>
                  </span>
                ) : (
                  <p className="text-sm text-ink-muted">Not assigned</p>
                )}
              </div>
              <div>
                <p className="text-xs text-ink-muted font-bold">Clubs</p>
                {activities?.clubs?.length ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activities.clubs.map((c: any) => (
                      <span
                        key={c.id}
                        className="text-xs bg-surface border border-border rounded-badge px-2 py-0.5 text-ink"
                      >
                        {c.name}
                        {c.role && c.role !== "Member" ? ` · ${c.role}` : ""}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted">None</p>
                )}
              </div>
              <div>
                <p className="text-xs text-ink-muted font-bold">Sports</p>
                {activities?.sports?.length ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {activities.sports.map((s: any) => (
                      <span
                        key={s.id}
                        className="text-xs bg-surface border border-border rounded-badge px-2 py-0.5 text-ink"
                      >
                        {s.name}
                        {s.team ? ` · ${s.team}` : ""}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted">None</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Academics & Documents */}
        <div className="space-y-8 lg:col-span-2">
          {/* Document Storage Locker */}
          <div className="bg-surface-card rounded-card p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" /> Digital Document Locker
              </h3>
              <button
                onClick={() => setShowUpload(true)}
                className="text-sm font-bold text-primary-600 flex items-center gap-1 hover:text-primary-700"
              >
                <Upload className="w-4 h-4" /> Upload Document
              </button>
            </div>

            {documents.length === 0 ? (
              <p className="text-sm text-ink-muted">No documents uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-4 border border-border rounded-xl hover:shadow-md transition-shadow group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink truncate">
                        {doc.document_type || "Document"}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {(doc.created_at || "").slice(0, 10)}
                      </p>
                    </div>
                    <a
                      href={doc.document_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink-faint hover:text-primary-600"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="text-ink-faint hover:text-danger-text"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        title="Upload Document"
        description="Attach a file (stored securely) or reference an existing URL."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowUpload(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadDocument} disabled={uploading}>
              {uploading ? "Adding..." : "Add Document"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <Label required>Document type</Label>
            <Input
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              placeholder="Birth Certificate, Aadhaar, Report Card…"
              autoFocus
            />
          </div>
          <div>
            <Label>File</Label>
            <input
              type="file"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-input file:border-0 file:bg-surface file:px-3 file:py-2 file:text-ink"
            />
          </div>
          <div className="text-center text-xs text-ink-faint">— or —</div>
          <div>
            <Label>Document URL</Label>
            <Input
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

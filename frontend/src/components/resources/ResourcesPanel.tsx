"use client";
import React, { useEffect, useState } from "react";
import { FolderOpen, Upload, Trash2, ExternalLink, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, Select } from "@/components/ui/Input";
import { listResources, createResource, deleteResource, type Resource } from "@/lib/api/resources";
import { getClasses, getSubjects, type Class, type Subject } from "@/lib/api/setup";

const CATEGORIES = ["Study Material", "Syllabus", "Circular", "Other"];
const AUDIENCES = ["All", "Staff", "Students", "Parents", "Specific Class"];

const chip = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
    active
      ? "bg-primary-600 text-white border-primary-600"
      : "bg-surface-card text-ink-muted border-border hover:border-border-strong"
  }`;

const blankForm = {
  title: "",
  description: "",
  category: "Study Material",
  target_audience: "All",
  target_class_id: "",
  subject_id: "",
  external_url: "",
};

/**
 * Shared resources library panel. Read-only for students/parents; with `canManage` it adds an
 * upload form + per-row delete (teacher/admin). The list is already audience-filtered server-side.
 */
export default function ResourcesPanel({ canManage = false }: { canManage?: boolean }) {
  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [form, setForm] = useState<any>({ ...blankForm });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (cat: string) => {
    setLoading(true);
    try {
      setItems(await listResources(cat || undefined));
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Couldn't load resources.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
  }, [filter]);

  useEffect(() => {
    if (!canManage) return;
    (async () => {
      try {
        setClasses((await getClasses()).data || []);
      } catch {
        /* ignore */
      }
      try {
        setSubjects((await getSubjects()).data || []);
      } catch {
        /* ignore */
      }
    })();
  }, [canManage]);

  const setF = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!file && !form.external_url.trim()) {
      setError("Attach a file or provide an external URL.");
      return;
    }
    setBusy(true);
    try {
      await createResource({
        title: form.title,
        description: form.description || undefined,
        category: form.category,
        target_audience: form.target_audience,
        target_class_id:
          form.target_audience === "Specific Class" ? form.target_class_id || undefined : undefined,
        subject_id: form.subject_id || undefined,
        external_url: form.external_url || undefined,
        file,
      });
      setMessage("Resource uploaded.");
      setForm({ ...blankForm });
      setFile(null);
      await load(filter);
    } catch (e: any) {
      const d = e?.response?.data?.detail;
      setError(
        Array.isArray(d)
          ? d
              .map((x: any) => x?.msg)
              .filter(Boolean)
              .join("; ")
          : d || "Upload failed."
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this resource?")) return;
    try {
      await deleteResource(id);
      await load(filter);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Couldn't delete the resource.");
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-primary-600" /> Resources
        </h2>
        <p className="text-ink-muted mt-1">Study materials, syllabi, circulars and documents.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}
      {message && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
          {message}
        </div>
      )}

      {canManage && (
        <form
          onSubmit={submit}
          className="bg-surface-card rounded-card border border-border shadow-card p-6 space-y-4"
        >
          <h3 className="text-base font-semibold text-ink flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload a resource
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Title</Label>
              <Input required value={form.title} onChange={(e) => setF("title", e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onChange={(e) => setF("category", e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Audience</Label>
              <Select
                value={form.target_audience}
                onChange={(e) => setF("target_audience", e.target.value)}
              >
                {AUDIENCES.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </Select>
            </div>
            {form.target_audience === "Specific Class" && (
              <div>
                <Label>Class</Label>
                <Select
                  value={form.target_class_id}
                  onChange={(e) => setF("target_class_id", e.target.value)}
                >
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label>Subject (optional)</Label>
              <Select value={form.subject_id} onChange={(e) => setF("subject_id", e.target.value)}>
                <option value="">None</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Description (optional)</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setF("description", e.target.value)}
              />
            </div>
            <div>
              <Label>File (optional)</Label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-ink-muted file:mr-3 file:py-2 file:px-3 file:rounded-btn file:border-0 file:bg-primary-50 file:text-primary-700 file:text-sm file:font-medium"
              />
            </div>
            <div>
              <Label>External URL (optional)</Label>
              <Input
                placeholder="https://..."
                value={form.external_url}
                onChange={(e) => setF("external_url", e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-ink-muted">
            Allowed files: pdf, doc(x), ppt(x), xls(x), images, txt, zip — up to 15 MB. Provide a
            file or an external URL.
          </p>
          <Button type="submit" disabled={busy}>
            {busy ? "Uploading…" : "Upload resource"}
          </Button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter("")} className={chip(filter === "")}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={chip(filter === c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="bg-surface-card rounded-card border border-border shadow-card divide-y divide-border">
        {loading ? (
          <div className="p-6 text-sm text-ink-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-ink-muted text-sm">No resources here yet.</div>
        ) : (
          items.map((r) => (
            <div key={r.id} className="p-4 flex items-start gap-3">
              <FileText className="w-5 h-5 text-ink-faint mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-ink">{r.title}</p>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                    {r.category}
                  </span>
                  <span className="text-[11px] text-ink-faint">{r.target_audience}</span>
                </div>
                {r.description && <p className="text-sm text-ink-muted mt-0.5">{r.description}</p>}
                <div className="flex items-center gap-4 mt-2 text-sm">
                  {r.file_url && (
                    <a
                      href={r.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" /> {r.file_name || "Download"}
                    </a>
                  )}
                  {r.external_url && (
                    <a
                      href={r.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-4 h-4" /> Open link
                    </a>
                  )}
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => remove(r.id)}
                  title="Delete"
                  className="p-2 rounded-btn text-ink-faint hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

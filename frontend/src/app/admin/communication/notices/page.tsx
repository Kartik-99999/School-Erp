"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getNotices, createNotice, togglePinNotice } from "@/lib/api/communication";
import { getClasses, Class } from "@/lib/api/setup";
import { Pin, Megaphone, Plus } from "lucide-react";

export default function NoticeboardPage() {
  const pathname = usePathname();

  const [notices, setNotices] = useState<any[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    target_audience: "All",
    target_class_id: "",
    is_pinned: false,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [nRes, cRes] = await Promise.all([getNotices(), getClasses()]);
      setNotices(nRes.data || []);
      setClasses(cRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createNotice({
        ...form,
        target_class_id: form.target_class_id || undefined,
      });
      setIsModalOpen(false);
      setForm({
        title: "",
        body: "",
        target_audience: "All",
        target_class_id: "",
        is_pinned: false,
      });
      loadData();
    } catch (err) {
      alert("Failed to create notice.");
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (id: string, current: boolean) => {
    try {
      await togglePinNotice(id, !current);
      loadData();
    } catch (err) {
      alert("Failed to pin/unpin notice.");
    }
  };

  return (
    <div className="pb-12">
      <div className="flex gap-4 border-b mb-6 pb-2">
        <Link
          href="/admin/communication/notices"
          className={`font-semibold ${pathname === "/admin/communication/notices" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Noticeboard
        </Link>
        <Link
          href="/admin/communication/broadcast"
          className={`font-semibold ${pathname === "/admin/communication/broadcast" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Broadcast Messages
        </Link>
        <Link
          href="/admin/communication/events"
          className={`font-semibold ${pathname === "/admin/communication/events" ? "text-primary-600 border-b-2 border-primary-600" : "text-ink-muted"}`}
        >
          Event Calendar
        </Link>
      </div>

      <PageHeader
        title="School Noticeboard"
        description="Publish announcements to the digital noticeboard for students, parents, and staff."
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Notice
          </button>
        }
      />

      {loading ? (
        <div className="py-12 text-center text-ink-muted">Loading notices...</div>
      ) : notices.length === 0 ? (
        <div className="text-center py-16 bg-surface-card rounded-xl border border-dashed text-ink-faint">
          <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
          No active notices. Create one to broadcast to the school.
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className={`bg-surface-card rounded-xl shadow-sm border p-6 flex gap-4 ${notice.is_pinned ? "border-blue-400 bg-primary-50/50" : "border-border"}`}
            >
              <button
                onClick={() => togglePin(notice.id, notice.is_pinned)}
                className={`mt-1 shrink-0 ${notice.is_pinned ? "text-primary-600" : "text-ink-faint hover:text-ink-muted"}`}
                title={notice.is_pinned ? "Unpin Notice" : "Pin Notice"}
              >
                <Pin className={`w-5 h-5 ${notice.is_pinned ? "fill-current" : ""}`} />
              </button>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-ink">{notice.title}</h3>
                  <span className="text-xs bg-surface text-ink px-2 py-1 rounded font-medium">
                    To: {notice.target_audience} {notice.target_class_id ? "(Class Specific)" : ""}
                  </span>
                </div>
                <p className="text-sm text-ink-muted mb-3">
                  {new Date(notice.created_at).toLocaleString()}
                </p>
                <div className="text-ink whitespace-pre-wrap">{notice.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-lg p-6 w-full max-w-2xl shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Create Notice</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  required
                  type="text"
                  className="w-full border rounded p-2"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message Body</label>
                <textarea
                  required
                  rows={5}
                  className="w-full border rounded p-2"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Target Audience</label>
                  <select
                    className="w-full border rounded p-2"
                    value={form.target_audience}
                    onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                  >
                    <option value="All">All School</option>
                    <option value="Staff">Staff Only</option>
                    <option value="Parents">Parents Only</option>
                    <option value="Class">Specific Class</option>
                  </select>
                </div>
                {form.target_audience === "Class" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Target Class</label>
                    <select
                      required
                      className="w-full border rounded p-2"
                      value={form.target_class_id}
                      onChange={(e) => setForm({ ...form, target_class_id: e.target.value })}
                    >
                      <option value="">Select</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_pinned"
                  checked={form.is_pinned}
                  onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                />
                <label htmlFor="is_pinned" className="text-sm font-medium">
                  Pin this notice to the top
                </label>
              </div>
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded font-medium text-ink-muted hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary-600 text-white rounded font-medium disabled:opacity-50"
                >
                  {saving ? "Publishing..." : "Publish Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { getMessageLogs, sendBroadcast } from "@/lib/api/communication";
import { getClasses, Class } from "@/lib/api/setup";
import { MessageSquare, Send, History } from "lucide-react";

export default function BroadcastMessagingPage() {
  const pathname = usePathname();

  const [logs, setLogs] = useState<any[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  // Broadcast Form
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    channel: "WhatsApp",
    recipient_type: "Parents",
    target_class_id: "",
    subject: "",
    message_content: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [lRes, cRes] = await Promise.all([getMessageLogs(), getClasses()]);
      setLogs(lRes.data || []);
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

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await sendBroadcast({
        ...form,
        target_class_id: form.target_class_id || undefined,
        subject: form.channel === "Email" ? form.subject : undefined,
      });
      alert(res.message);
      setForm({ ...form, message_content: "", subject: "" });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Broadcast failed.");
    } finally {
      setSending(false);
    }
  };

  const columns = [
    { accessorKey: "channel", header: "Channel" },
    { accessorKey: "recipient_type", header: "Target Audience" },
    { accessorKey: "recipient_count", header: "Recipients Reached" },
    {
      accessorKey: "created_at",
      header: "Sent On",
      cell: ({ row }: any) => new Date(row.original.created_at).toLocaleString(),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <span
          className={`font-bold ${row.original.status === "Sent" ? "text-green-600" : "text-red-600"}`}
        >
          {row.original.status}
        </span>
      ),
    },
  ];

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
        title="Direct Broadcast Messaging"
        description="Send direct WhatsApp and Email blasts to large groups of parents or staff."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Col: Composer */}
        <div className="bg-surface-card rounded-xl shadow-sm border border-border p-6 self-start">
          <h3 className="text-lg font-bold text-ink border-b pb-3 mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary-600" /> Compose Broadcast
          </h3>

          <form onSubmit={handleBroadcast} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Communication Channel</label>
                <select
                  className="w-full border rounded p-2 bg-primary-50"
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Target Group</label>
                <select
                  className="w-full border rounded p-2"
                  value={form.recipient_type}
                  onChange={(e) => setForm({ ...form, recipient_type: e.target.value })}
                >
                  <option value="Parents">All Parents</option>
                  <option value="Staff">All Staff</option>
                  <option value="Class">Specific Class (Parents)</option>
                </select>
              </div>
            </div>

            {form.recipient_type === "Class" && (
              <div>
                <label className="block text-sm font-medium mb-1">Select Target Class</label>
                <select
                  required
                  className="w-full border rounded p-2"
                  value={form.target_class_id}
                  onChange={(e) => setForm({ ...form, target_class_id: e.target.value })}
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.channel === "Email" && (
              <div>
                <label className="block text-sm font-medium mb-1">Subject Line</label>
                <input
                  required
                  type="text"
                  className="w-full border rounded p-2"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Message Content</label>
              <textarea
                required
                rows={6}
                className="w-full border rounded p-2"
                value={form.message_content}
                onChange={(e) => setForm({ ...form, message_content: e.target.value })}
                placeholder="Write your message here. For WhatsApp, keep it concise."
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full bg-primary-600 text-white p-3 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? "Dispatching..." : "Send Broadcast"}
            </button>
          </form>
        </div>

        {/* Right Col: Logs */}
        <div className="bg-surface-card rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-[calc(100vh-250px)]">
          <div className="p-4 bg-surface border-b flex justify-between items-center">
            <h3 className="font-bold text-ink flex items-center gap-2">
              <History className="w-4 h-4" /> Broadcast History
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-12 text-center text-ink-muted">Loading history...</div>
            ) : (
              <DataTable columns={columns} data={logs} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

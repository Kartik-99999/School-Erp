"use client";
import React, { useEffect, useState } from "react";
import api from "@/lib/axios";
import {
  MessageSquare,
  Bell,
  Mail,
  Search,
  Send,
  CheckCircle,
  XCircle,
  Megaphone,
  FileText,
  Image as ImageIcon,
  AlertCircle,
} from "lucide-react";

export default function AdminCommunicationPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"logs" | "publish">("logs");
  const [postType, setPostType] = useState("Notice");
  const [feedTitle, setFeedTitle] = useState("");
  const [feedBody, setFeedBody] = useState("");
  const [feedAudience, setFeedAudience] = useState("All");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const handlePublishFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);
    try {
      await api.post("/communication/notices", {
        title: feedTitle,
        body: feedBody,
        target_audience: feedAudience,
        is_pinned: false,
      });
      alert("Published to School Feed successfully!");
      setFeedTitle("");
      setFeedBody("");
      setView("logs");
    } catch (err) {
      console.error(err);
      alert("Failed to publish to feed.");
    } finally {
      setPublishing(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await api.get("/communication/broadcast/logs");
      setLogs(res.data.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load broadcast logs");
    } finally {
      setLoading(false);
    }
  };

  const smsCount = logs
    .filter((l) => l.channel === "WhatsApp" || l.channel === "SMS")
    .reduce((acc, curr) => acc + curr.recipient_count, 0);
  const emailCount = logs
    .filter((l) => l.channel === "Email")
    .reduce((acc, curr) => acc + curr.recipient_count, 0);

  if (view === "publish") {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in slide-in-from-bottom-4 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-ink">Publish to School Feed</h2>
            <p className="text-ink-muted mt-1">
              Post official notices, circulars, and announcements directly to the Student Portal.
            </p>
          </div>
          <button
            onClick={() => setView("logs")}
            className="px-4 py-2 text-ink-muted bg-surface-card border border-border hover:bg-surface rounded-xl font-bold"
          >
            Back to Logs
          </button>
        </div>

        <div className="bg-surface-card rounded-card border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-surface/50 flex flex-wrap gap-4 items-center">
            <p className="text-sm font-bold text-ink w-full sm:w-auto">Select Post Type:</p>
            <div className="flex flex-wrap gap-2">
              {["Circular", "Notice", "Announcement", "Gallery"].map((type) => (
                <button
                  key={type}
                  onClick={() => setPostType(type)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all
                    ${postType === type ? "bg-primary-600 text-white shadow-md shadow-blue-200" : "bg-surface-card text-ink-muted border border-border hover:bg-surface"}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <form className="p-6 md:p-8 space-y-6" onSubmit={handlePublishFeed}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-ink mb-2">Post Title</label>
                <input
                  type="text"
                  placeholder="e.g., Winter Vacation Schedule 2023"
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  value={feedTitle}
                  onChange={(e) => setFeedTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-ink mb-2">Target Audience</label>
                <select
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  value={feedAudience}
                  onChange={(e) => setFeedAudience(e.target.value)}
                >
                  <option value="All">Entire School (All Students & Parents)</option>
                  <option value="Students">Students</option>
                  <option value="Parents">Parents</option>
                  <option value="Staff">Staff Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-ink mb-2">Schedule Publish</label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-ink mb-2">
                  Official Message / Description
                </label>
                <textarea
                  rows={5}
                  placeholder="Type the official announcement here..."
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  value={feedBody}
                  onChange={(e) => setFeedBody(e.target.value)}
                  required
                ></textarea>
              </div>
            </div>

            <div className="p-6 border-2 border-dashed border-border rounded-card bg-surface/50 hover:bg-surface transition-colors text-center cursor-pointer group">
              {postType === "Gallery" ? (
                <>
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-ink">Upload Event Photos</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Select multiple images to create a gallery.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-ink">Attach Official Document</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Upload PDF or DOCX (e.g., official letterhead circular).
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 p-4 bg-primary-50 border border-primary-100 rounded-xl">
              <AlertCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
              <p className="text-sm text-primary-700 font-medium">
                Publishing this will immediately push a push notification to all targeted mobile app
                users.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                type="submit"
                disabled={publishing}
                className="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-60"
              >
                <Send className="w-4 h-4" /> {publishing ? "Publishing..." : "Publish to Feed"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Communication Hub</h2>
          <p className="text-ink-muted mt-1">
            Send SMS/Emails and publish notices to the School Feed.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setView("publish")}
            className="px-4 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-lg shadow-sm"
          >
            <Megaphone className="w-4 h-4" /> Post to School Feed
          </button>
          <button className="px-4 py-2.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-200">
            <Send className="w-4 h-4" /> Send SMS / Email
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-card p-6 rounded-card border border-border shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Bell className="w-16 h-16 text-primary-600" />
          </div>
          <p className="text-sm font-medium text-ink-muted mb-2">Total Broadcasts Sent</p>
          <p className="text-3xl font-bold text-ink">{logs.length}</p>
        </div>
        <div className="bg-surface-card p-6 rounded-card border border-border shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <MessageSquare className="w-16 h-16 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-ink-muted mb-2">WhatsApp / SMS Delivered</p>
          <p className="text-3xl font-bold text-emerald-600">{smsCount}</p>
        </div>
        <div className="bg-surface-card p-6 rounded-card border border-border shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Mail className="w-16 h-16 text-purple-600" />
          </div>
          <p className="text-sm font-medium text-ink-muted mb-2">Emails Delivered</p>
          <p className="text-3xl font-bold text-purple-600">{emailCount}</p>
        </div>
      </div>

      <div className="bg-surface-card rounded-card shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">Recent Direct Broadcasts (SMS/Email)</h3>
          <div className="relative w-64">
            <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs..."
              className="pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-ink-muted">Loading communication logs...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface/50">
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Channel
                </th>
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Audience
                </th>
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Message Preview
                </th>
                <th className="p-4 text-xs font-bold text-ink-muted uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log, idx) => (
                <tr key={idx} className="hover:bg-surface transition-colors">
                  <td className="p-4 text-ink-muted text-sm font-medium">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold 
                      ${log.channel === "Email" ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"}`}
                    >
                      {log.channel === "Email" ? (
                        <Mail className="w-3 h-3" />
                      ) : (
                        <MessageSquare className="w-3 h-3" />
                      )}
                      {log.channel}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-ink">{log.recipient_type}</p>
                    <p className="text-xs text-ink-muted">{log.recipient_count} recipients</p>
                  </td>
                  <td className="p-4 text-ink-muted text-sm max-w-xs truncate">
                    {log.message_content}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${log.status === "Sent" ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {log.status === "Sent" ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-ink-muted">
                    No broadcasts sent yet. Click 'Compose Broadcast' to send your first message.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

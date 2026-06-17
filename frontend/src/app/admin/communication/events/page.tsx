"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { getEvents, createEvent } from "@/lib/api/communication";
import { Plus, Calendar as CalendarIcon, MapPin, Tag } from "lucide-react";

export default function EventsCalendarPage() {
  const pathname = usePathname();

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    event_type: "Activity",
    target_audience: "All",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getEvents();
      setEvents(res.data || []);
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
      await createEvent(form);
      setIsModalOpen(false);
      setForm({
        title: "",
        description: "",
        start_date: "",
        end_date: "",
        event_type: "Activity",
        target_audience: "All",
      });
      loadData();
    } catch (err) {
      alert("Failed to create event.");
    } finally {
      setSaving(false);
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "Holiday":
        return "bg-green-100 text-green-800 border-green-200";
      case "Exam":
        return "bg-red-100 text-red-800 border-red-200";
      case "PTM":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-primary-50 text-primary-700 border-primary-100";
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
        title="School Calendar"
        description="Schedule holidays, exams, parent-teacher meetings, and school activities."
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Schedule Event
          </button>
        }
      />

      {loading ? (
        <div className="py-12 text-center text-ink-muted">Loading calendar...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-surface-card rounded-xl border border-dashed text-ink-faint">
          <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          No upcoming events scheduled.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className={`rounded-xl border p-6 flex flex-col justify-between shadow-sm bg-surface-card`}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold border ${getEventColor(event.event_type)}`}
                  >
                    {event.event_type}
                  </span>
                  <span className="text-xs font-medium text-ink-muted">
                    Target: {event.target_audience}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-ink mb-1">{event.title}</h3>
                <p className="text-sm text-ink-muted mb-4">{event.description}</p>
              </div>
              <div className="border-t pt-3 flex items-center gap-2 text-sm font-medium text-ink">
                <CalendarIcon className="w-4 h-4 text-ink-faint" />
                {event.start_date === event.end_date
                  ? new Date(event.start_date).toLocaleDateString()
                  : `${new Date(event.start_date).toLocaleDateString()} to ${new Date(event.end_date).toLocaleDateString()}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-card rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Schedule Event</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Event Title</label>
                <input
                  required
                  type="text"
                  className="w-full border rounded p-2"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full border rounded p-2"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    required
                    type="date"
                    className="w-full border rounded p-2"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    required
                    type="date"
                    className="w-full border rounded p-2"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Event Type</label>
                  <select
                    className="w-full border rounded p-2"
                    value={form.event_type}
                    onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                  >
                    <option value="Activity">Activity</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Exam">Exam</option>
                    <option value="PTM">PTM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Target Audience</label>
                  <select
                    className="w-full border rounded p-2"
                    value={form.target_audience}
                    onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                  >
                    <option value="All">All School</option>
                    <option value="Staff">Staff</option>
                    <option value="Students">Students</option>
                    <option value="Parents">Parents</option>
                  </select>
                </div>
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
                  {saving ? "Saving..." : "Schedule Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

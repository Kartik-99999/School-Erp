"use client";
import React, { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { getNotifications, markNotificationRead, AppNotification } from "@/lib/api/notifications";

const fmt = (d?: string) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const typeColor = (t: string) =>
  ({
    notice: "bg-primary-50 text-primary-700",
    absence: "bg-red-50 text-red-700",
    fee: "bg-amber-50 text-amber-700",
  })[t] || "bg-surface text-ink-muted";

// Per-user notifications (GET /notifications is scoped to the caller), so no child scoping.
export default function NotificationsView() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await getNotifications());
    } catch (e) {
      console.error("Failed to load notifications", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await markNotificationRead(id);
    } catch (e) {
      console.error("Failed to mark read", e);
    }
  };
  const markAll = async () => {
    const unread = items.filter((n) => !n.is_read);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await Promise.allSettled(unread.map((n) => markNotificationRead(n.id)));
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink">Notifications</h2>
          <p className="text-ink-muted mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAll} className="text-sm font-medium text-primary-600 hover:text-primary-700">
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-ink-muted">Loading…</div>
      ) : error ? (
        <div className="bg-surface-card rounded-card border border-border p-8 text-center text-red-600">
          Couldn't load notifications.
          <button onClick={load} className="underline ml-1 font-medium">
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface-card rounded-card border border-border p-12 text-center text-ink-muted">
          <BellOff className="w-10 h-10 mx-auto mb-3 text-ink-faint" />
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 rounded-card border transition-colors ${
                n.is_read ? "bg-surface-card border-border" : "bg-primary-50/40 border-primary-200"
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-ink">{n.title}</h4>
                  {n.type ? (
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${typeColor(n.type)}`}>
                      {n.type}
                    </span>
                  ) : null}
                  {!n.is_read ? <span className="w-2 h-2 rounded-full bg-primary-600" /> : null}
                </div>
                {n.body ? <p className="text-sm text-ink-muted mt-0.5">{n.body}</p> : null}
                <p className="text-xs text-ink-faint mt-1">{fmt(n.created_at)}</p>
              </div>
              {!n.is_read && (
                <button
                  onClick={() => markRead(n.id)}
                  title="Mark read"
                  className="text-ink-muted hover:text-primary-600 shrink-0"
                >
                  <Check className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

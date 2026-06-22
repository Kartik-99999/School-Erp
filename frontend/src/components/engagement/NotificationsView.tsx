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
          <button onClick={markAll} className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-full transition-colors">
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
              className={`group flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 ${
                n.is_read ? "bg-surface-card border-border/60 hover:border-border hover:shadow-sm" : "bg-primary-50/30 border-primary-200/60 hover:bg-primary-50/50 hover:border-primary-300 shadow-sm"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${n.is_read ? "bg-surface text-ink-muted" : "bg-primary-100 text-primary-700"}`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-ink text-base">{n.title}</h4>
                  {n.type ? (
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${typeColor(n.type)}`}>
                      {n.type}
                    </span>
                  ) : null}
                  {!n.is_read ? <span className="w-2.5 h-2.5 rounded-full bg-primary-600 shadow-[0_0_8px_rgba(var(--primary-600),0.5)]" /> : null}
                </div>
                {n.body ? <p className="text-sm text-ink-muted mt-1 leading-relaxed">{n.body}</p> : null}
                <p className="text-xs font-medium text-ink-faint mt-2">{fmt(n.created_at)}</p>
              </div>
              {!n.is_read && (
                <button
                  onClick={() => markRead(n.id)}
                  title="Mark read"
                  className="p-2 text-ink-muted hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
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

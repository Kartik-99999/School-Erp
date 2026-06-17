"use client";
import React, { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { getThreads, getThread, replyToThread } from "@/lib/api/messaging";
import { MessageSquare, Send } from "lucide-react";

const fmt = (d?: string) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export default function AdminMessagesPage() {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadThreads = async () => {
    try {
      const res = await getThreads();
      setThreads(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadThreads();
  }, []);

  const openThread = async (t: any) => {
    setActive(t);
    setLoadingMsgs(true);
    try {
      const res = await getThread(t.parent_id);
      setMessages(res.data || []);
      setThreads((p) => p.map((x) => (x.parent_id === t.parent_id ? { ...x, unread: 0 } : x)));
      setTimeout(() => endRef.current?.scrollIntoView(), 50);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    setSending(true);
    try {
      await replyToThread(active.parent_id, text.trim());
      setText("");
      const res = await getThread(active.parent_id);
      setMessages(res.data || []);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      loadThreads();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader title="Messages" description="Conversations with parents." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Threads list */}
        <div className="bg-surface-card rounded-card border border-border shadow-card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border text-sm font-semibold text-ink">Inbox</div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <EmptyState
                icon={<MessageSquare size={22} />}
                title="No messages"
                description="Parent messages will appear here."
              />
            ) : (
              threads.map((t) => (
                <button
                  key={t.parent_id}
                  onClick={() => openThread(t)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-border transition-colors",
                    active?.parent_id === t.parent_id ? "bg-primary-50" : "hover:bg-surface"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink truncate">{t.parent_name}</span>
                    {t.unread > 0 && (
                      <span className="text-[10px] font-bold bg-primary-600 text-white rounded-full px-1.5 py-0.5 shrink-0">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted truncate mt-0.5">{t.last_message}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation */}
        <div className="lg:col-span-2 bg-surface-card rounded-card border border-border shadow-card flex flex-col overflow-hidden">
          {!active ? (
            <EmptyState
              icon={<MessageSquare size={22} />}
              title="Select a conversation"
              description="Choose a parent from the inbox to view and reply."
              className="my-auto"
            />
          ) : (
            <>
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-ink">{active.parent_name}</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs ? (
                  <p className="text-center text-ink-muted py-8">Loading…</p>
                ) : (
                  messages.map((m) => {
                    const school = m.sender === "School";
                    return (
                      <div
                        key={m.id}
                        className={cn("flex", school ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-card px-4 py-2.5",
                            school
                              ? "bg-primary-600 text-white"
                              : "bg-surface text-ink border border-border"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                          <p
                            className={cn(
                              "text-[10px] mt-1",
                              school ? "text-primary-100" : "text-ink-faint"
                            )}
                          >
                            {fmt(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>
              <form
                onSubmit={handleReply}
                className="p-3 border-t border-border flex items-center gap-2"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a reply…"
                  className="flex-1 border border-border rounded-input px-3 py-2 text-sm text-ink bg-surface placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="px-4 py-2 rounded-btn bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Send size={16} /> Reply
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

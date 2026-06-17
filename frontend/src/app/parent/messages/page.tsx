"use client";
import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMyMessages, sendMyMessage } from "@/lib/api/messaging";

const fmt = (d?: string) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export default function ParentMessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = async (scroll = true) => {
    try {
      const res = await getMyMessages();
      setMessages(res.data || []);
      if (scroll) setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMyMessage(text.trim());
      setText("");
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Messages</h1>
          <p className="text-sm text-ink-muted mt-1">Chat directly with the school office.</p>
        </div>
        <button
          onClick={() => load(false)}
          className="p-2 rounded-btn text-ink-muted hover:bg-surface"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="bg-surface-card rounded-card border border-border shadow-card flex flex-col h-[calc(100vh-220px)]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <p className="text-center text-ink-muted py-8">Loading…</p>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-ink-muted">
              <MessageSquare size={32} className="text-ink-faint mb-2" />
              <p className="text-sm">No messages yet. Start the conversation below.</p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender === "Parent";
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-card px-4 py-2.5",
                      mine
                        ? "bg-primary-600 text-white"
                        : "bg-surface text-ink border border-border"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                    <p
                      className={cn(
                        "text-[10px] mt-1",
                        mine ? "text-primary-100" : "text-ink-faint"
                      )}
                    >
                      {m.sender === "School" ? "School · " : ""}
                      {fmt(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSend} className="p-3 border-t border-border flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 border border-border rounded-input px-3 py-2 text-sm text-ink bg-surface placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="px-4 py-2 rounded-btn bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Send size={16} /> Send
          </button>
        </form>
      </div>
    </div>
  );
}

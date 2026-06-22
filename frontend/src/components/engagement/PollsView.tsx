"use client";
import React, { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { getPolls, votePoll, Poll } from "@/lib/api/polls";

// School-wide (audience-filtered) polls — same for any signed-in user, so no child scoping.
export default function PollsView() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setPolls(await getPolls());
    } catch (e) {
      console.error("Failed to load polls", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const vote = async (poll: Poll, optionId: string) => {
    if (poll.my_option_id || busy) return;
    setBusy(poll.id);
    setPolls((prev) =>
      prev.map((p) =>
        p.id === poll.id
          ? {
              ...p,
              my_option_id: optionId,
              total_votes: p.total_votes + 1,
              options: p.options.map((o) => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o)),
            }
          : p
      )
    );
    try {
      await votePoll(poll.id, optionId);
    } catch (e) {
      console.error("Vote failed", e);
      alert("Couldn't record your vote. Please try again.");
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-ink">Polls</h2>
        <p className="text-ink-muted mt-1">Share your opinion and see what others think.</p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-ink-muted">Loading…</div>
      ) : error ? (
        <div className="bg-surface-card rounded-card border border-border p-8 text-center text-red-600">
          Couldn't load polls.
          <button onClick={load} className="underline ml-1 font-medium">
            Retry
          </button>
        </div>
      ) : polls.length === 0 ? (
        <div className="bg-surface-card rounded-card border border-border p-12 text-center text-ink-muted">
          No active polls right now.
        </div>
      ) : (
        <div className="space-y-6">
          {polls.map((poll) => {
            const voted = !!poll.my_option_id;
            return (
              <div key={poll.id} className="bg-surface-card rounded-card border border-border shadow-sm p-6">
                <div className="flex items-start gap-3 mb-4">
                  <BarChart3 className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" />
                  <h3 className="font-bold text-ink text-lg">{poll.question}</h3>
                </div>
                <div className="space-y-3">
                  {poll.options.map((o) => {
                    const pct = poll.total_votes ? Math.round((o.votes / poll.total_votes) * 100) : 0;
                    const mine = poll.my_option_id === o.id;
                    if (voted) {
                      return (
                        <div key={o.id} className="rounded-xl border border-border overflow-hidden">
                          <div className="relative px-4 py-3">
                            <div
                              className={`absolute inset-y-0 left-0 ${mine ? "bg-primary-100" : "bg-surface"}`}
                              style={{ width: `${pct}%` }}
                            />
                            <div className="relative flex justify-between">
                              <span className={`text-sm font-medium ${mine ? "text-primary-700" : "text-ink"}`}>
                                {o.text}
                                {mine ? " ✓" : ""}
                              </span>
                              <span className="text-sm font-bold text-ink">{pct}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={o.id}
                        onClick={() => vote(poll, o.id)}
                        disabled={busy === poll.id}
                        className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-primary-400 hover:bg-primary-50 transition-colors text-sm font-medium text-ink disabled:opacity-60"
                      >
                        {o.text}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-ink-muted mt-4">
                  {poll.total_votes} vote{poll.total_votes === 1 ? "" : "s"}
                  {voted ? " · You voted" : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

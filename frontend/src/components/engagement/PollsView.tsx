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
              <div key={poll.id} className="bg-surface-card rounded-3xl border border-border/50 shadow-md p-6 sm:p-8 transition-shadow hover:shadow-lg">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 text-primary-600" />
                  </div>
                  <h3 className="font-bold text-ink text-xl pt-1.5">{poll.question}</h3>
                </div>
                <div className="space-y-3">
                  {poll.options.map((o) => {
                    const pct = poll.total_votes ? Math.round((o.votes / poll.total_votes) * 100) : 0;
                    const mine = poll.my_option_id === o.id;
                    if (voted) {
                      return (
                        <div key={o.id} className="rounded-2xl border border-border/60 overflow-hidden relative">
                          <div className="relative px-5 py-4">
                            <div
                              className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out ${mine ? "bg-primary-100/80" : "bg-surface"}`}
                              style={{ width: `${pct}%` }}
                            />
                            <div className="relative flex justify-between items-center z-10">
                              <span className={`text-sm font-medium ${mine ? "text-primary-800" : "text-ink"}`}>
                                {o.text}
                                {mine ? <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-primary-200/50 text-[10px] uppercase tracking-wider font-bold text-primary-700">Your Vote</span> : ""}
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
                        className="w-full text-left px-5 py-4 rounded-2xl border border-border/60 hover:border-primary-400 hover:bg-primary-50 hover:shadow-sm transition-all text-sm font-medium text-ink disabled:opacity-60 focus:ring-2 focus:ring-primary-500/20"
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

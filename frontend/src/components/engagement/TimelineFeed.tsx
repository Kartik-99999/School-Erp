"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Megaphone, CalendarClock, FolderOpen } from "lucide-react";
import { getNotices, getEvents } from "@/lib/api/communication";
import { listResources } from "@/lib/api/resources";

type Kind = "Notice" | "Event" | "Resource";
interface Item {
  id: string;
  kind: Kind;
  title: string;
  subtitle?: string;
  date?: string;
  url?: string;
}

const FILTERS = ["All", "Notices", "Events", "Resources"] as const;
type Filter = (typeof FILTERS)[number];

const KIND: Record<Kind, { icon: any; label: string; color: string }> = {
  Notice: { icon: Megaphone, label: "Notice", color: "text-primary-600" },
  Event: { icon: CalendarClock, label: "Event", color: "text-emerald-600" },
  Resource: { icon: FolderOpen, label: "Resource", color: "text-amber-600" },
};

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

// Merges the existing communication + resource reads into one newest-first feed
// (mirrors mobile TimelineScreen). No new backend endpoint.
export default function TimelineFeed() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("All");

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [noticesRes, eventsRes, resources] = await Promise.all([
        getNotices(),
        getEvents(),
        listResources(),
      ]);
      const merged: Item[] = [];
      for (const n of noticesRes.data || [])
        merged.push({ id: "n" + n.id, kind: "Notice", title: n.title, subtitle: n.body, date: n.created_at });
      for (const e of eventsRes.data || [])
        merged.push({ id: "e" + e.id, kind: "Event", title: e.title, subtitle: e.description, date: e.start_date });
      for (const r of resources)
        merged.push({
          id: "r" + r.id,
          kind: "Resource",
          title: r.title,
          subtitle: r.description || undefined,
          date: r.created_at,
          url: r.external_url || r.file_url || undefined,
        });
      merged.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      setItems(merged);
    } catch (e) {
      console.error("Failed to load timeline", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "All") return items;
    const k = filter === "Notices" ? "Notice" : filter === "Events" ? "Event" : "Resource";
    return items.filter((i) => i.kind === k);
  }, [items, filter]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink">Timeline</h2>
        <p className="text-ink-muted mt-1">Notices, events and resources in one feed.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const on = f === filter;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                on
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-surface-card text-ink border-border hover:bg-surface"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-16 text-center text-ink-muted">Loading…</div>
      ) : error ? (
        <div className="bg-surface-card rounded-card border border-border p-8 text-center text-red-600">
          Couldn't load the timeline.
          <button onClick={load} className="underline ml-1 font-medium">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-card rounded-card border border-border p-12 text-center text-ink-muted">
          Nothing here yet.
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-12 space-y-8 before:absolute before:inset-y-2 before:left-[11px] sm:before:left-[23px] before:w-0.5 before:bg-border/60">
          {filtered.map((it) => {
            const k = KIND[it.kind];
            const inner = (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-surface border border-border/50 ${k.color}`}>
                    <k.icon className="w-3.5 h-3.5" /> {k.label}
                  </span>
                  {it.date ? <span className="text-xs font-medium text-ink-muted bg-surface/50 px-2 py-1 rounded-md">{fmt(it.date)}</span> : null}
                </div>
                <h3 className="text-lg font-bold text-ink">{it.title}</h3>
                {it.subtitle ? <p className="text-sm text-ink-muted mt-2 leading-relaxed">{it.subtitle}</p> : null}
              </>
            );
            
            const cardClasses = "block bg-surface-card rounded-2xl border border-border/50 shadow-sm p-6 sm:p-7 hover:shadow-md hover:border-primary-200 transition-all duration-300 relative group";

            return (
              <div key={it.id} className="relative">
                {/* Timeline Dot */}
                <div className="absolute -left-[24px] sm:-left-[48px] top-6 w-3 h-3 rounded-full bg-surface border-2 border-primary-500 shadow-[0_0_0_4px_var(--surface)] z-10 group-hover:bg-primary-500 transition-colors" />
                
                {it.url ? (
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cardClasses}
                  >
                    {inner}
                  </a>
                ) : (
                  <div className={cardClasses}>
                    {inner}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

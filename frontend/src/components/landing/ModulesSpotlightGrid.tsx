"use client";
import React from "react";
import type { LucideIcon } from "lucide-react";
import MotionStyles from "./animated/MotionStyles";

export type Mod = { name: string; icon: LucideIcon; body: string };

// One module card with a gold spotlight that tracks the cursor (CSS vars --mx/--my)
// and a hover lift (via the .ec-card rule in MotionStyles).
function SpotlightCard({ m }: { m: Mod }) {
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const onLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty("--mx", "-9999px");
    e.currentTarget.style.setProperty("--my", "-9999px");
  };
  const Icon = m.icon;
  return (
    <div
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ ["--mx" as any]: "-9999px", ["--my" as any]: "-9999px" }}
      className="ec-card group relative overflow-hidden rounded-2xl border border-white/8 bg-void-700/50 p-7"
    >
      {/* Composite-only spotlight: a fixed gradient layer TRANSLATED to the cursor (no per-frame repaint). */}
      <div
        className="pointer-events-none absolute left-0 top-0"
        style={{ width: 620, height: 620, marginLeft: -310, marginTop: -310, transform: "translate(var(--mx), var(--my))", willChange: "transform", background: "radial-gradient(circle, rgba(235,203,135,0.26), rgba(235,203,135,0.06) 40%, transparent 70%)" }}
      />
      <div className="relative grid h-11 w-11 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold transition duration-300 group-hover:-translate-y-0.5">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <h3 className="relative mt-5 font-display text-lg font-semibold text-warm">{m.name}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-warm-400">{m.body}</p>
    </div>
  );
}

// Cursor-following spotlight grid (Claude design) — drop-in replacement for the static
// modules grid. Keeps the same six modules; 4-up on large screens.
export default function ModulesSpotlightGrid({ modules }: { modules: Mod[] }) {
  return (
    <>
      <MotionStyles />
      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <SpotlightCard key={m.name} m={m} />
        ))}
      </div>
    </>
  );
}

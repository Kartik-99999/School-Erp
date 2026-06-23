"use client";
import React from "react";

const MONO = "'JetBrains Mono', ui-monospace, monospace";
const DISPLAY = "'Bricolage Grotesque', ui-serif, Georgia, serif";

const MODULES = [
  { title: "Admissions", body: "Enquiry to enrolment — Aadhaar & APAAR validated on the way in. No duplicate registers.", icon: (<><circle cx="9" cy="8" r="4" /><path d="M3 20 c0-3.3 2.7-6 6-6 c1.5 0 2.9 0.5 4 1.5" /><path d="M17 14 v6 M14 17 h6" /></>) },
  { title: "Attendance", body: "Per-period rolls. A parent knows their child is absent before assembly is over.", icon: (<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9 h18" /><path d="M8 3 v4 M16 3 v4" /><path d="M8 14 l2.5 2.5 L16 11" /></>) },
  { title: "Fees", body: "Each school collects into its own Razorpay account. Receipts reconcile themselves.", icon: (<><path d="M5 3 v18 l3 -2 l3 2 l3 -2 l3 2 l3 -2 V3 z" /><path d="M9 8 h6 M9 12 h6 M9 16 h3" /></>) },
  { title: "Examinations", body: "Marks become board-ready report cards — CBSE-aware — in a few clicks.", icon: (<><path d="M2 9 L12 4 L22 9 L12 14 z" /><path d="M6 11 v5 c0 1 3 3 6 3 s6 -2 6 -3 v-5" /><path d="M22 9 v5" /></>) },
  { title: "Communication", body: "Notices, circulars and WhatsApp alerts — sent to one class, not the whole school.", icon: (<path d="M21 11 c0 4.4-4 8-9 8 c-1.4 0-2.7-0.3-3.8-0.8 L3 20 l1.4-4.2 C3.5 14.6 3 13 3 11 c0-4.4 4-8 9-8 s9 3.6 9 8 z" />) },
  { title: "People & access", body: "Six roles, one login. Row-level isolation means every school sees only what's theirs.", icon: (<><path d="M12 3 L4 7 v6 c0 4 3.5 7 8 8 c4.5-1 8-4 8-8 V7 z" /><path d="M9 12 L11 14 L15 10" /></>) },
];

function ModuleCard({ m }: { m: (typeof MODULES)[number] }) {
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const onLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty("--mx", "-200px");
    e.currentTarget.style.setProperty("--my", "-200px");
  };
  return (
    <div
      className="ec-card"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ ["--mx" as any]: "-200px", ["--my" as any]: "-200px", position: "relative", overflow: "hidden", borderRadius: 18, border: "1px solid rgba(255,255,255,0.08)", background: "#0C0E14", padding: 28, cursor: "pointer" }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(420px circle at var(--mx) var(--my), rgba(235,203,135,0.16), transparent 50%)" }} />
      <div style={{ position: "relative", display: "grid", placeItems: "center", height: 48, width: 48, borderRadius: 12, border: "1px solid rgba(235,203,135,0.28)", background: "rgba(235,203,135,0.07)", color: "#EBCB87" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{m.icon}</svg>
      </div>
      <h3 style={{ position: "relative", margin: "20px 0 0", fontFamily: DISPLAY, fontSize: 19, fontWeight: 600, letterSpacing: "-0.005em" }}>{m.title}</h3>
      <p style={{ position: "relative", margin: "8px 0 0", color: "#A8A595", fontSize: 14, lineHeight: 1.55 }}>{m.body}</p>
    </div>
  );
}

export default function MagneticModules() {
  return (
    <section id="c3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "80px 40px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.28em", color: "#EBCB87", textTransform: "uppercase" }}>03 / Modules grid</div>
        <h2 style={{ margin: "14px 0 8px", fontFamily: DISPLAY, fontSize: 38, fontWeight: 700, letterSpacing: "-0.012em", lineHeight: 1.08 }}>Cursor-following spotlight.</h2>
        <p style={{ margin: 0, color: "#A8A595", fontSize: 15, lineHeight: 1.6, maxWidth: 560 }}>Each module card gets a soft gold spotlight that tracks the cursor and lifts on hover. The same six tiles — far more present.</p>
        <div style={{ marginTop: 44, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {MODULES.map((m) => (<ModuleCard key={m.title} m={m} />))}
        </div>
      </div>
    </section>
  );
}

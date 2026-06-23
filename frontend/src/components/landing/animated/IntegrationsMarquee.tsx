"use client";
import React from "react";

const MONO = "'JetBrains Mono', ui-monospace, monospace";
const DISPLAY = "'Bricolage Grotesque', ui-serif, Georgia, serif";

type Chip = { badge: React.ReactNode; bg: string; color: string; textBadge?: boolean; name: string; tag: string };
const CHIPS: Chip[] = [
  { badge: "आ", bg: "linear-gradient(135deg,#EBCB87,#B8923F)", color: "#08090D", textBadge: true, name: "Aadhaar", tag: "UIDAI" },
  { badge: "A+", bg: "rgba(235,203,135,0.10)", color: "#EBCB87", textBadge: true, name: "APAAR", tag: "academic ID" },
  { badge: "₹", bg: "rgba(94,234,212,0.10)", color: "#5EEAD4", textBadge: true, name: "Razorpay", tag: "payments" },
  { badge: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 11.5 a8.4 8.4 0 0 1 -12.4 7.4 L3 20 l1.1-5.6 A8.4 8.4 0 1 1 21 11.5 z" /></svg>), bg: "rgba(94,234,212,0.10)", color: "#5EEAD4", name: "WhatsApp", tag: "business API" },
  { badge: "UPI", bg: "rgba(235,203,135,0.10)", color: "#EBCB87", textBadge: true, name: "UPI", tag: "NPCI" },
  { badge: "CB", bg: "linear-gradient(135deg,#2563EB,#1D4ED8)", color: "#fff", textBadge: true, name: "CBSE", tag: "affiliations" },
  { badge: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="4" y="6" width="16" height="14" rx="2" /><path d="M9 3 v3 M15 3 v3 M4 11 h16" /></svg>), bg: "rgba(235,203,135,0.10)", color: "#EBCB87", name: "DigiLocker", tag: "credentials" },
  { badge: "PEN", bg: "rgba(235,203,135,0.10)", color: "#EBCB87", textBadge: true, name: "PEN", tag: "student ID" },
  { badge: "दी", bg: "linear-gradient(135deg,#F97316,#B8923F)", color: "#08090D", textBadge: true, name: "DIKSHA", tag: "e-learning" },
  { badge: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M3 12 h18 M12 3 c3 3 4 6 4 9 s-1 6 -4 9 c-3-3-4-6-4-9 s1-6 4-9" /></svg>), bg: "rgba(235,203,135,0.10)", color: "#EBCB87", name: "Vidya Samiksha", tag: "VSK · MoE" },
  { badge: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /><path d="M5 17 H3 v-4 l3-6 h11 l4 6 v4 h-2 M9 17 h6" /></svg>), bg: "rgba(94,234,212,0.10)", color: "#5EEAD4", name: "Vahan", tag: "transport" },
];

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <div aria-hidden={hidden} style={{ display: "flex", gap: 18, padding: "0 9px" }}>
      {CHIPS.map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 22px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "#0C0E14", whiteSpace: "nowrap" }}>
          <span style={{ display: "grid", placeItems: "center", height: 28, width: 28, borderRadius: 7, background: c.bg, color: c.color, fontFamily: c.textBadge ? DISPLAY : undefined, fontSize: 13, fontWeight: 800 }}>{c.badge}</span>
          <span style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 600 }}>{c.name}</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: "#75736A", letterSpacing: "0.1em" }}>{c.tag}</span>
        </div>
      ))}
    </div>
  );
}

export default function IntegrationsMarquee() {
  return (
    <section id="c5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "80px 0" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.28em", color: "#EBCB87", textTransform: "uppercase" }}>Native integrations</div>
        <h2 style={{ margin: "14px 0 8px", fontFamily: DISPLAY, fontSize: 38, fontWeight: 700, letterSpacing: "-0.012em", lineHeight: 1.08 }}>Built into India&apos;s systems.</h2>
        <p style={{ margin: 0, color: "#A8A595", fontSize: 15, lineHeight: 1.6, maxWidth: 560 }}>An infinite, gently-drifting strip of the things Erpcore speaks to natively — these are integrations, not logos pretending to be customers.</p>
      </div>
      <div className="ec-rmsafe" style={{ marginTop: 44, position: "relative", overflow: "hidden", padding: "24px 0", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)", maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)" }}>
        <div style={{ display: "flex", gap: 18, width: "max-content", animation: "ec-marqueeX 42s linear infinite", willChange: "transform" }}>
          <Row /><Row hidden />
        </div>
      </div>
    </section>
  );
}

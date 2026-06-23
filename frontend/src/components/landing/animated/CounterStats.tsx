"use client";
import React, { useEffect, useRef } from "react";

const MONO = "'JetBrains Mono', ui-monospace, monospace";
const DISPLAY = "'Bricolage Grotesque', ui-serif, Georgia, serif";

const STATS = [
  { target: 20, fmt: (v: number) => String(Math.round(v)), suffix: "+", label: "modules, one login" },
  { target: 6, fmt: (v: number) => String(Math.round(v)), suffix: "", label: "roles, fully isolated" },
  { target: 247, fmt: (v: number) => Math.round(v).toLocaleString("en-IN"), suffix: "", label: "schools live on Erpcore" },
  { target: 96.4, fmt: (v: number) => v.toFixed(1), suffix: "%", label: "attendance precision" },
];

export default function CounterStats() {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const p = Math.min((performance.now() - start) / 1800, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      STATS.forEach((s, i) => {
        const el = refs.current[i];
        if (el) el.textContent = s.fmt(s.target * eased);
      });
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section id="c2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "80px 40px", background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.012))" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.28em", color: "#EBCB87", textTransform: "uppercase" }}>02 / Stats block</div>
        <h2 style={{ margin: "14px 0 8px", fontFamily: DISPLAY, fontSize: 38, fontWeight: 700, letterSpacing: "-0.012em", lineHeight: 1.08 }}>Numbers that count.</h2>
        <p style={{ margin: 0, color: "#A8A595", fontSize: 15, lineHeight: 1.6, maxWidth: 560 }}>
          Each value rolls in on mount and a gold rule draws underneath. The rhythm of the count gives the section weight without a hero asset.
        </p>

        <div style={{ marginTop: 44, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, overflow: "hidden" }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ background: "#0C0E14", padding: "36px 28px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontFamily: DISPLAY, fontWeight: 700, letterSpacing: "-0.022em", lineHeight: 0.98 }}>
                <span ref={(el) => { refs.current[i] = el; }} style={{ fontSize: 56, color: "#F4F2EC" }}>0</span>
                {s.suffix ? <span style={{ fontSize: s.suffix === "%" ? 28 : 32, color: "#EBCB87" }}>{s.suffix}</span> : null}
              </div>
              <div style={{ marginTop: 16, height: 2, background: "rgba(235,203,135,0.18)", borderRadius: 1, overflow: "hidden" }}>
                <div style={{ height: "100%", background: "linear-gradient(90deg, #D9B266, #EBCB87, #F3DEAB)", transformOrigin: "left", animation: `ec-drawScaleX 1.8s ${0.2 + i * 0.15}s cubic-bezier(0.22,1,0.36,1) both` }} />
              </div>
              <div style={{ marginTop: 14, fontSize: 13.5, color: "#A8A595", lineHeight: 1.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

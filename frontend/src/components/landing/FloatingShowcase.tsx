"use client";
import React from "react";
import MotionStyles from "./animated/MotionStyles";

const MONO = "'JetBrains Mono', ui-monospace, monospace";
const DISPLAY = "'Bricolage Grotesque', ui-serif, Georgia, serif";

const STARS = [
  ["12%", "18%", 2, "#F4F2EC", "3.4s", "0s"], ["86%", "22%", 1.5, "#F4F2EC", "4.2s", "0.4s"],
  ["46%", "10%", 1, "#EBCB87", "5.1s", "1.1s"], ["22%", "82%", 1.5, "#F4F2EC", "3.8s", "0.6s"],
  ["64%", "70%", 1, "#F4F2EC", "4.6s", "1.8s"], ["92%", "60%", 2, "#EBCB87", "3.2s", "0.2s"],
  ["34%", "34%", 1, "#F4F2EC", "4.4s", "2.2s"], ["76%", "40%", 1.5, "#F4F2EC", "5.4s", "1.4s"],
  ["18%", "54%", 1, "#EBCB87", "3.6s", "0.8s"], ["56%", "88%", 1, "#F4F2EC", "4.0s", "2.0s"],
] as const;

const cardBase: React.CSSProperties = { borderRadius: 12, padding: 14 };

// Claude "Floating UI fragments" — replaces the old "One screen, the whole school day" block.
export default function FloatingShowcase() {
  return (
    <section className="relative border-y border-white/5 bg-void-800/40">
      <MotionStyles />
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
        <div
          className="ec-rmsafe"
          style={{
            position: "relative",
            minHeight: 540,
            borderRadius: 18,
            overflow: "hidden",
            background:
              "radial-gradient(ellipse at 28% 18%, rgba(235,203,135,0.06), transparent 60%), radial-gradient(ellipse at 72% 82%, rgba(124,58,237,0.045), transparent 60%)",
          }}
        >
          {/* starfield */}
          <div style={{ position: "absolute", inset: 0 }}>
            {STARS.map((s, i) => (
              <span key={i} style={{ position: "absolute", left: s[0], top: s[1], width: s[2], height: s[2], background: s[3], borderRadius: "50%", animation: `ec-starTwinkle ${s[4]} ${s[5]} ease-in-out infinite` }} />
            ))}
          </div>

          {/* centered title */}
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", textAlign: "center", zIndex: 1, maxWidth: 760, padding: "0 24px", width: "100%" }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.42em", color: "#A8A595", textTransform: "uppercase" }}>The operating system for your school</div>
            <div style={{ marginTop: 22, fontFamily: DISPLAY, fontSize: "clamp(40px,7vw,78px)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 0.96, backgroundImage: "linear-gradient(90deg,#F4F2EC 0%,#EBCB87 35%,#F3DEAB 50%,#EBCB87 65%,#F4F2EC 100%)", backgroundSize: "200% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", animation: "ec-goldSweep 8s linear infinite" }}>Erpcore</div>
            <div style={{ marginTop: 18, fontFamily: DISPLAY, fontSize: 17, color: "#A8A595", fontWeight: 400 }}>
              Built for the way Indian schools actually run
              <span style={{ display: "inline-block", width: 8, marginLeft: 3, color: "#EBCB87", animation: "ec-caretBlink 1.1s steps(2) infinite" }}>_</span>
            </div>
          </div>

          {/* timetable cell — top-left */}
          <div style={{ position: "absolute", left: "4%", top: "10%", width: 200, animation: "ec-float1 9s ease-in-out infinite" }}>
            <div style={{ ...cardBase, border: "1px solid rgba(235,203,135,0.32)", background: "linear-gradient(180deg, rgba(18,20,28,0.95), rgba(8,9,13,0.95))", boxShadow: "0 24px 60px -24px rgba(235,203,135,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EBCB87", animation: "ec-dotPulse 1.8s ease-out infinite" }} />
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: "#EBCB87", textTransform: "uppercase" }}>Period IV · live</span>
              </div>
              <div style={{ marginTop: 10, fontFamily: DISPLAY, fontSize: 22, fontWeight: 600 }}>Math</div>
              <div style={{ marginTop: 2, color: "#A8A595", fontSize: 13 }}>VIII-A · Mrs. Iyer</div>
              <div style={{ marginTop: 12, display: "flex", gap: 4 }}>
                {[1, 1, 0.6, 0, 0].map((f, i) => (<span key={i} style={{ height: 4, flex: f || 1, background: f ? "#EBCB87" : "rgba(235,203,135,0.18)", borderRadius: 999 }} />))}
              </div>
            </div>
          </div>

          {/* receipt — top-right */}
          <div style={{ position: "absolute", right: "5%", top: "8%", width: 188, animation: "ec-float2 11s ease-in-out infinite" }}>
            <div style={{ ...cardBase, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(18,20,28,0.94)", boxShadow: "0 24px 60px -28px rgba(0,0,0,0.8)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: "#A8A595", textTransform: "uppercase" }}>Receipt</span>
                <span style={{ fontFamily: MONO, fontSize: 10, color: "#75736A" }}>#R-4821</span>
              </div>
              <div style={{ marginTop: 10, fontFamily: DISPLAY, fontSize: 26, fontWeight: 700, letterSpacing: "-0.015em" }}>₹ 4,800</div>
              <div style={{ marginTop: 2, color: "#A8A595", fontSize: 12 }}>UPI · IX-B fees</div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, padding: "6px 9px", borderRadius: 999, background: "rgba(45,212,191,0.10)", border: "1px solid rgba(45,212,191,0.25)", width: "fit-content" }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#5EEAD4" strokeWidth="2"><path d="M2 6 L5 9 L10 3" /></svg>
                <span style={{ fontFamily: MONO, fontSize: 10, color: "#5EEAD4", letterSpacing: "0.06em" }}>Reconciled</span>
              </div>
            </div>
          </div>

          {/* attendance ticker — bottom-left */}
          <div style={{ position: "absolute", left: "7%", bottom: "10%", width: 200, animation: "ec-float3 10s ease-in-out infinite" }}>
            <div style={{ ...cardBase, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(18,20,28,0.94)", boxShadow: "0 24px 60px -28px rgba(0,0,0,0.8)" }}>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: "#A8A595", textTransform: "uppercase" }}>Attendance · VIII-A</div>
              <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontFamily: DISPLAY, fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", color: "#F4F2EC" }}>234</span>
                <span style={{ fontFamily: DISPLAY, fontSize: 16, color: "#75736A" }}>/ 240</span>
              </div>
              <div style={{ marginTop: 10, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "97.5%", background: "linear-gradient(90deg,#D9B266,#EBCB87)", borderRadius: 999, transformOrigin: "left", animation: "ec-drawScaleX 2.4s 0.2s cubic-bezier(0.22,1,0.36,1) backwards" }} />
              </div>
              <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 10, color: "#75736A" }}>marked in 12m · 6 absent</div>
            </div>
          </div>

          {/* notice badge — bottom-right */}
          <div style={{ position: "absolute", right: "4%", bottom: "14%", width: 188, animation: "ec-float4 12s ease-in-out infinite" }}>
            <div style={{ ...cardBase, border: "1px solid rgba(235,203,135,0.25)", background: "linear-gradient(180deg, rgba(235,203,135,0.06), rgba(18,20,28,0.95))", boxShadow: "0 24px 60px -28px rgba(235,203,135,0.22)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#EBCB87" strokeWidth="1.5"><path d="M3 7 L10 12 L17 7 M3 7 L3 15 L17 15 L17 7 M3 7 L10 2 L17 7" /></svg>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: "#EBCB87", textTransform: "uppercase" }}>Notice sent</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.45, color: "#F4F2EC" }}>PTA Saturday postponed to next week.</div>
              <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 10, color: "#A8A595" }}>3 sections · class VIII · WhatsApp + email</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

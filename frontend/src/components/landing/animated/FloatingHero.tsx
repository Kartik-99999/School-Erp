"use client";
import React from "react";

const MONO = "'JetBrains Mono', ui-monospace, monospace";
const DISPLAY = "'Bricolage Grotesque', ui-serif, Georgia, serif";

const STARS = [
  ["12%", "18%", 2, "#F4F2EC", "3.4s", "0s"], ["86%", "22%", 1.5, "#F4F2EC", "4.2s", "0.4s"],
  ["46%", "12%", 1, "#EBCB87", "5.1s", "1.1s"], ["22%", "78%", 1.5, "#F4F2EC", "3.8s", "0.6s"],
  ["64%", "64%", 1, "#F4F2EC", "4.6s", "1.8s"], ["92%", "58%", 2, "#EBCB87", "3.2s", "0.2s"],
  ["34%", "36%", 1, "#F4F2EC", "4.4s", "2.2s"], ["76%", "38%", 1.5, "#F4F2EC", "5.4s", "1.4s"],
  ["18%", "52%", 1, "#EBCB87", "3.6s", "0.8s"], ["56%", "84%", 1, "#F4F2EC", "4.0s", "2.0s"],
] as const;

const cardBase: React.CSSProperties = { borderRadius: 12, padding: 14, backdropFilter: "blur(6px)" };

export default function FloatingHero() {
  return (
    <section id="c1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "80px 40px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.28em", color: "#EBCB87", textTransform: "uppercase" }}>01 / Hero overlay</div>
        <h2 style={{ margin: "14px 0 8px", fontFamily: DISPLAY, fontSize: 38, fontWeight: 700, letterSpacing: "-0.012em", lineHeight: 1.08 }}>Floating UI fragments.</h2>
        <p style={{ margin: 0, color: "#A8A595", fontSize: 15, lineHeight: 1.6, maxWidth: 560 }}>
          Small artifacts of the running system — a live timetable cell, a paid receipt, an attendance ticker — drifting over the particle hero. Suggests work without showing a dashboard.
        </p>

        <div className="ec-rmsafe" style={{ marginTop: 36, position: "relative", height: 480, borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "radial-gradient(ellipse at 30% 20%, rgba(235,203,135,0.06), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(124,58,237,0.04), transparent 60%), #0A0B11" }}>
          <div style={{ position: "absolute", inset: 0 }}>
            {STARS.map((s, i) => (
              <span key={i} style={{ position: "absolute", left: s[0], top: s[1], width: s[2], height: s[2], background: s[3], borderRadius: "50%", animation: `ec-starTwinkle ${s[4]} ${s[5]} ease-in-out infinite` }} />
            ))}
          </div>

          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", textAlign: "center", zIndex: 1, maxWidth: 760, padding: "0 24px" }}>
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.42em", color: "#A8A595", textTransform: "uppercase" }}>The operating system for your school</div>
            <div style={{ marginTop: 22, fontFamily: DISPLAY, fontSize: "clamp(40px,7vw,78px)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 0.96, backgroundImage: "linear-gradient(90deg,#F4F2EC 0%,#EBCB87 35%,#F3DEAB 50%,#EBCB87 65%,#F4F2EC 100%)", backgroundSize: "200% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", animation: "ec-goldSweep 8s linear infinite" }}>Erpcore</div>
            <div style={{ marginTop: 18, fontFamily: DISPLAY, fontSize: 17, color: "#A8A595", fontWeight: 400 }}>
              Built for the way Indian schools actually run
              <span style={{ display: "inline-block", width: 8, marginLeft: 3, color: "#EBCB87", animation: "ec-caretBlink 1.1s steps(2) infinite" }}>_</span>
            </div>
          </div>

          {/* timetable cell */}
          <div style={{ position: "absolute", left: "6%", top: "16%", width: 200, animation: "ec-float1 9s ease-in-out infinite" }}>
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

          {/* receipt */}
          <div style={{ position: "absolute", right: "8%", top: "12%", width: 188, animation: "ec-float2 11s ease-in-out infinite" }}>
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

          {/* attendance ticker */}
          <div style={{ position: "absolute", left: "10%", bottom: "14%", width: 200, animation: "ec-float3 10s ease-in-out infinite" }}>
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

          {/* notice badge */}
          <div style={{ position: "absolute", right: "6%", bottom: "18%", width: 180, animation: "ec-float4 12s ease-in-out infinite" }}>
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

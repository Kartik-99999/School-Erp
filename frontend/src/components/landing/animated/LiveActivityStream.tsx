"use client";
import React, { useEffect, useRef, useState } from "react";

const MONO = "'JetBrains Mono', ui-monospace, monospace";
const DISPLAY = "'Bricolage Grotesque', ui-serif, Georgia, serif";
const GOLD = "#EBCB87";
const MUTE = "#A8A595";

const NAMES = ["Aarav Sharma", "Diya Patel", "Vihaan Reddy", "Aanya Singh", "Arjun Kumar", "Ananya Iyer", "Ishaan Gupta", "Kavya Nair", "Rohan Joshi", "Saanvi Mehta", "Aditya Rao", "Myra Kapoor", "Vivaan Khanna", "Pari Bose", "Reyansh Verma", "Tara Menon", "Kabir Shah", "Anvi Desai", "Atharv Pillai", "Ira Bhatt"];
const CLASSES = ["VI-A", "VI-B", "VII-A", "VII-B", "VIII-A", "VIII-B", "IX-A", "IX-B", "X-A", "X-B"];
const GRADES = ["VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const RUPEES = [1200, 2400, 3600, 4800, 6200, 8400, 12000, 18000, 24000];
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const rupees = () => "₹ " + pick(RUPEES).toLocaleString("en-IN");

interface Ev { id: number; time: string; kind: string; body: string; dotColor: string; kindColor: string; }
let _id = 0;
function makeEvent(dt: Date): Ev {
  const p2 = (n: number) => String(n).padStart(2, "0");
  const time = `${p2(dt.getHours())}:${p2(dt.getMinutes())}:${p2(dt.getSeconds())}`;
  const kinds: (() => { kind: string; body: string; tone: "gold" | "mute" })[] = [
    () => ({ kind: "AADHAAR", body: `${pick(NAMES)} · ${pick(CLASSES)}`, tone: "gold" }),
    () => ({ kind: "APAAR", body: `${12 + Math.floor(Math.random() * 20)} students · ${pick(CLASSES)}`, tone: "gold" }),
    () => ({ kind: "FEE", body: `${rupees()} · UPI · ${pick(CLASSES)}`, tone: "gold" }),
    () => ({ kind: "ATTEND", body: `${190 + Math.floor(Math.random() * 50)}/240 marked · ${pick(CLASSES)}`, tone: "mute" }),
    () => ({ kind: "NOTICE", body: `${2 + Math.floor(Math.random() * 5)} sections · class ${pick(GRADES)}`, tone: "mute" }),
    () => ({ kind: "REPORT", body: `Term 1 published · ${pick(CLASSES)}`, tone: "gold" }),
    () => ({ kind: "LIBRARY", body: `${pick(NAMES)} · 2 books issued`, tone: "mute" }),
    () => ({ kind: "LEAVE", body: `${pick(NAMES)} · ${1 + Math.floor(Math.random() * 3)} day leave approved`, tone: "mute" }),
    () => ({ kind: "HW", body: `${pick(CLASSES)} · Math · due Friday`, tone: "mute" }),
  ];
  const e = pick(kinds)();
  return { id: _id++, time, kind: e.kind, body: e.body, dotColor: e.tone === "gold" ? GOLD : MUTE, kindColor: e.tone === "gold" ? GOLD : MUTE };
}

export default function LiveActivityStream() {
  const tick = useRef(new Date(2026, 5, 23, 12, 42, 8));
  // Seed on the client only — Math.random() in the initial state would differ between the
  // server-rendered HTML and the client's first render and trip a hydration mismatch.
  const [events, setEvents] = useState<Ev[]>([]);

  useEffect(() => {
    const seed: Ev[] = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(tick.current.getTime() - (i + 1) * (5 + Math.floor(Math.random() * 9)) * 1000);
      seed.push(makeEvent(dt));
    }
    setEvents(seed);
    const iv = setInterval(() => {
      tick.current = new Date(tick.current.getTime() + (4 + Math.floor(Math.random() * 9)) * 1000);
      const ev = makeEvent(tick.current);
      setEvents((s) => [...s.slice(1), ev]);
    }, 2400);
    return () => clearInterval(iv);
  }, []);

  return (
    <section id="c4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "80px 40px", background: "linear-gradient(180deg, rgba(255,255,255,0.012), transparent)" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <h2 style={{ margin: "14px 0 8px", fontFamily: DISPLAY, fontSize: 38, fontWeight: 700, letterSpacing: "-0.012em", lineHeight: 1.08 }}>Watch your school run, in real time.</h2>
        <p style={{ margin: 0, color: "#A8A595", fontSize: 15, lineHeight: 1.6, maxWidth: 580 }}>A live feed of events — fees received, attendance marked, notices sent — streaming as they happen. The motion alone says &quot;this thing is alive&quot;.</p>

        <div style={{ marginTop: 44, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)", gap: 32, alignItems: "center" }}>
          <div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 18 }}>
              {["The same events your role dashboards see, surfaced as a public proof-of-life — never any PII, just verbs and counts.", "Driven by a tiny endpoint that bins the last hour by event kind — cached aggressively, anonymous.", "Reduced motion: respects prefers-reduced-motion by holding the feed still and just dimming entries."].map((txt, i) => (
                <li key={i} style={{ display: "flex", gap: 12, fontSize: 14.5, color: "#A8A595", lineHeight: 1.55 }}>
                  <span style={{ flexShrink: 0, display: "grid", placeItems: "center", height: 22, width: 22, borderRadius: 6, border: "1px solid rgba(235,203,135,0.28)", background: "rgba(235,203,135,0.08)", color: "#EBCB87", fontFamily: MONO, fontSize: 10 }}>{i + 1}</span>
                  <span>{txt}</span>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 28, display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(94,234,212,0.22)", background: "rgba(94,234,212,0.06)", color: "#5EEAD4", fontFamily: MONO, fontSize: 11, letterSpacing: "0.1em" }}>
              <span style={{ position: "relative", display: "inline-block", width: 8, height: 8 }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#5EEAD4" }} />
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#5EEAD4", animation: "ec-ringExpand 1.8s ease-out infinite" }} />
              </span>
              CONNECTED · 0.84s P50
            </div>
          </div>

          <div style={{ position: "relative", borderRadius: 18, border: "1px solid rgba(255,255,255,0.10)", background: "linear-gradient(180deg,#0C0E14,#08090D)", overflow: "hidden", boxShadow: "0 40px 90px -40px rgba(0,0,0,0.9)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}>
              <span style={{ position: "relative", display: "inline-block", width: 8, height: 8 }}>
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#EBCB87" }} />
                <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#EBCB87", opacity: 0.6, animation: "ec-ringExpand 1.6s ease-out infinite" }} />
              </span>
              <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", color: "#EBCB87", textTransform: "uppercase" }}>live · school day</span>
              <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11, color: "#75736A" }}>events · last 60s</span>
            </div>
            <div style={{ position: "relative", height: 328, overflow: "hidden", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 100%)", maskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 100%)" }}>
              {events.map((ev, i) => (
                <div key={ev.id} style={{ position: "absolute", left: 0, right: 0, top: i * 52, padding: "14px 20px", display: "grid", gridTemplateColumns: "80px 20px 84px 1fr", gap: 14, alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "top 0.6s cubic-bezier(0.22,1,0.36,1)", animation: "ec-fadeUpIn 0.6s cubic-bezier(0.22,1,0.36,1) backwards" }}>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: "#75736A", letterSpacing: "0.04em" }}>{ev.time}</span>
                  <span style={{ display: "inline-block", height: 7, width: 7, borderRadius: "50%", background: ev.dotColor }} />
                  <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.16em", color: ev.kindColor, textTransform: "uppercase", fontWeight: 500 }}>{ev.kind}</span>
                  <span style={{ fontSize: 13.5, color: "#F4F2EC", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.body}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {([["Today", "1,247", "events", "#F4F2EC"], ["Collected", "₹ 89,400", "", "#EBCB87"], ["Notices", "87", "sent", "#F4F2EC"]] as const).map(([h, v, u, c], i) => (
                <div key={i} style={{ padding: "14px 18px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.18em", color: "#75736A", textTransform: "uppercase" }}>{h}</div>
                  <div style={{ marginTop: 4, fontFamily: DISPLAY, fontSize: 18, fontWeight: 700, color: c }}>{v} {u ? <span style={{ fontSize: 11, color: "#75736A", fontWeight: 400 }}>{u}</span> : null}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

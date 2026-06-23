"use client";
import React from "react";

const MONO = "JetBrains Mono, ui-monospace, monospace";
const DISPLAY = "Bricolage Grotesque, ui-serif, Georgia, serif";
const BODY = "Inter, system-ui, sans-serif";

const STOPS = [
  { x: 90, y: 200, r: 18, dot: 5, num: "01", title: "Enrol", sub: "Aadhaar verified", numY: 240, titleY: 258, subY: 275 },
  { x: 320, y: 78, r: 18, dot: 5, num: "02", title: "Attend", sub: "Per-period rolls", numY: 42, titleY: 25, subY: 118 },
  { x: 550, y: 140, r: 22, dot: 6, num: "03", title: "Learn", sub: "Homework · syllabus", numY: 100, titleY: 84, subY: 180 },
  { x: 780, y: 78, r: 18, dot: 5, num: "04", title: "Assess", sub: "Board-ready reports", numY: 42, titleY: 25, subY: 118 },
  { x: 1010, y: 200, r: 18, dot: 5, num: "05", title: "Passout", sub: "Certificate · PEN", numY: 240, titleY: 258, subY: 275 },
];

export default function StudentJourney() {
  return (
    <section id="c6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "80px 40px", background: "linear-gradient(180deg, transparent, rgba(235,203,135,0.018))" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ fontFamily: "'" + MONO + "'", fontSize: 11, letterSpacing: "0.28em", color: "#EBCB87", textTransform: "uppercase" }}>06 / New section</div>
        <h2 style={{ margin: "14px 0 8px", fontFamily: "'" + DISPLAY + "'", fontSize: 38, fontWeight: 700, letterSpacing: "-0.012em", lineHeight: 1.08 }}>From enrolment to graduation.</h2>
        <p style={{ margin: 0, color: "#A8A595", fontSize: 15, lineHeight: 1.6, maxWidth: 580 }}>
          A gold dot travels a soft arc through the five stations of a student&apos;s life on Erpcore. Each stop carries a glyph and a one-line promise.
        </p>

        <div style={{ marginTop: 56, position: "relative", padding: "24px 0 36px" }}>
          <svg viewBox="0 0 1100 280" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%", height: "auto" }}>
            <defs>
              <linearGradient id="ecPathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D9B266" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#EBCB87" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#D9B266" stopOpacity="0.15" />
              </linearGradient>
              <radialGradient id="ecDotGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#F3DEAB" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#EBCB87" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#EBCB87" stopOpacity="0" />
              </radialGradient>
              <path id="ecJourneyPath" d="M 90 200 Q 320 -10 550 140 Q 780 -10 1010 200" />
            </defs>

            <use href="#ecJourneyPath" fill="none" stroke="url(#ecPathGrad)" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" />

            <g>
              {STOPS.map((s) => (
                <g key={s.num}>
                  <circle cx={s.x} cy={s.y} r={s.r} fill="#0A0B11" stroke="#EBCB87" strokeWidth={s.r > 18 ? 1.8 : 1.5} />
                  <circle cx={s.x} cy={s.y} r={s.dot} fill={s.dot > 5 ? "#F3DEAB" : "#EBCB87"} />
                  <text x={s.x} y={s.numY} textAnchor="middle" fill="#EBCB87" fontFamily={MONO} fontSize="10" letterSpacing="2">{s.num}</text>
                  <text x={s.x} y={s.titleY} textAnchor="middle" fill="#F4F2EC" fontFamily={DISPLAY} fontSize="15" fontWeight="600">{s.title}</text>
                  <text x={s.x} y={s.subY} textAnchor="middle" fill="#A8A595" fontFamily={BODY} fontSize="11">{s.sub}</text>
                </g>
              ))}
            </g>

            <circle r="22" fill="url(#ecDotGlow)" opacity="0.9">
              <animateMotion dur="7.5s" repeatCount="indefinite" rotate="auto"><mpath href="#ecJourneyPath" /></animateMotion>
            </circle>
            <circle r="5.5" fill="#F3DEAB">
              <animateMotion dur="7.5s" repeatCount="indefinite" rotate="auto"><mpath href="#ecJourneyPath" /></animateMotion>
            </circle>
            <circle r="2" fill="#EBCB87" opacity="0.45">
              <animateMotion dur="7.5s" begin="-0.2s" repeatCount="indefinite" rotate="auto"><mpath href="#ecJourneyPath" /></animateMotion>
            </circle>
            <circle r="1.4" fill="#EBCB87" opacity="0.25">
              <animateMotion dur="7.5s" begin="-0.4s" repeatCount="indefinite" rotate="auto"><mpath href="#ecJourneyPath" /></animateMotion>
            </circle>
          </svg>
        </div>
      </div>
    </section>
  );
}

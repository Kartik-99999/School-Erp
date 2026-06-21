"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import { UserPlus, CalendarCheck2, Receipt, GraduationCap, MessageSquare, ShieldCheck, KeyRound, Lock, MapPin, ArrowRight, Check, Mail } from "lucide-react";

const ParticleHero = dynamic(() => import("./ParticleHero"), { ssr: false, loading: () => null });

const EASE = [0.22, 1, 0.36, 1] as const;

function Rise({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 22, filter: "blur(6px)" }} whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold">{children}</div>;
}

function GridMark() {
  // The "operating grid" — a 3x3 cell glyph with a lit diagonal. Crafted, on-brand.
  const lit = new Set([2, 4, 6]);
  return (
    <span className="grid grid-cols-3 gap-[3px]" aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={`h-[6px] w-[6px] rounded-[1.5px] ${lit.has(i) ? "bg-gold" : "bg-gold/25"}`} />
      ))}
    </span>
  );
}

const modules = [
  { name: "Admissions", icon: UserPlus, body: "Enquiry to enrolment — Aadhaar & APAAR validated on the way in. No duplicate registers." },
  { name: "Attendance", icon: CalendarCheck2, body: "Per-period rolls. A parent knows their child is absent before assembly is over." },
  { name: "Fees", icon: Receipt, body: "Each school collects into its own Razorpay account. Receipts reconcile themselves." },
  { name: "Examinations", icon: GraduationCap, body: "Marks become board-ready report cards — CBSE-aware — in a few clicks." },
  { name: "Communication", icon: MessageSquare, body: "Notices, circulars and WhatsApp alerts — sent to one class, not the whole school." },
  { name: "People & access", icon: ShieldCheck, body: "Six roles, one login. Row-level isolation means every school sees only what's theirs." },
];

const pillars = [
  { label: "Tenant-isolated", icon: ShieldCheck, body: "Postgres row-level security — one school can never read another's data." },
  { label: "RS256 · 2FA", icon: KeyRound, body: "Asymmetric-signed sessions, optional two-factor, rotating refresh tokens." },
  { label: "Encrypted PII", icon: Lock, body: "Aadhaar, APAAR and PEN encrypted at rest and masked on screen." },
  { label: "Made for India", icon: MapPin, body: "Rupee-native, CBSE-aware, with Razorpay and WhatsApp built in." },
];

const stats: [string, string][] = [
  ["20+", "modules, one login"],
  ["6", "roles, fully isolated"],
  ["RLS", "per-school data walls"],
  ["₹ · UPI", "payments + WhatsApp"],
];

function DarkPreview() {
  const periods = ["I", "II", "III", "IV", "V", "VI"];
  const rows: [string, string[]][] = [
    ["VIII-A", ["Math", "Sci", "—", "Eng", "Hin", "P.E."]],
    ["VIII-B", ["Eng", "Math", "Sci", "—", "S.St", "Art"]],
    ["IX-A", ["Sci", "Eng", "Math", "Hin", "—", "Lab"]],
    ["IX-B", ["Hin", "S.St", "Eng", "Math", "Sci", "—"]],
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 28, filter: "blur(8px)" }} whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }} viewport={{ once: true }} transition={{ duration: 0.7, ease: EASE }} className="relative">
      <div className="absolute -inset-8 -z-10 rounded-[40px] bg-gold/10 blur-[70px]" />
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-void-700/80 backdrop-blur-md shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-2.5 border-b border-white/8 px-5 py-3.5">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-gold-300 to-gold-600 text-[11px] font-bold text-void">E</span>
          <span className="text-[13px] font-semibold text-warm">Today&apos;s timetable</span>
          <span className="ml-auto rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-gold">Period IV · live</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-[3rem_repeat(6,1fr)] gap-1.5">
            <div />
            {periods.map((p) => <div key={p} className="pb-1 text-center font-mono text-[10px] uppercase tracking-wide text-warm-400">{p}</div>)}
            {rows.map(([cls, cells], ri) => (
              <Fragment key={cls}>
                <div className="flex items-center text-[11px] font-semibold text-warm-400">{cls}</div>
                {cells.map((c, ci) => {
                  const live = ri === 0 && ci === 3;
                  const empty = c === "—";
                  return (
                    <div key={ci} className={`grid h-9 place-items-center rounded-md text-[11px] font-medium ${live ? "bg-gradient-to-br from-gold-300 to-gold-500 text-void shadow-[0_6px_18px_-6px_rgba(235,203,135,0.6)]" : empty ? "bg-white/[0.03] text-warm-400/30" : "bg-white/[0.05] text-warm-400"}`}>{c}</div>
                  );
                })}
              </Fragment>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[["Attendance", "96.4%"], ["Fees today", "₹2.4L"], ["Notices", "3 sent"]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="font-mono text-[10px] uppercase tracking-wide text-warm-400">{k}</div>
                <div className="mt-0.5 text-base font-bold text-warm">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen overflow-x-hidden bg-void font-body text-warm antialiased selection:bg-gold/25 selection:text-void">
        <div className="fixed inset-0 z-0"><ParticleHero /></div>
        <div className="relative z-10">
          {/* Nav — crafted mark, underline-draw links, scroll-aware bg */}
          <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${scrolled ? "border-b border-white/8 bg-void/80 backdrop-blur-xl" : "border-b border-transparent bg-transparent"}`}>
            <div className="mx-auto flex h-16 max-w-7xl items-center px-6 lg:px-10">
              <Link href="/" className="flex items-center gap-3">
                <GridMark />
                <span className="font-display text-[19px] font-semibold tracking-tight text-warm">Erpcore</span>
              </Link>
              <nav className="ml-auto hidden items-center gap-9 md:flex">
                {([["Modules", "#modules"], ["Security", "#trust"], ["Pricing", "#pricing"], ["Contact", "#contact"]] as [string, string][]).map(([label, href]) => (
                  <Link key={href} href={href} className="group relative py-1 text-sm font-medium text-warm-400 transition-colors hover:text-warm">
                    {label}
                    <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-gold transition-all duration-300 group-hover:w-full" />
                  </Link>
                ))}
                <Link href="/login" className="rounded-full border border-gold/40 px-5 py-2 text-sm font-semibold text-gold transition hover:bg-gold hover:text-void">Open dashboard</Link>
              </nav>
            </div>
          </header>

          {/* Hero — sand-formation (the fixed stage shows behind) */}
          <section className="relative h-screen w-full">
            <h1 className="sr-only">Erpcore — the operating system for your school</h1>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-void" />
            <div className="absolute inset-x-0 bottom-[14%] z-10 flex flex-col items-center px-6 text-center">
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.1, delay: 2.7 }} className="font-mono text-[11px] uppercase tracking-[0.42em] text-warm-400">
                The operating system for your school
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 3.0 }} className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link href="/login" className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-300 to-gold-500 px-6 py-3 text-sm font-semibold text-void shadow-[0_10px_40px_-10px_rgba(235,203,135,0.5)] transition hover:brightness-105">
                  Start your school <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link href="#modules" className="inline-flex items-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-warm-400 transition hover:border-white/30 hover:text-warm">See how it works</Link>
              </motion.div>
            </div>
          </section>

          {/* content scrim */}
          <div className="relative bg-void/72 backdrop-blur-[3px]">
            {/* Stats */}
            <section className="relative border-y border-white/5">
              <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-8 gap-y-10 px-6 py-14 sm:grid-cols-4 lg:px-10">
                {stats.map(([n, l], i) => (
                  <Rise key={l} delay={i * 0.08}>
                    <div className="font-display text-3xl font-bold text-warm sm:text-4xl">{n}</div>
                    <div className="mt-1.5 text-sm text-warm-400">{l}</div>
                  </Rise>
                ))}
              </div>
            </section>

            {/* Modules */}
            <section id="modules" className="relative mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-28">
              <Rise className="max-w-2xl">
                <Eyebrow>The modules</Eyebrow>
                <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-warm sm:text-4xl lg:text-5xl">Everything a school does, in one calm place.</h2>
              </Rise>
              <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((m, i) => (
                  <motion.div key={m.name} initial={{ opacity: 0, y: 28, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: i * 0.07, ease: EASE }}
                    className="group rounded-2xl border border-white/8 bg-void-700/50 p-7 transition-colors duration-300 hover:border-gold/30 hover:bg-void-700">
                    <div className="grid h-11 w-11 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold transition group-hover:-translate-y-0.5 group-hover:bg-gold group-hover:text-void">
                      <m.icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="mt-5 font-display text-lg font-semibold text-warm">{m.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-warm-400">{m.body}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* See it in action */}
            <section className="relative border-y border-white/5 bg-void-800/40">
              <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:py-28">
                <Rise>
                  <Eyebrow>See it in action</Eyebrow>
                  <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-warm sm:text-4xl">One screen, the whole school day.</h2>
                  <p className="mt-5 max-w-md text-[15px] leading-relaxed text-warm-400">Every role opens to exactly what they need — the live timetable, attendance marked period-by-period, fees reconciling in the background, notices already on their way.</p>
                  <ul className="mt-7 space-y-3">
                    {["Live period highlighted, in real time", "Attendance and fees update as they happen", "Each school sees only its own data"].map((t) => (
                      <li key={t} className="flex items-start gap-2.5 text-sm text-warm-400"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {t}</li>
                    ))}
                  </ul>
                </Rise>
                <DarkPreview />
              </div>
            </section>

            {/* Security */}
            <section id="trust" className="relative">
              <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-28">
                <Rise className="max-w-2xl">
                  <Eyebrow>Trusted with a child&apos;s data</Eyebrow>
                  <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-warm sm:text-4xl">Security isn&apos;t a feature page. It&apos;s the foundation.</h2>
                </Rise>
                <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {pillars.map((p, i) => (
                    <Rise key={p.label} delay={i * 0.08} className="h-full">
                      <div className="flex h-full flex-col rounded-2xl border border-white/8 bg-void-700/50 p-6 transition hover:border-gold/30">
                        <div className="grid h-11 w-11 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                          <p.icon className="h-5 w-5" strokeWidth={1.75} />
                        </div>
                        <div className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-gold">{p.label}</div>
                        <p className="mt-2.5 text-sm leading-relaxed text-warm-400">{p.body}</p>
                      </div>
                    </Rise>
                  ))}
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="relative border-t border-white/5 bg-void-800/40">
              <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-28">
                <Rise className="text-center">
                  <div className="flex justify-center"><Eyebrow>Pricing</Eyebrow></div>
                  <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold leading-tight text-warm sm:text-4xl lg:text-5xl">Start with one school, free.</h2>
                  <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-warm-400">Run a real pilot at no cost. When it earns its place, pay a simple per-student rate — no setup fee, no lock-in.</p>
                </Rise>
                <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2">
                  {[
                    { tag: "Pilot", price: "Free", note: "Your first school, full platform, for one term.", cta: "Start free", primary: false },
                    { tag: "Per school", price: "Talk to us", note: "Per-student pricing that scales with you, support included.", cta: "Book a walkthrough", primary: true },
                  ].map((tier, i) => (
                    <motion.div key={tier.tag} initial={{ opacity: 0, scale: 0.95, y: 24 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
                      className={`rounded-2xl border p-8 ${tier.primary ? "border-gold/50 bg-gradient-to-b from-gold/[0.10] to-transparent shadow-[0_24px_70px_-24px_rgba(235,203,135,0.35)]" : "border-white/8 bg-void-700/50"}`}>
                      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">{tier.tag}</div>
                      <div className="mt-3 font-display text-4xl font-bold text-warm">{tier.price}</div>
                      <p className="mt-3 text-sm leading-relaxed text-warm-400">{tier.note}</p>
                      <Link href="/login" className={`mt-7 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${tier.primary ? "bg-gradient-to-r from-gold-300 to-gold-500 text-void hover:brightness-105" : "border border-white/15 text-warm hover:border-white/30"}`}>{tier.cta}</Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="relative overflow-hidden border-t border-white/5">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/10 blur-[140px]" />
              <div className="relative mx-auto max-w-3xl px-6 py-20 text-center lg:py-24">
                <Rise>
                  <h2 className="font-display text-3xl font-bold leading-[1.08] tracking-tight text-warm sm:text-4xl lg:text-5xl">
                    Give your school its <span className="bg-gradient-to-r from-gold-300 to-gold-500 bg-clip-text text-transparent">operating system</span>.
                  </h2>
                  <p className="mx-auto mt-4 max-w-md text-[15px] text-warm-400">Set up your first school in an afternoon. Free to pilot.</p>
                  <div className="mt-8 flex justify-center">
                    <Link href="/login" className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-300 to-gold-500 px-7 py-3.5 text-sm font-semibold text-void shadow-[0_10px_40px_-10px_rgba(235,203,135,0.5)] transition hover:brightness-105">
                      Start your school <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </Rise>
              </div>
            </section>

                        {/* Connect */}
            <section id="contact" className="relative border-t border-white/5">
              <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
                <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-white/8 bg-void-700/40 p-8 sm:flex-row sm:items-center">
                  <div>
                    <Eyebrow>Talk to a human</Eyebrow>
                    <h3 className="mt-3 font-display text-2xl font-bold text-warm sm:text-3xl">Questions? We answer them ourselves.</h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-warm-400">Email us about a pilot, a demo, or anything about running your school on Erpcore. No bots, no phone tree.</p>
                  </div>
                  <a href="mailto:kartik@erpcore.tech" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-gold-300 to-gold-500 px-6 py-3 text-sm font-semibold text-void shadow-[0_10px_40px_-10px_rgba(235,203,135,0.5)] transition hover:brightness-105">
                    <Mail className="h-4 w-4" /> kartik@erpcore.tech
                  </a>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/8 bg-void-800/50">
              <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
                <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-5">
                  <div className="col-span-2">
                    <Link href="/" className="flex items-center gap-2.5"><GridMark /><span className="font-display text-base font-semibold text-warm">Erpcore</span></Link>
                    <p className="mt-4 max-w-xs text-sm leading-relaxed text-warm-400">The operating system for your school &mdash; admissions to fees, attendance to report cards, on one tenant-isolated platform built for India.</p>
                    <a href="mailto:kartik@erpcore.tech" className="mt-4 inline-flex items-center gap-2 text-sm text-gold transition hover:underline"><Mail className="h-4 w-4" /> kartik@erpcore.tech</a>
                  </div>
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-warm-400/70">Product</div>
                    <ul className="mt-4 space-y-2.5 text-sm">
                      <li><Link href="#modules" className="text-warm-400 transition hover:text-warm">Modules</Link></li>
                      <li><Link href="#trust" className="text-warm-400 transition hover:text-warm">Security</Link></li>
                      <li><Link href="#pricing" className="text-warm-400 transition hover:text-warm">Pricing</Link></li>
                      <li><Link href="/login" className="text-warm-400 transition hover:text-warm">Open dashboard</Link></li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-warm-400/70">Company</div>
                    <ul className="mt-4 space-y-2.5 text-sm">
                      <li><Link href="/about" className="text-warm-400 transition hover:text-warm">About us</Link></li>
                      <li><a href="mailto:kartik@erpcore.tech" className="text-warm-400 transition hover:text-warm">Contact</a></li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-warm-400/70">Legal</div>
                    <ul className="mt-4 space-y-2.5 text-sm">
                      <li><Link href="/privacy" className="text-warm-400 transition hover:text-warm">Privacy</Link></li>
                      <li><Link href="/terms" className="text-warm-400 transition hover:text-warm">Terms</Link></li>
                    </ul>
                  </div>
                </div>
                <div className="mt-12 flex flex-col gap-3 border-t border-white/8 pt-6 text-sm text-warm-400/70 sm:flex-row sm:items-center">
                  <span>&copy; 2026 Erpcore &middot; Built in India</span>
                  <span className="sm:ml-auto">erpcore.tech</span>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import GridMark from "@/components/brand/GridMark";
import SchoolDay from "./SchoolDay";

const ParticleHero = dynamic(() => import("./ParticleHero"), { ssr: false, loading: () => null });

const NAV: [string, string][] = [
  ["School day", "#day"],
  ["Modules", "#modules"],
  ["Security", "#security"],
  ["Pricing", "#pricing"],
];

// Grouped by who signs in to use them. Every item maps to a real screen in the app.
const MODULES: { who: string; role: string; items: string[] }[] = [
  {
    who: "For the school office",
    role: "School admin",
    items: [
      "Admissions",
      "Student records",
      "Classes and timetable",
      "Staff",
      "Attendance reports",
      "Exams and report cards",
      "Circulars and messages",
      "Transfer and bonafide certificates",
      "Library",
      "Transport",
      "Hostel",
      "Audit log",
    ],
  },
  {
    who: "For teachers",
    role: "Teacher",
    items: ["Attendance", "Class schedule", "Homework and assignments", "Marks entry", "Leave", "Lesson resources", "Parent appointments"],
  },
  {
    who: "For the accounts desk",
    role: "Accountant",
    items: ["Fee collection", "Online payments by UPI and card", "Receipts", "Payroll"],
  },
  {
    who: "For parents and students",
    role: "Parent and student",
    items: ["Attendance", "Timetable and homework", "Syllabus", "Exam results", "Fees and receipts", "Notices and polls", "Photo galleries", "Leave requests"],
  },
];

const SAFEGUARDS: [string, string][] = [
  ["Each school's data is walled off", "Every query runs under PostgreSQL row-level security, so one school's records cannot show up in another school's account."],
  ["ID numbers are encrypted", "Aadhaar, APAAR ID and PEN are encrypted when stored and masked on screen."],
  ["Two-step sign-in", "Accounts can be protected with a code from an authenticator app, on top of the password."],
  ["Fee money goes straight to the school", "Each school connects its own Razorpay account, so online payments settle with the school, not with us."],
];

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
      <div className="relative min-h-screen overflow-x-hidden bg-void font-body text-warm antialiased selection:bg-gold/25 selection:text-warm">
        <div className="fixed inset-0 z-0">
          <ParticleHero />
        </div>

        <div className="relative z-10">
          <header
            className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
              scrolled ? "border-white/[0.07] bg-void/85 backdrop-blur-xl" : "border-transparent bg-transparent"
            }`}
          >
            <div className="mx-auto flex h-16 max-w-6xl items-center px-6 lg:px-10">
              <Link href="/" className="flex items-center gap-3 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
                <GridMark />
                <span className="font-display text-[19px] font-semibold tracking-tight text-warm">Erpcore</span>
              </Link>
              <nav className="ml-auto hidden items-center gap-8 md:flex" aria-label="Sections">
                {NAV.map(([label, href]) => (
                  <a key={href} href={href} className="text-sm text-warm-400 transition-colors hover:text-warm">
                    {label}
                  </a>
                ))}
              </nav>
              <div className="ml-auto flex items-center gap-5 md:ml-10">
                <Link href="/login" className="text-sm text-warm-400 transition-colors hover:text-warm">
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full border border-gold/45 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-void"
                >
                  Start your school
                </Link>
              </div>
            </div>
          </header>

          {/* Hero: the gold particles form the wordmark on the fixed stage behind */}
          <section className="relative h-[100svh] w-full">
            <h1 className="sr-only">Erpcore, the operating system for your school</h1>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-void" />
            <div className="absolute inset-x-0 bottom-[13%] z-10 flex flex-col items-center px-6 text-center">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.1, delay: 2.7 }}
                className="max-w-[34rem] font-display text-[1.2rem] leading-snug text-warm-400 sm:text-[1.35rem]"
              >
                Runs attendance, fees, exams and parent messages for Indian schools.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 3.0 }}
                className="mt-8 flex flex-wrap items-center justify-center gap-3"
              >
                <Link href="/signup" className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-void transition hover:bg-gold-300">
                  Start your school
                </Link>
                <a href="#day" className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-warm-400 transition hover:border-white/30 hover:text-warm">
                  See a school day
                </a>
              </motion.div>
            </div>
          </section>

          <main className="relative bg-void/[0.9] backdrop-blur-[2px]">
            <SchoolDay />

            {/* Modules */}
            <section id="modules" className="scroll-mt-20 border-t border-white/[0.07]">
              <div className="mx-auto grid max-w-6xl gap-14 px-6 py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] lg:gap-20 lg:px-10 lg:py-32">
                <div className="lg:sticky lg:top-28 lg:self-start">
                  <h2 className="font-display text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.02em] text-warm sm:text-[2.75rem]">
                    What&apos;s included
                  </h2>
                  <p className="mt-5 max-w-sm text-[16.5px] leading-[1.65] text-warm-400">
                    Every school gets all of it. Each person signs in with their own role and sees only the part that role needs.
                  </p>
                </div>
                <div className="grid gap-x-14 gap-y-14 sm:grid-cols-2">
                  {MODULES.map((g) => (
                    <div key={g.who}>
                      <h3 className="font-display text-[1.15rem] font-semibold text-warm">{g.who}</h3>
                      <p className="mt-1 text-sm text-warm-600">{g.role} role</p>
                      <ul className="mt-5 space-y-2 text-[15.5px] text-warm-400">
                        {g.items.map((it) => (
                          <li key={it}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Security */}
            <section id="security" className="scroll-mt-20 border-t border-white/[0.07]">
              <div className="mx-auto max-w-6xl px-6 py-24 lg:px-10 lg:py-32">
                <h2 className="max-w-2xl font-display text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.02em] text-warm sm:text-[2.75rem]">
                  Looking after children&apos;s data
                </h2>
                <dl className="mt-14 grid gap-x-16 gap-y-12 sm:grid-cols-2">
                  {SAFEGUARDS.map(([title, body]) => (
                    <div key={title} className="border-t border-white/10 pt-6">
                      <dt className="font-display text-[1.15rem] font-semibold text-warm">{title}</dt>
                      <dd className="mt-2.5 max-w-[30rem] text-[15.5px] leading-[1.65] text-warm-400">{body}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>

            {/* Pricing and contact */}
            <section id="pricing" className="scroll-mt-20 border-t border-white/[0.07]">
              <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-end lg:gap-20 lg:px-10 lg:py-32">
                <div>
                  <h2 className="font-display text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.02em] text-warm [text-wrap:balance] sm:text-[3.25rem]">
                    Free for your first term
                  </h2>
                  <p className="mt-5 max-w-[30rem] text-[17px] leading-[1.65] text-warm-400">
                    Run your school on all of Erpcore for one term at no cost. After that it&apos;s a per-student rate with support included. Write to us and we&apos;ll quote for your school&apos;s size.
                  </p>
                </div>
                <div className="lg:pb-2">
                  <Link href="/signup" className="inline-block rounded-full bg-gold px-7 py-3.5 text-sm font-semibold text-void transition hover:bg-gold-300">
                    Start your school
                  </Link>
                  <p className="mt-7 text-[15.5px] leading-[1.65] text-warm-400">
                    Or write to{" "}
                    <a href="mailto:kartik@erpcore.tech" className="text-warm underline decoration-gold/50 underline-offset-4 transition hover:decoration-gold">
                      kartik@erpcore.tech
                    </a>
                    . Kartik, who builds Erpcore, reads and answers every email.
                  </p>
                </div>
              </div>
            </section>

            <footer className="border-t border-white/[0.07]">
              <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm sm:flex-row sm:items-center lg:px-10">
                <div className="flex items-center gap-3">
                  <GridMark cell={5} gap={2.5} />
                  <span className="text-warm-600">&copy; 2026 Erpcore. Made in India.</span>
                </div>
                <nav className="flex flex-wrap gap-x-6 gap-y-2 sm:ml-auto" aria-label="Footer">
                  {([["About", "/about"], ["Privacy", "/privacy"], ["Terms", "/terms"], ["Sign in", "/login"]] as [string, string][]).map(([l, h]) => (
                    <Link key={h} href={h} className="text-warm-400 transition-colors hover:text-warm">
                      {l}
                    </Link>
                  ))}
                </nav>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}

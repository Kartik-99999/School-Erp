"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Artifacts: each mirrors something the product really produces.    */
/* Names, numbers and dates are examples.                             */
/* ------------------------------------------------------------------ */

function AbsenceAlert() {
  return (
    <figure className="w-full max-w-[22rem] rounded-[20px] border border-white/10 bg-[#0E1013] p-4 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.9)]">
      <figcaption className="flex items-center gap-3 border-b border-white/[0.07] pb-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#1E2A24] font-display text-sm font-semibold text-[#9FC3AE]" aria-hidden>
          S
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-medium text-warm">School office</span>
          <span className="block text-xs text-warm-600">WhatsApp</span>
        </span>
      </figcaption>
      <div className="mt-4 max-w-[19.5rem] rounded-[16px] rounded-tl-[4px] bg-[#1C2420] px-3.5 pb-2 pt-2.5 text-[14px] leading-[1.5] text-[#E4EBE6]">
        Alert: Your ward Aarav Sharma has been marked ABSENT today (18-Nov-2026). Please contact the school if this is an error.
        <span className="mt-1 block text-right font-mono text-[11px] text-[#86998E]">7:56 am</span>
      </div>
    </figure>
  );
}

function FeeLedger() {
  const rows: [string, string, string, string, string, boolean][] = [
    ["09:41", "Aarav Sharma", "VIII-A", "UPI", "12,000", true],
    ["09:12", "Diya Patel", "VI-B", "Card", "8,400", false],
    ["08:55", "Kabir Shah", "X-A", "Cash", "15,600", false],
  ];
  return (
    <figure className="w-full max-w-[30rem] overflow-hidden rounded-md border border-white/10 bg-void-800">
      <figcaption className="flex items-baseline justify-between border-b border-white/[0.07] px-5 py-3.5">
        <span className="text-sm font-medium text-warm">Fees collected today</span>
        <span className="font-mono text-xs text-warm-600">18 Nov</span>
      </figcaption>
      <table className="w-full text-left text-[13.5px]">
        <tbody>
          {rows.map(([t, name, cls, mode, amt, isNew]) => (
            <tr key={name} className={`border-b border-white/[0.05] last:border-0 ${isNew ? "bg-gold/[0.06]" : ""}`}>
              <td className={`py-3 pl-5 pr-3 font-mono text-xs tabular-nums ${isNew ? "text-gold" : "text-warm-600"}`}>{t}</td>
              <td className="py-3 pr-3 text-warm">
                {name} <span className="text-warm-600">{cls}</span>
              </td>
              <td className="py-3 pr-3 text-warm-400">{mode}</td>
              <td className={`py-3 pr-5 text-right font-mono tabular-nums ${isNew ? "text-gold" : "text-warm"}`}>₹{amt}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 border-t border-white/[0.07] px-5 py-3 text-xs text-warm-400">
        <Check className="h-3.5 w-3.5 text-gold" strokeWidth={2.25} aria-hidden />
        Receipt R-04821 issued. Paid into the school&apos;s Razorpay account.
      </div>
    </figure>
  );
}

function MarkSheet() {
  const rows: [string, number, number, number][] = [
    ["Diya Patel", 92, 88, 90],
    ["Aarav Sharma", 86, 81, 88],
    ["Kavya Nair", 79, 84, 85],
    ["Rohan Joshi", 71, 76, 80],
  ];
  return (
    <figure className="w-full max-w-[30rem] overflow-hidden rounded-md border border-white/10 bg-void-800">
      <figcaption className="flex items-baseline justify-between border-b border-white/[0.07] px-5 py-3.5">
        <span className="text-sm font-medium text-warm">Half-yearly exam, VIII-A</span>
        <span className="text-xs text-warm-600">out of 100</span>
      </figcaption>
      <table className="w-full text-[12.5px] sm:text-[13.5px]">
        <thead>
          <tr className="text-xs text-warm-600">
            <th className="py-2.5 pl-4 text-left font-normal sm:pl-5">Student</th>
            {[["Maths", "Ma"], ["Science", "Sc"], ["English", "En"]].map(([full, short]) => (
              <th key={full} className="py-2.5 pl-2 text-right font-normal">
                <abbr title={full} className="no-underline sm:hidden">{short}</abbr>
                <span className="hidden sm:inline">{full}</span>
              </th>
            ))}
            <th className="py-2.5 pl-2 text-right font-normal">Total</th>
            <th className="py-2.5 pl-2 pr-4 text-right font-normal sm:pr-5">Rank</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {rows.map(([name, m, s, e], i) => (
            <tr key={name} className="border-t border-white/[0.05]">
              <td className="whitespace-nowrap py-2.5 pl-4 font-body text-warm sm:pl-5">{name}</td>
              <td className="py-2.5 pl-2 text-right text-warm-400">{m}</td>
              <td className="py-2.5 pl-2 text-right text-warm-400">{s}</td>
              <td className="py-2.5 pl-2 text-right text-warm-400">{e}</td>
              <td className="py-2.5 pl-2 text-right text-warm">{m + s + e}</td>
              <td className={`py-2.5 pl-2 pr-4 text-right sm:pr-5 ${i === 0 ? "text-gold" : "text-warm"}`}>{i + 1}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Circular() {
  const sections: [string, boolean][] = [["VIII-A", true], ["VIII-B", true], ["VIII-C", true], ["IX-A", false], ["IX-B", false]];
  return (
    <figure className="w-full max-w-[30rem] rounded-xl border border-white/10 bg-void-800 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-warm-600">To</span>
        {sections.map(([s, on]) => (
          <span
            key={s}
            className={`rounded-full border px-2.5 py-1 font-mono text-[11.5px] ${on ? "border-gold/50 bg-gold/10 text-gold" : "border-white/10 text-warm-600"}`}
          >
            {s}
          </span>
        ))}
      </div>
      <p className="mt-5 font-display text-[17px] font-semibold leading-snug text-warm">PTA meeting moved to Saturday</p>
      <p className="mt-2 text-[14px] leading-[1.6] text-warm-400">
        Dear parents, the parent-teacher meeting for class VIII will now be held on Saturday, 29 November, from 9 am to 12 noon in the school hall.
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
        <span className="text-xs text-warm-600">3 sections selected</span>
        <span className="rounded-full bg-gold px-3.5 py-1.5 text-xs font-semibold text-void">Send circular</span>
      </div>
    </figure>
  );
}

function TransferCertificate() {
  const fields: [string, string][] = [
    ["1. Name of pupil", "Aarav Sharma"],
    ["5. Date of birth", "14-03-2013"],
    ["6. Admission number", "2019/0457"],
    ["7. Class in which pupil last studied", "VIII-A"],
    ["9. Date of issue of certificate", "18-11-2026"],
  ];
  return (
    <figure
      className="relative w-full max-w-[26rem] overflow-hidden rounded-[3px] bg-[#F3EFE6] px-7 pb-10 pt-7 text-[#22201B] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.95)]"
      style={{ maskImage: "linear-gradient(to bottom, black 78%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black 78%, transparent)" }}
    >
      {/* Letterhead: the school's own name and address print here */}
      <div className="flex flex-col items-center gap-1.5 border-b border-[#22201B]/25 pb-4" aria-hidden>
        <span className="h-2.5 w-44 rounded-full bg-[#22201B]/80" />
        <span className="h-1.5 w-56 rounded-full bg-[#22201B]/25" />
      </div>
      <p className="mt-5 text-center text-[13px] font-bold tracking-wide underline underline-offset-4">TRANSFER CERTIFICATE</p>
      <dl className="mt-5 space-y-2.5 text-[12.5px]">
        {fields.map(([k, v]) => (
          <div key={k} className="flex items-baseline gap-2">
            <dt className="shrink-0 text-[#22201B]/70">{k}:</dt>
            <span className="min-w-4 flex-1 border-b border-dotted border-[#22201B]/35" aria-hidden />
            <dd className="shrink-0 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-9 grid grid-cols-3 gap-4 text-center text-[10.5px] text-[#22201B]/60">
        {["Prepared by", "Checked by", "Principal"].map((s) => (
          <span key={s} className="border-t border-[#22201B]/40 pt-1.5">{s}</span>
        ))}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------------ */

type Period = { time: string; title: string; body: ReactNode; artifact: ReactNode };

const PERIODS: Period[] = [
  {
    time: "07:55",
    title: "Roll call",
    body: "Class teachers mark the register on their phone. When a child is marked absent, their parent gets a WhatsApp message straight away, if the school has turned alerts on.",
    artifact: <AbsenceAlert />,
  },
  {
    time: "09:40",
    title: "Fees",
    body: "A parent pays the term fee by UPI from home. The money goes into the school's own Razorpay account, and the payment is recorded against the student with a receipt nobody has to type up.",
    artifact: <FeeLedger />,
  },
  {
    time: "12:10",
    title: "Marks",
    body: "Subject teachers enter half-yearly marks once. Totals and class ranks are worked out for every student, ready to print as report cards.",
    artifact: <MarkSheet />,
  },
  {
    time: "13:30",
    title: "Circulars",
    body: "The office writes one circular and sends it only to the sections it concerns. Parents and students read it when they sign in.",
    artifact: <Circular />,
  },
  {
    time: "15:20",
    title: "Certificates",
    body: "A family asks for a transfer certificate. The office prints it from the student's record, so names, dates of birth and admission numbers are never retyped. Bonafide certificates work the same way.",
    artifact: <TransferCertificate />,
  },
];

export default function SchoolDay() {
  const [active, setActive] = useState(0);
  const rows = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    // Light up the hour whose row crosses the middle of the viewport.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    rows.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="day" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-8 pt-28 lg:px-10 lg:pt-36">
      <div className="max-w-2xl">
        <h2 className="font-display text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.02em] text-warm sm:text-[3.25rem]">
          A school day on Erpcore
        </h2>
        <p className="mt-5 max-w-xl text-[17px] leading-[1.65] text-warm-400">
          What the software does between the first bell and the end of the day, at a school that runs on it. Names and numbers below are examples.
        </p>
      </div>

      <ol className="relative mt-16 lg:mt-24">
        {/* The day's rail */}
        <span aria-hidden className="absolute bottom-24 left-[5px] top-2 w-px bg-white/10 lg:left-[9.25rem]" />
        {PERIODS.map((p, i) => {
          const on = i === active;
          return (
            <li
              key={p.time}
              ref={(el) => { rows.current[i] = el; }}
              data-i={i}
              className="relative grid gap-y-5 pb-20 pl-9 last:pb-8 lg:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-x-14 lg:pb-24 lg:pl-0"
            >
              <span
                aria-hidden
                className={`absolute left-0 top-[0.4rem] h-[11px] w-[11px] rounded-full border motion-safe:transition-colors motion-safe:duration-500 lg:left-[calc(9.25rem-5px)] ${
                  on ? "border-gold bg-gold shadow-[0_0_0_5px_rgba(235,203,135,0.12)]" : "border-white/25 bg-void"
                }`}
              />
              <time className={`font-mono text-[15px] tabular-nums motion-safe:transition-colors motion-safe:duration-500 lg:pt-px lg:text-right ${on ? "text-gold" : "text-warm-600"}`}>
                {p.time}
              </time>
              <div>
                <h3 className="font-display text-2xl font-semibold tracking-[-0.01em] text-warm sm:text-[1.75rem]">{p.title}</h3>
                <p className="mt-3 max-w-[30rem] text-[16.5px] leading-[1.65] text-warm-400">{p.body}</p>
              </div>
              <div className="lg:pt-1">{p.artifact}</div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

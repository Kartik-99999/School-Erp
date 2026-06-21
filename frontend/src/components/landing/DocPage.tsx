import Link from "next/link";
import type { ReactNode } from "react";

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-10 font-display text-xl font-semibold text-warm">{children}</h2>;
}

export default function DocPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-void font-body text-warm antialiased">
      <header className="border-b border-white/8">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid grid-cols-3 gap-[3px]" aria-hidden>
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className={`h-[6px] w-[6px] rounded-[1.5px] ${[2, 4, 6].includes(i) ? "bg-gold" : "bg-gold/25"}`} />
              ))}
            </span>
            <span className="font-display text-[19px] font-semibold tracking-tight text-warm">Erpcore</span>
          </Link>
          <Link href="/" className="ml-auto text-sm text-warm-400 transition hover:text-warm">&larr; Back to home</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-4xl font-bold tracking-tight text-warm">{title}</h1>
        {updated && <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-warm-400">Last updated &middot; {updated}</p>}
        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-warm-400">{children}</div>
      </main>
      <footer className="border-t border-white/8">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-8 text-sm text-warm-400/70 sm:flex-row sm:items-center">
          <span>&copy; 2026 Erpcore &middot; Built in India</span>
          <a href="mailto:kartik@erpcore.tech" className="text-gold transition hover:underline sm:ml-auto">kartik@erpcore.tech</a>
        </div>
      </footer>
    </div>
  );
}

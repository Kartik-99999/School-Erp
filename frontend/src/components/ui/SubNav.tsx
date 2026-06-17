"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SubNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              active
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}

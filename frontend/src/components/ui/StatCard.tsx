import { ReactNode } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  /** Tailwind classes for the icon chip (e.g. "bg-primary-50 text-primary-600"). */
  iconClassName?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, icon, iconClassName, trend }: StatCardProps) {
  return (
    <div className="bg-surface-card rounded-card border border-border shadow-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[28px] leading-none font-bold text-ink truncate">{value}</p>
          <p className="text-[13px] font-medium text-ink-muted mt-2">{title}</p>
        </div>
        {icon && (
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              iconClassName || "bg-primary-50 text-primary-600"
            )}
          >
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-badge text-xs font-semibold",
              trend.isPositive ? "bg-success-bg text-success-text" : "bg-danger-bg text-danger-text"
            )}
          >
            {trend.isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}

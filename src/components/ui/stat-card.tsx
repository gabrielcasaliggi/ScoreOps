import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatVariant = "default" | "violet" | "emerald" | "blue" | "slate" | "amber" | "danger";

const variantStyles: Record<
  StatVariant,
  { icon: string; value: string; ring: string; wash: string }
> = {
  default: {
    icon: "bg-primary/10 text-primary",
    value: "text-foreground",
    ring: "ring-primary/10",
    wash: "from-primary/[0.04]",
  },
  violet: {
    icon: "bg-amber-500/10 text-amber-700",
    value: "text-amber-800",
    ring: "ring-amber-500/15",
    wash: "from-amber-500/[0.06]",
  },
  emerald: {
    icon: "bg-teal-500/10 text-teal-700",
    value: "text-teal-700",
    ring: "ring-teal-500/15",
    wash: "from-teal-500/[0.06]",
  },
  blue: {
    icon: "bg-blue-500/10 text-blue-600",
    value: "text-blue-700",
    ring: "ring-blue-500/15",
    wash: "from-blue-500/[0.05]",
  },
  slate: {
    icon: "bg-slate-500/10 text-slate-600",
    value: "text-foreground",
    ring: "ring-slate-500/10",
    wash: "from-slate-500/[0.04]",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-700",
    value: "text-amber-800",
    ring: "ring-amber-500/20",
    wash: "from-amber-500/[0.07]",
  },
  danger: {
    icon: "bg-red-500/10 text-red-600",
    value: "text-red-600",
    ring: "ring-red-500/20",
    wash: "from-red-500/[0.06]",
  },
};

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  variant?: StatVariant;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  variant = "default",
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/90 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.03),0_4px_14px_rgba(15,23,42,0.04)] ring-1 transition-shadow duration-200 hover:shadow-[0_1px_0_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.06)]",
        styles.ring,
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-80",
          styles.wash
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 font-display text-[1.75rem] font-semibold tracking-tight tabular-nums leading-none",
              styles.value
            )}
          >
            {value}
          </p>
          {hint && (
            <p className="mt-2 text-xs leading-snug text-muted-foreground">{hint}</p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
              styles.icon
            )}
          >
            <Icon className="icon-hover-pop h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

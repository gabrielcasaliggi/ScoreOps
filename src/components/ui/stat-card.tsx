import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatVariant = "default" | "violet" | "emerald" | "blue" | "slate";

const variantStyles: Record<
  StatVariant,
  { icon: string; value: string; ring: string }
> = {
  default: {
    icon: "bg-primary/10 text-primary",
    value: "text-foreground",
    ring: "ring-primary/10",
  },
  violet: {
    icon: "bg-violet-500/10 text-violet-600",
    value: "text-violet-600",
    ring: "ring-violet-500/15",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600",
    value: "text-emerald-600",
    ring: "ring-emerald-500/15",
  },
  blue: {
    icon: "bg-blue-500/10 text-blue-600",
    value: "text-blue-600",
    ring: "ring-blue-500/15",
  },
  slate: {
    icon: "bg-slate-500/10 text-slate-600",
    value: "text-foreground",
    ring: "ring-slate-500/10",
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
        "glass-card stat-shine group rounded-2xl p-5 ring-1 transition-all duration-200 hover:-translate-y-0.5",
        styles.ring,
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={cn("mt-2 text-3xl font-bold tracking-tight tabular-nums", styles.value)}>
            {value}
          </p>
          {hint && (
            <p className="mt-1.5 text-xs text-muted-foreground leading-snug">{hint}</p>
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

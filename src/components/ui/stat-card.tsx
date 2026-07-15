import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatVariant = "default" | "violet" | "emerald" | "blue" | "slate" | "amber" | "danger";

const variantStyles: Record<
  StatVariant,
  { icon: string; value: string; accent: string; wash: string }
> = {
  default: {
    icon: "bg-primary/10 text-primary",
    value: "text-foreground",
    accent: "bg-primary",
    wash: "from-primary/[0.05]",
  },
  violet: {
    icon: "bg-amber-500/10 text-amber-700",
    value: "text-amber-900",
    accent: "bg-amber-500",
    wash: "from-amber-500/[0.06]",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-700",
    value: "text-emerald-800",
    accent: "bg-emerald-600",
    wash: "from-emerald-500/[0.06]",
  },
  blue: {
    icon: "bg-blue-500/10 text-blue-700",
    value: "text-blue-900",
    accent: "bg-blue-700",
    wash: "from-blue-500/[0.05]",
  },
  slate: {
    icon: "bg-slate-500/10 text-slate-600",
    value: "text-foreground",
    accent: "bg-slate-500",
    wash: "from-slate-500/[0.04]",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-700",
    value: "text-amber-900",
    accent: "bg-amber-500",
    wash: "from-amber-500/[0.07]",
  },
  danger: {
    icon: "bg-red-500/10 text-red-600",
    value: "text-red-600",
    accent: "bg-red-500",
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
        "group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]",
        className
      )}
    >
      <div className={cn("absolute inset-y-0 left-0 w-1", styles.accent)} />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-90",
          styles.wash
        )}
      />
      <div className="relative flex items-start justify-between gap-3 pl-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "mt-1.5 font-display text-[1.65rem] font-bold tracking-tight tabular-nums leading-none",
              styles.value
            )}
          >
            {value}
          </p>
          {hint && (
            <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{hint}</p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              styles.icon
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  tone?: "neutral" | "success" | "amber";
}

const TONE: Record<NonNullable<EmptyStateProps["tone"]>, string> = {
  neutral: "from-slate-50/80 to-white border-border/60",
  success: "from-emerald-50/70 to-white border-emerald-100",
  amber: "from-amber-50/60 to-white border-amber-100",
};

const ICON_TONE: Record<NonNullable<EmptyStateProps["tone"]>, string> = {
  neutral: "bg-slate-100 text-slate-500",
  success: "bg-emerald-100 text-emerald-600",
  amber: "bg-amber-100 text-amber-700",
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  tone = "neutral",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border bg-gradient-to-b px-6 py-10 text-center",
        TONE[tone],
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm",
            ICON_TONE[tone]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

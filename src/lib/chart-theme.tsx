"use client";

export const CHART = {
  kpi: "#10b981",
  kpiLight: "#6ee7b7",
  efficiency: "#3b82f6",
  efficiencyLight: "#93c5fd",
  premio: "#8b5cf6",
  premioLight: "#c4b5fd",
  area: "#6366f1",
  grid: "#e2e8f0",
  muted: "#94a3b8",
} as const;

export const chartAxisStyle = {
  fontSize: 11,
  fill: CHART.muted,
  fontFamily: "inherit",
};

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm">
      {label && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-6 text-sm">
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums">
              {typeof entry.value === "number" ? `${Math.round(entry.value * 10) / 10}%` : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartGradientDefs() {
  return (
    <defs>
      <linearGradient id="gradKpi" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CHART.kpi} stopOpacity={0.9} />
        <stop offset="100%" stopColor={CHART.kpiLight} stopOpacity={0.6} />
      </linearGradient>
      <linearGradient id="gradEfficiency" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CHART.efficiency} stopOpacity={0.9} />
        <stop offset="100%" stopColor={CHART.efficiencyLight} stopOpacity={0.6} />
      </linearGradient>
      <linearGradient id="gradPremio" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CHART.premio} stopOpacity={0.95} />
        <stop offset="100%" stopColor={CHART.premioLight} stopOpacity={0.5} />
      </linearGradient>
      <linearGradient id="gradArea" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={CHART.area} stopOpacity={0.85} />
        <stop offset="100%" stopColor={CHART.premioLight} stopOpacity={0.7} />
      </linearGradient>
    </defs>
  );
}

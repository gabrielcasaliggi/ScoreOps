"use client";

export const CHART = {
  kpi: "#0d9488",
  kpiLight: "#5eead4",
  efficiency: "#2563eb",
  efficiencyLight: "#93c5fd",
  premio: "#7c3aed",
  premioLight: "#c4b5fd",
  area: "#0f766e",
  grid: "rgba(148, 163, 184, 0.28)",
  muted: "#64748b",
  cursor: "rgba(15, 23, 42, 0.04)",
} as const;

export const chartAxisStyle = {
  fontSize: 11,
  fill: CHART.muted,
  fontFamily: "inherit",
};

export const chartMargin = { top: 8, right: 8, left: -8, bottom: 0 };

export function ChartTooltip({
  active,
  payload,
  label,
  suffix = "%",
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; payload?: Record<string, unknown> }[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-2xl shadow-slate-900/10 backdrop-blur-md">
      {label && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-8 text-sm">
            <span className="flex items-center gap-2 text-slate-600">
              <span
                className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums text-slate-900">
              {typeof entry.value === "number"
                ? `${Math.round(entry.value * 10) / 10}${suffix}`
                : entry.value}
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
        <stop offset="0%" stopColor={CHART.kpi} stopOpacity={1} />
        <stop offset="100%" stopColor={CHART.kpiLight} stopOpacity={0.55} />
      </linearGradient>
      <linearGradient id="gradEfficiency" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CHART.efficiency} stopOpacity={1} />
        <stop offset="100%" stopColor={CHART.efficiencyLight} stopOpacity={0.5} />
      </linearGradient>
      <linearGradient id="gradPremio" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CHART.premio} stopOpacity={1} />
        <stop offset="100%" stopColor={CHART.premioLight} stopOpacity={0.45} />
      </linearGradient>
      <linearGradient id="gradArea" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={CHART.area} stopOpacity={0.95} />
        <stop offset="100%" stopColor={CHART.kpiLight} stopOpacity={0.75} />
      </linearGradient>
      <filter id="barSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.08" />
      </filter>
    </defs>
  );
}

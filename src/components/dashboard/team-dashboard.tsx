"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, CheckCircle2, Download, FileSpreadsheet, TrendingUp, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  CHART,
  ChartGradientDefs,
  ChartTooltip,
  chartAxisStyle,
} from "@/lib/chart-theme";
import type { EmployeeProductivity } from "@/lib/productivity";
import { formatPremioResumen } from "@/lib/premio-formula";
import { PremioFormulaExplainer } from "@/components/dashboard/premio-formula-explainer";
import { cn, formatPercent, getInitials } from "@/lib/utils";

type EmpleadoPremio = EmployeeProductivity;

interface TeamDashboardProps {
  resumen: {
    totalEmpleados: number;
    kpiPromedioEquipo: number;
    eficienciaPromedioEquipo: number;
    tareasCompletadas: number;
    puntajePremioPromedio?: number;
  };
  empleados: EmpleadoPremio[];
  porArea?: { area: string; empleados: number; puntajePromedio: number }[];
  periodoLabel?: string;
}

function rankPodiumClass(index: number): string {
  if (index === 0) return "rank-podium-1";
  if (index === 1) return "rank-podium-2";
  if (index === 2) return "rank-podium-3";
  return "";
}

export function TeamDashboard({
  resumen,
  empleados,
  porArea: porAreaProp,
  periodoLabel,
}: TeamDashboardProps) {
  function downloadReport(format: "xlsx" | "pdf") {
    window.open(`/api/export/equipo?format=${format}`, "_blank");
  }

  const chartData = empleados.map((e) => ({
    nombre: `${e.nombre} ${e.apellido.charAt(0)}.`,
    kpi: e.kpiPromedio,
    eficiencia: Math.round(e.productivityBonus.eficienciaEvaluable),
    premio: e.productivityBonus.puntajePremio,
    area: e.area,
  }));

  const rankingPremio = [...empleados].sort(
    (a, b) => b.productivityBonus.puntajePremio - a.productivityBonus.puntajePremio
  );

  const areaData =
    porAreaProp ??
    Object.entries(
      empleados.reduce<Record<string, { kpi: number; count: number }>>((acc, e) => {
        if (!acc[e.area]) acc[e.area] = { kpi: 0, count: 0 };
        acc[e.area].kpi += e.kpiPromedio;
        acc[e.area].count += 1;
        return acc;
      }, {})
    ).map(([area, data]) => ({
      area,
      kpiPromedio: Math.round((data.kpi / data.count) * 10) / 10,
      puntajePromedio: undefined as number | undefined,
    }));

  const maxPremio = Math.max(...rankingPremio.map((e) => e.productivityBonus.puntajePremio), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl bg-white/80"
          onClick={() => downloadReport("xlsx")}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl bg-white/80"
          onClick={() => downloadReport("pdf")}
        >
          <Download className="mr-2 h-4 w-4" />
          PDF
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Empleados"
          value={resumen.totalEmpleados}
          icon={Users}
          variant="slate"
        />
        <StatCard
          label="KPI equipo"
          value={formatPercent(resumen.kpiPromedioEquipo)}
          icon={TrendingUp}
          variant="emerald"
        />
        <StatCard
          label="Eficiencia"
          value={formatPercent(resumen.eficienciaPromedioEquipo)}
          icon={Zap}
          variant="blue"
        />
        <StatCard
          label="Premio Art. 49"
          value={`${resumen.puntajePremioPromedio ?? "—"}%`}
          hint="Promedio del % del sueldo de referencia (máx. 50%)"
          icon={Award}
          variant="violet"
        />
      </div>

      <PremioFormulaExplainer compact />

      <Card className="glass-card overflow-hidden border-violet-200/60">
        <CardHeader className="border-b border-violet-100/80 bg-gradient-to-r from-violet-50/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <Award className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Ranking premio Art. 49</CardTitle>
              <CardDescription>
                % del sueldo básico + antigüedad acumulado por persona (máx. 50%)
                {periodoLabel ? ` · ${periodoLabel}` : ""}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {rankingPremio.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Sin datos de empleados en este período
            </p>
          ) : (
            <div className="space-y-3">
              {rankingPremio.map((e, i) => {
                const pct = (e.productivityBonus.puntajePremio / maxPremio) * 100;
                return (
                  <div
                    key={e.userId}
                    className={cn(
                      "rounded-2xl border p-4 transition-all hover:shadow-md",
                      rankPodiumClass(i)
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-4">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm",
                          i === 0
                            ? "hero-gradient text-white"
                            : i === 1
                              ? "bg-slate-200 text-slate-700"
                              : i === 2
                                ? "bg-amber-200 text-amber-900"
                                : "bg-muted text-muted-foreground"
                        )}
                      >
                        {i + 1}
                      </span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-bold text-primary shadow-sm ring-2 ring-white">
                        {getInitials(e.nombre, e.apellido)}
                      </div>
                      <div className="min-w-[140px] flex-1">
                        <p className="font-semibold">
                          {e.nombre} {e.apellido}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {e.area} · {e.productivityBonus.tareasEvaluablesCompletadas} evaluables
                        </p>
                        <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-black/5">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right ml-auto">
                        <p className="text-2xl font-bold text-violet-600 tabular-nums">
                          {e.productivityBonus.puntajePremio}
                        </p>
                        <p className="text-[11px] text-muted-foreground max-w-xs">
                          {formatPremioResumen(e.productivityBonus)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Rendimiento por empleado</CardTitle>
            <CardDescription>Comparativa KPI vs eficiencia evaluable</CardDescription>
          </CardHeader>
          <CardContent className="h-[22rem]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4} barCategoryGap="20%">
                <ChartGradientDefs />
                <CartesianGrid stroke={CHART.grid} strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="nombre" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="kpi" name="KPI %" fill="url(#gradKpi)" radius={[6, 6, 0, 0]} />
                <Bar
                  dataKey="eficiencia"
                  name="Eficiencia %"
                  fill="url(#gradEfficiency)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Curva premio Art. 49</CardTitle>
            <CardDescription>% del sueldo de referencia por empleado</CardDescription>
          </CardHeader>
          <CardContent className="h-[22rem]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <ChartGradientDefs />
                <CartesianGrid stroke={CHART.grid} strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="nombre" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 50]} tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="premio"
                  name="Premio % sueldo"
                  stroke={CHART.premio}
                  strokeWidth={3}
                  dot={{ r: 5, fill: CHART.premio, strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 7, fill: CHART.premio }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {areaData.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">
              {porAreaProp ? "Puntaje premio por área" : "Cumplimiento por área"}
            </CardTitle>
            {periodoLabel && <CardDescription>{periodoLabel}</CardDescription>}
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={areaData.map((a) => ({
                  area: a.area,
                  valor:
                    "puntajePromedio" in a && a.puntajePromedio != null
                      ? a.puntajePromedio
                      : "kpiPromedio" in a
                        ? (a as { kpiPromedio: number }).kpiPromedio
                        : 0,
                }))}
                layout="vertical"
                barSize={20}
              >
                <ChartGradientDefs />
                <CartesianGrid stroke={CHART.grid} strokeDasharray="4 4" horizontal={false} />
                <XAxis type="number" domain={[0, 50]} tick={chartAxisStyle} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="area"
                  width={130}
                  tick={chartAxisStyle}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="valor" name="Puntaje" radius={[0, 8, 8, 0]}>
                  {areaData.map((_, i) => (
                    <Cell key={i} fill="url(#gradArea)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Detalle por empleado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="px-5 py-3 text-left">Empleado</th>
                  <th className="px-5 py-3 text-left">Área</th>
                  <th className="px-5 py-3 text-right">KPI</th>
                  <th className="px-5 py-3 text-right">Eficiencia</th>
                  <th className="px-5 py-3 text-right">a–e</th>
                  <th className="px-5 py-3 text-right">Premio %</th>
                  <th className="px-5 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {empleados.map((e) => (
                  <tr key={e.userId} className="border-b border-border/50 last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {getInitials(e.nombre, e.apellido)}
                        </span>
                        <span className="font-medium">
                          {e.nombre} {e.apellido}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{e.area}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {formatPercent(e.kpiPromedio)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {formatPercent(e.productivityBonus.eficienciaEvaluable)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground font-mono text-xs">
                      {e.productivityBonus.art49?.tramos
                        .filter((t) => t.activo)
                        .map((t) => t.id)
                        .join("") || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-violet-600 tabular-nums">
                      {e.productivityBonus.puntajePremio}%
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">
                      {e.productivityBonus.art49 && e.productivityBonus.art49.montoTotal > 0
                        ? `$${e.productivityBonus.art49.montoTotal.toLocaleString("es-AR")}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

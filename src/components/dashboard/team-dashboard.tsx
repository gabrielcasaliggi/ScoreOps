"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  CHART,
  ChartGradientDefs,
  ChartTooltip,
  chartAxisStyle,
  chartMargin,
} from "@/lib/chart-theme";
import type { EmployeeProductivity } from "@/lib/productivity";
import { formatPremioResumen } from "@/lib/premio-formula";
import { PremioFormulaExplainer } from "@/components/dashboard/premio-formula-explainer";
import {
  LatencyMetricsPanel,
  latencyCell,
} from "@/components/dashboard/latency-metrics-panel";
import { cn, formatPercent, getInitials } from "@/lib/utils";
import type { AggregatedLatencies } from "@/lib/task-latency";
import { formatLatencyMinutes } from "@/lib/task-latency";

const PREMIO_UMBRAL_INTERVENCION = 20;

type EmpleadoPremio = EmployeeProductivity & {
  latencias?: AggregatedLatencies;
};

interface TeamDashboardProps {
  resumen: {
    totalEmpleados: number;
    kpiPromedioEquipo: number;
    eficienciaPromedioEquipo: number;
    tareasCompletadas: number;
    puntajePremioPromedio?: number;
  };
  empleados: EmpleadoPremio[];
  latencias?: AggregatedLatencies;
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
  latencias,
  porArea: porAreaProp,
  periodoLabel,
}: TeamDashboardProps) {
  function downloadReport(format: "xlsx" | "pdf") {
    window.open(`/api/export/equipo?format=${format}`, "_blank");
  }

  const rankingPremio = [...empleados].sort(
    (a, b) => b.productivityBonus.puntajePremio - a.productivityBonus.puntajePremio
  );

  const chartData = rankingPremio.map((e) => ({
    nombre: `${e.nombre} ${e.apellido.charAt(0)}.`,
    kpi: e.kpiPromedio,
    eficiencia: Math.round(e.productivityBonus.eficienciaEvaluable),
    premio: e.productivityBonus.puntajePremio,
    area: e.area,
  }));

  const aIntervenir = empleados
    .map((e) => {
      const art49 = e.productivityBonus.art49;
      const premio = e.productivityBonus.puntajePremio;
      const premioBajo = premio < PREMIO_UMBRAL_INTERVENCION;

      let motivo: string | null = null;
      if (art49 && !art49.elegible) {
        motivo = art49.motivoInelegible ?? "No elegible al premio";
      } else if (art49?.bloqueaTramosCondicionales) {
        motivo = "Bloqueo individual (asistencia / sanciones) — tramos b–e off";
      } else if (art49) {
        const individualesOff = art49.tramos
          .filter((t) => (t.id === "a" || t.id === "b") && !t.activo)
          .map((t) => t.id.toUpperCase());
        if (individualesOff.length > 0) {
          motivo = `Sin tramo(s) individual(es) ${individualesOff.join(", ")}`;
        } else if (premioBajo) {
          motivo = `Premio bajo (${premio}%)`;
        }
      } else if (premioBajo) {
        motivo = `Premio bajo (${premio}%)`;
      }

      return motivo
        ? {
            userId: e.userId,
            nombre: e.nombre,
            apellido: e.apellido,
            area: e.area,
            premio,
            motivo,
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => a.premio - b.premio)
    .slice(0, 6);

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

      {aIntervenir.length > 0 && (
        <Card className="dash-focus-strip border-0 shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
              <div>
                <CardTitle className="text-base text-amber-950">Quién intervenir</CardTitle>
                <CardDescription className="text-amber-900/70">
                  Premio bajo o tramos individuales sin activar
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aIntervenir.map((p) => (
                <li
                  key={p.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200/80 bg-white px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {p.nombre} {p.apellido}
                      <span className="ml-1 text-muted-foreground">· {p.area}</span>
                    </p>
                    <p className="text-xs text-amber-800">{p.motivo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-sm font-semibold text-slate-800">
                      {p.premio}%
                    </span>
                    <Link href={`/dashboard/tareas?userId=${p.userId}`}>
                      <Button variant="outline" size="sm" className="h-7 rounded-lg text-xs">
                        Ver tareas
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
          label="% premio del sueldo"
          value={`${resumen.puntajePremioPromedio ?? "—"}%`}
          hint="Promedio del equipo (máximo posible: 50%)"
          icon={Award}
          variant="slate"
        />
      </div>

      {latencias && <LatencyMetricsPanel latencias={latencias} />}

      <PremioFormulaExplainer compact />

      <Card className="dash-panel overflow-hidden border-0 shadow-none">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Award className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <CardTitle className="font-display text-lg font-bold tracking-tight">
                Quién va mejor (ranking)
              </CardTitle>
              <CardDescription>
                % del sueldo acumulado por persona (máx. 50%)
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
                            className="h-full rounded-full bg-slate-700 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right ml-auto">
                        <p className="text-2xl font-bold text-slate-800 tabular-nums">
                          {e.productivityBonus.puntajePremio}
                          <span className="text-sm font-semibold text-muted-foreground">%</span>
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
        <Card className="dash-panel border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Rendimiento por empleado</CardTitle>
            <CardDescription>Comparativa KPI vs eficiencia evaluable (0–100)</CardDescription>
          </CardHeader>
          <CardContent className="chart-surface h-[22rem] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={6} barCategoryGap="22%" margin={chartMargin}>
                <ChartGradientDefs />
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="nombre" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: CHART.cursor, radius: 8 }}
                  content={<ChartTooltip />}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="kpi" name="KPI %" fill="url(#gradKpi)" radius={[8, 8, 0, 0]} />
                <Bar
                  dataKey="eficiencia"
                  name="Eficiencia %"
                  fill="url(#gradEfficiency)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="dash-panel border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Premio % por persona</CardTitle>
            <CardDescription>
              Cómo se reparte el % del sueldo (escala 0–50), de mayor a menor
            </CardDescription>
          </CardHeader>
          <CardContent className="chart-surface h-[22rem] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="18%" margin={chartMargin}>
                <ChartGradientDefs />
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="nombre" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 50]} tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: CHART.cursor, radius: 8 }}
                  content={<ChartTooltip />}
                />
                <Bar
                  dataKey="premio"
                  name="Premio % sueldo"
                  fill="url(#gradPremio)"
                  radius={[8, 8, 0, 0]}
                  filter="url(#barSoftShadow)"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {areaData.length > 0 && (
        <Card className="dash-panel border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">
              {porAreaProp ? "Puntaje premio por área" : "KPI promedio por área"}
            </CardTitle>
            {periodoLabel && <CardDescription>{periodoLabel}</CardDescription>}
          </CardHeader>
          <CardContent className="chart-surface h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={areaData.map((a) => ({
                  area: a.area,
                  valor:
                    porAreaProp && "puntajePromedio" in a && a.puntajePromedio != null
                      ? a.puntajePromedio
                      : "kpiPromedio" in a
                        ? (a as { kpiPromedio: number }).kpiPromedio
                        : 0,
                }))}
                layout="vertical"
                barSize={22}
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <ChartGradientDefs />
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, porAreaProp ? 50 : 100]}
                  tick={chartAxisStyle}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="area"
                  width={130}
                  tick={chartAxisStyle}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: CHART.cursor }}
                  content={<ChartTooltip />}
                />
                <Bar
                  dataKey="valor"
                  name={porAreaProp ? "Premio %" : "KPI %"}
                  radius={[0, 10, 10, 0]}
                >
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
                  <th
                    className="px-5 py-3 text-right"
                    title="Ciclo total promedio (asignación → cierre)"
                  >
                    Ciclo
                  </th>
                  <th className="px-5 py-3 text-right" title="Tramos activos: a base, b asistencia, c–e metas de equipo">
                    Tramos a–e
                  </th>
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
                    <td
                      className="px-5 py-3.5 text-right tabular-nums text-muted-foreground"
                      title={
                        e.latencias
                          ? `Inicio ${formatLatencyMinutes(e.latencias.demoraInicio.avg)} · Activo ${formatLatencyMinutes(e.latencias.tiempoActivo.avg)}`
                          : undefined
                      }
                    >
                      {latencyCell(e.latencias)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground font-mono text-xs">
                      {e.productivityBonus.art49
                        ? e.productivityBonus.art49.tramos
                            .map((t) => (t.activo ? t.id.toUpperCase() : "·"))
                            .join(" ")
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-800 tabular-nums">
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

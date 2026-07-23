"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  LatencyMetricsPanel,
  latencyCell,
} from "@/components/dashboard/latency-metrics-panel";
import {
  CHART,
  ChartGradientDefs,
  ChartTooltip,
  chartAxisStyle,
  chartMargin,
} from "@/lib/chart-theme";
import { formatPercent } from "@/lib/utils";
import type { ExecutiveReport } from "@/lib/executive-stats";
import { formatLatencyMinutes } from "@/lib/task-latency";

const SALUD_VARIANT: Record<string, "emerald" | "amber" | "danger"> = {
  Saludable: "emerald",
  Atención: "amber",
  Crítico: "danger",
};

const ALERTA_LABEL: Record<string, string> = {
  vencidas: "Vencidas",
  sobrecarga: "Sobrecarga",
  kpi_bajo: "KPI bajo",
};

export function ExecutiveDashboard() {
  const [data, setData] = useState<ExecutiveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [areaFiltro, setAreaFiltro] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stats/ejecutivo");
      if (!res.ok) {
        setError("No se pudo cargar el dashboard ejecutivo.");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const personasFiltradas = useMemo(() => {
    if (!data) return [];
    if (!areaFiltro) return data.porPersona;
    return data.porPersona.filter((p) => p.area === areaFiltro);
  }, [data, areaFiltro]);

  if (loading) return <DashboardSkeleton stats={4} panels={2} />;

  if (error || !data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        tone="amber"
        title={error || "Sin datos"}
        description="No pudimos cargar la vista ejecutiva."
        action={
          <Button variant="outline" className="rounded-xl" onClick={load}>
            Reintentar
          </Button>
        }
      />
    );
  }

  const saludVariant = SALUD_VARIANT[data.salud.etiqueta] ?? "amber";
  const pipelineChart = [
    { nombre: "Pendientes", valor: data.pipeline.pendientes, fill: CHART.muted },
    { nombre: "En proceso", valor: data.pipeline.enProceso, fill: CHART.efficiency },
    { nombre: "En revisión", valor: data.pipeline.enAprobacion, fill: CHART.premio },
    { nombre: "Completadas", valor: data.pipeline.completadas, fill: CHART.kpi },
  ];

  const areaChart = data.porArea.map((a) => ({
    nombre: a.nombre.length > 14 ? `${a.nombre.slice(0, 12)}…` : a.nombre,
    abiertas: a.tareasAbiertas,
    vencidas: a.tareasVencidas,
    completadas: a.tareasCompletadas,
    kpi: a.kpiPromedio,
  }));

  const cargaChart = [...data.porPersona]
    .sort((a, b) => b.tareasAbiertas - a.tareasAbiertas)
    .slice(0, 12)
    .map((p) => ({
      nombre: `${p.nombre} ${p.apellido.charAt(0)}.`,
      abiertas: p.tareasAbiertas,
      vencidas: p.tareasVencidas,
    }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="dash-eyebrow">Consejo</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Vista ejecutiva</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {data.periodo.label} · {data.plantillaPremio.nombre} · análisis de tareas y equipos
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={load} className="rounded-xl">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button
            variant="default"
            size="sm"
            className="rounded-xl shadow-md shadow-primary/20"
            onClick={() => {
              window.location.href = "/api/export/ejecutivo";
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {(data.resumen.tareasVencidas > 0 ||
        data.resumen.objetivosEnRiesgo > 0 ||
        data.distribucionCarga.sobrecargados.length > 0) && (
        <div className="dash-focus-strip flex flex-wrap items-center gap-2 px-4 py-3.5 text-sm">
          <span className="font-semibold text-amber-950">Hoy</span>
          {data.resumen.tareasVencidas > 0 && (
            <Link
              href="/dashboard/tareas?vencidas=1"
              className="rounded-lg bg-white/90 px-2.5 py-1 font-medium text-amber-900 shadow-sm ring-1 ring-amber-200/80"
            >
              {data.resumen.tareasVencidas} vencidas
            </Link>
          )}
          {data.pipeline.altaPrioridadAbiertas > 0 && (
            <span className="rounded-lg bg-white/90 px-2.5 py-1 font-medium text-amber-900 shadow-sm ring-1 ring-amber-200/80">
              {data.pipeline.altaPrioridadAbiertas} alta prioridad
            </span>
          )}
          {data.resumen.objetivosEnRiesgo > 0 && (
            <Link
              href="/dashboard/objetivos"
              className="rounded-lg bg-white/90 px-2.5 py-1 font-medium text-amber-900 shadow-sm ring-1 ring-amber-200/80"
            >
              {data.resumen.objetivosEnRiesgo} objetivos en riesgo
            </Link>
          )}
          {data.distribucionCarga.sobrecargados.length > 0 && (
            <span className="rounded-lg bg-white/90 px-2.5 py-1 font-medium text-amber-900 shadow-sm ring-1 ring-amber-200/80">
              {data.distribucionCarga.sobrecargados.length} sobrecargadas
            </span>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-stagger">
        <StatCard
          label="Salud operativa"
          value={`${data.salud.score}/100`}
          hint={data.salud.etiqueta}
          icon={TrendingUp}
          variant={saludVariant}
        />
        <StatCard
          label="KPI / eficiencia"
          value={formatPercent(data.resumen.kpiPromedioOrg)}
          hint={`Eficiencia ${formatPercent(data.resumen.eficienciaPromedioOrg)}`}
          icon={BarChart3}
          variant="blue"
        />
        <StatCard
          label="Tareas vencidas"
          value={data.resumen.tareasVencidas}
          hint={`${data.resumen.tareasAbiertas} abiertas · puntualidad ${data.calidadTareas.puntualidadPct}%`}
          icon={AlertTriangle}
          variant={data.resumen.tareasVencidas > 0 ? "danger" : "emerald"}
        />
        <StatCard
          label="Completadas"
          value={data.pipeline.completadas}
          hint={`Eficiencia temporal ${data.calidadTareas.eficienciaTemporalPct}%`}
          icon={CheckCircle2}
          variant="emerald"
        />
      </div>

      <LatencyMetricsPanel latencias={data.latencias} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="dash-panel border-0 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-teal-700" />
              Pipeline de tareas
            </CardTitle>
            <CardDescription>Estado actual de todo el trabajo cargado</CardDescription>
          </CardHeader>
          <CardContent className="chart-surface h-72 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineChart} margin={chartMargin} barCategoryGap="28%">
                <ChartGradientDefs />
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="nombre" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={chartAxisStyle} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: CHART.cursor }} content={<ChartTooltip suffix="" />} />
                <Bar dataKey="valor" name="Tareas" radius={[8, 8, 0, 0]}>
                  {pipelineChart.map((entry) => (
                    <Cell key={entry.nombre} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="grid grid-cols-2 gap-2 px-6 pb-5 text-xs sm:grid-cols-4">
            {pipelineChart.map((item) => (
              <div key={item.nombre} className="rounded-xl bg-white/70 px-3 py-2 ring-1 ring-slate-200/70">
                <p className="text-muted-foreground">{item.nombre}</p>
                <p className="text-lg font-bold tabular-nums">{item.valor}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="dash-panel border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Equipos: abiertas vs hechas</CardTitle>
            <CardDescription>Comparativa de carga y entrega por área</CardDescription>
          </CardHeader>
          <CardContent className="chart-surface h-[22rem] pt-2">
            {areaChart.length === 0 ? (
              <EmptyState title="Sin áreas" description="Configurá áreas para ver el desglose." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaChart} margin={chartMargin} barGap={4} barCategoryGap="18%">
                  <ChartGradientDefs />
                  <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="nombre" tick={chartAxisStyle} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={chartAxisStyle} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: CHART.cursor }} content={<ChartTooltip suffix="" />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="abiertas" name="Abiertas" fill="url(#gradEfficiency)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="vencidas" name="Vencidas" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="completadas" name="Completadas" fill="url(#gradKpi)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="dash-panel border-0 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Detalle por equipo</CardTitle>
          <CardDescription>KPI, eficiencia, puntualidad y stock de tareas</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="data-table w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Área</th>
                <th className="pb-2 text-right">Emp.</th>
                <th className="pb-2 text-right">KPI</th>
                <th className="pb-2 text-right">Efic.</th>
                <th className="pb-2 text-right">Pend.</th>
                <th className="pb-2 text-right">Proceso</th>
                <th className="pb-2 text-right">Abiertas</th>
                <th className="pb-2 text-right">Venc.</th>
                <th className="pb-2 text-right">Hechas</th>
                <th className="pb-2 text-right">Puntual.</th>
                <th className="pb-2 text-right" title="Ciclo total promedio">
                  Ciclo
                </th>
              </tr>
            </thead>
            <tbody>
              {data.porArea.map((a) => (
                <tr key={a.areaId} className="border-b border-border/50 last:border-0">
                  <td className="py-3 font-medium">{a.nombre}</td>
                  <td className="py-3 text-right tabular-nums">{a.empleados}</td>
                  <td className="py-3 text-right tabular-nums">{formatPercent(a.kpiPromedio)}</td>
                  <td className="py-3 text-right tabular-nums">{formatPercent(a.eficienciaPromedio)}</td>
                  <td className="py-3 text-right tabular-nums">{a.tareasPendientes}</td>
                  <td className="py-3 text-right tabular-nums">{a.tareasEnProceso}</td>
                  <td className="py-3 text-right tabular-nums">{a.tareasAbiertas}</td>
                  <td className="py-3 text-right tabular-nums">
                    {a.tareasVencidas > 0 ? (
                      <span className="font-semibold text-destructive">{a.tareasVencidas}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 text-right tabular-nums">{a.tareasCompletadas}</td>
                  <td className="py-3 text-right tabular-nums">{a.puntualidadPct}%</td>
                  <td
                    className="py-3 text-right tabular-nums text-muted-foreground"
                    title={`Inicio ${formatLatencyMinutes(a.latencias.demoraInicio.avg)} · Activo ${formatLatencyMinutes(a.latencias.tiempoActivo.avg)}`}
                  >
                    {latencyCell(a.latencias)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="dash-panel border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Carga por persona</CardTitle>
            <CardDescription>Top 12 por tareas abiertas (vencidas en rojo)</CardDescription>
          </CardHeader>
          <CardContent className="chart-surface h-[22rem] pt-2">
            {cargaChart.length === 0 ? (
              <EmptyState title="Sin empleados" description="No hay plantilla activa para graficar." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cargaChart} layout="vertical" margin={{ ...chartMargin, left: 8 }} barSize={14}>
                  <ChartGradientDefs />
                  <CartesianGrid stroke={CHART.grid} strokeDasharray="3 6" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={chartAxisStyle} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={88}
                    tick={chartAxisStyle}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={{ fill: CHART.cursor }} content={<ChartTooltip suffix="" />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="abiertas" name="Abiertas" fill="url(#gradEfficiency)" radius={[0, 6, 6, 0]} stackId="a" />
                  <Bar dataKey="vencidas" name="Vencidas" fill="#ef4444" radius={[0, 6, 6, 0]} stackId="b" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="dash-panel border-0 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Intervención rápida
            </CardTitle>
            <CardDescription>
              Promedio {data.distribucionCarga.promedio} tareas/empleado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.distribucionCarga.sobrecargados.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Sobrecargados
                </p>
                <ul className="space-y-2">
                  {data.distribucionCarga.sobrecargados.map((p) => (
                    <li
                      key={p.userId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2 text-sm"
                    >
                      <span>
                        {p.nombre} {p.apellido}
                        <span className="ml-1 text-muted-foreground">({p.area})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{p.tareasAbiertas}</Badge>
                        <Link href={`/dashboard/tareas?userId=${p.userId}`}>
                          <Button variant="outline" size="sm" className="h-7 rounded-lg text-xs">
                            Ver
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.distribucionCarga.conCapacidad.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Con capacidad</p>
                <ul className="space-y-2">
                  {data.distribucionCarga.conCapacidad.map((p) => (
                    <li
                      key={p.userId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed px-3 py-2 text-sm"
                    >
                      <span>
                        {p.nombre} {p.apellido}
                        <span className="ml-1 text-muted-foreground">({p.area})</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{p.tareasAbiertas}</Badge>
                        <Link href={`/dashboard/tareas?userId=${p.userId}`}>
                          <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs">
                            Asignar
                          </Button>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.distribucionCarga.sobrecargados.length === 0 &&
              data.distribucionCarga.conCapacidad.length === 0 && (
                <p className="text-sm text-muted-foreground">Carga equilibrada en el equipo.</p>
              )}
          </CardContent>
        </Card>
      </div>

      <Card className="dash-panel border-0 shadow-none">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Detalle por empleado</CardTitle>
            <CardDescription>
              Ordenado por riesgo operativo — exportable en el PDF ejecutivo
            </CardDescription>
          </div>
          <select
            className="h-9 rounded-xl border border-input bg-white/90 px-3 text-sm shadow-sm"
            value={areaFiltro}
            onChange={(e) => setAreaFiltro(e.target.value)}
          >
            <option value="">Todas las áreas</option>
            {data.porArea.map((a) => (
              <option key={a.areaId} value={a.nombre}>
                {a.nombre}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="data-table w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Empleado</th>
                <th className="pb-2">Área</th>
                <th className="pb-2 text-right">KPI</th>
                <th className="pb-2 text-right">Efic.</th>
                <th className="pb-2 text-right">Pend.</th>
                <th className="pb-2 text-right">Proceso</th>
                <th className="pb-2 text-right">Abiertas</th>
                <th className="pb-2 text-right">Venc.</th>
                <th className="pb-2 text-right">Hechas</th>
                <th className="pb-2 text-right">Puntual.</th>
                <th className="pb-2 text-right" title="Ciclo total promedio">
                  Ciclo
                </th>
                <th className="pb-2 text-right">Alerta</th>
                <th className="pb-2 text-right" />
              </tr>
            </thead>
            <tbody>
              {personasFiltradas.map((p) => (
                <tr key={p.userId} className="border-b border-border/50 last:border-0">
                  <td className="py-3 font-medium">
                    {p.nombre} {p.apellido}
                  </td>
                  <td className="py-3 text-muted-foreground">{p.area}</td>
                  <td className="py-3 text-right tabular-nums">{formatPercent(p.kpiPromedio)}</td>
                  <td className="py-3 text-right tabular-nums">{formatPercent(p.eficiencia)}</td>
                  <td className="py-3 text-right tabular-nums">{p.tareasPendientes}</td>
                  <td className="py-3 text-right tabular-nums">{p.tareasEnProceso}</td>
                  <td className="py-3 text-right tabular-nums font-semibold">{p.tareasAbiertas}</td>
                  <td className="py-3 text-right tabular-nums">
                    {p.tareasVencidas > 0 ? (
                      <span className="font-semibold text-destructive">{p.tareasVencidas}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 text-right tabular-nums">{p.tareasCompletadas}</td>
                  <td className="py-3 text-right tabular-nums">{p.puntualidadPct}%</td>
                  <td
                    className="py-3 text-right tabular-nums text-muted-foreground"
                    title={`Inicio ${formatLatencyMinutes(p.latencias.demoraInicio.avg)} · Activo ${formatLatencyMinutes(p.latencias.tiempoActivo.avg)}`}
                  >
                    {latencyCell(p.latencias)}
                  </td>
                  <td className="py-3 text-right">
                    {p.alerta ? (
                      <Badge variant={p.alerta === "vencidas" ? "destructive" : "warning"}>
                        {ALERTA_LABEL[p.alerta]}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <Link href={`/dashboard/tareas?userId=${p.userId}`}>
                      <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs">
                        Tareas
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

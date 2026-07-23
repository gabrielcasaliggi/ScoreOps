"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  Target,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton";
import { AiInsightsPanel } from "@/components/dashboard/ai-insights-panel";
import {
  LatencyMetricsPanel,
  latencyCell,
} from "@/components/dashboard/latency-metrics-panel";
import { formatPercent } from "@/lib/utils";
import { labelEstadoTarea } from "@/lib/task-utils";
import type { AggregatedLatencies } from "@/lib/task-latency";

interface OperationsData {
  alcance: { tipo: "area"; areaNombre: string } | { tipo: "global" };
  resumen: {
    tareasPendientes: number;
    tareasEnProceso: number;
    tareasPorAprobar: number;
    tareasCompletadas: number;
    tareasVencidas: number;
    solicitudesPendientes: number;
    objetivosActivos: number;
    objetivosEnRiesgo: number;
    kpiPromedioEquipo: number;
  };
  latencias: AggregatedLatencies;
  tareasUrgentes: {
    id: string;
    titulo: string;
    estado: string;
    prioridad: number;
    fechaLimite: string | null;
    vencida: boolean;
    userId: string;
    user: { nombre: string; apellido: string };
    objetivo?: { titulo: string } | null;
  }[];
  objetivosRiesgo: {
    id: string;
    titulo: string;
    fechaFin: string;
    kpiPromedio: number;
    proximoVencer: boolean;
    user: { nombre: string; apellido: string; area: { nombre: string } };
  }[];
  porPersona: {
    userId: string;
    nombre: string;
    apellido: string;
    area: string;
    tareasAbiertas: number;
    tareasVencidas: number;
    objetivosActivos: number;
    kpiPromedio: number;
    latencias: AggregatedLatencies;
  }[];
  porArea?: {
    areaId: string;
    area: string;
    empleados: number;
    tareasAbiertas: number;
    kpiPromedio: number;
  }[];
}

interface OperationsDashboardProps {
  isAdmin: boolean;
  premioHabilitado?: boolean;
}

export function OperationsDashboard({
  isAdmin,
  premioHabilitado = true,
}: OperationsDashboardProps) {
  const [data, setData] = useState<OperationsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/stats/operaciones");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <DashboardSkeleton />;

  if (!data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        tone="amber"
        title="No se pudieron cargar las operaciones"
        description="Reintentá en unos segundos. Si persiste, revisá la conexión o el estado del sistema."
        action={
          <Button variant="outline" size="sm" className="rounded-xl" onClick={load}>
            Reintentar
          </Button>
        }
      />
    );
  }

  const scopeLabel =
    data.alcance.tipo === "area" ? data.alcance.areaNombre : "Toda la empresa";
  const abiertas =
    data.resumen.tareasPendientes +
    data.resumen.tareasEnProceso +
    (data.resumen.tareasPorAprobar ?? 0);
  const porAprobar = data.resumen.solicitudesPendientes ?? 0;
  const tieneFoco =
    data.resumen.tareasVencidas > 0 ||
    data.resumen.objetivosEnRiesgo > 0 ||
    porAprobar > 0;

  const roleLabel = isAdmin ? "ADMINISTRADOR" : "GERENTE";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            Operaciones · {scopeLabel}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-[2rem]">
            {isAdmin ? "Gestión operativa" : "Mi área"}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-600">
            Priorizá qué destrabar hoy: vencidas, aprobaciones y objetivos en riesgo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-lg" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Link href="/dashboard/tareas">
            <Button size="sm" className="rounded-lg">
              <ClipboardList className="mr-2 h-4 w-4" />
              Abrir kanban
            </Button>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Abiertas",
            value: abiertas,
            hint: `${data.resumen.tareasVencidas} vencidas`,
            accent: data.resumen.tareasVencidas > 0 ? "bg-amber-500" : "bg-sky-600",
          },
          {
            label: "Completadas",
            value: data.resumen.tareasCompletadas,
            hint: "en el período",
            accent: "bg-blue-600",
          },
          {
            label: "Objetivos",
            value: data.resumen.objetivosActivos,
            hint: `${data.resumen.objetivosEnRiesgo} en riesgo`,
            accent: data.resumen.objetivosEnRiesgo > 0 ? "bg-amber-500" : "bg-slate-500",
          },
          {
            label: "KPI equipo",
            value: formatPercent(data.resumen.kpiPromedioEquipo),
            hint: "promedio",
            accent: "bg-slate-800",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm"
          >
            <div className={`absolute inset-y-0 left-0 w-1 ${m.accent}`} />
            <p className="pl-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {m.label}
            </p>
            <p className="mt-1 pl-2 font-display text-2xl font-bold tabular-nums tracking-tight text-slate-900">
              {m.value}
            </p>
            <p className="mt-1 pl-2 text-xs text-slate-500">{m.hint}</p>
          </div>
        ))}
      </div>

      <LatencyMetricsPanel latencias={data.latencias} />

      {tieneFoco && (
        <div className="dash-focus-strip flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
          <span className="font-semibold text-amber-950">Foco hoy</span>
          {porAprobar > 0 && (
            <Link
              href="/dashboard/aprobaciones"
              className="rounded-lg bg-white/90 px-2.5 py-1 font-medium text-amber-900 shadow-sm ring-1 ring-amber-200/80 transition hover:bg-white"
            >
              {porAprobar} por aprobar
            </Link>
          )}
          {data.resumen.tareasVencidas > 0 && (
            <Link
              href="/dashboard/tareas?vencidas=1"
              className="rounded-lg bg-white/90 px-2.5 py-1 font-medium text-amber-900 shadow-sm ring-1 ring-amber-200/80 transition hover:bg-white"
            >
              {data.resumen.tareasVencidas} vencidas
            </Link>
          )}
          {data.resumen.objetivosEnRiesgo > 0 && (
            <Link
              href="/dashboard/objetivos"
              className="rounded-lg bg-white/90 px-2.5 py-1 font-medium text-amber-900 shadow-sm ring-1 ring-amber-200/80 transition hover:bg-white"
            >
              {data.resumen.objetivosEnRiesgo} objetivos en riesgo
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base font-bold tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
              </span>
              Tareas prioritarias
            </CardTitle>
            <CardDescription>Vencidas o alta prioridad — clic para abrir</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-4">
            {data.tareasUrgentes.length === 0 ? (
              <EmptyState
                compact
                icon={CheckCircle2}
                tone="success"
                title="Sin urgencias"
                description="No hay tareas vencidas ni de alta prioridad en el alcance actual."
              />
            ) : (
              data.tareasUrgentes.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/tareas?userId=${t.userId}${t.vencida ? "&vencidas=1" : ""}`}
                  className="group flex items-start justify-between gap-3 rounded-xl border border-transparent bg-white px-3.5 py-3 text-sm ring-1 ring-slate-200/80 transition hover:border-amber-200 hover:shadow-md"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium group-hover:text-amber-950">{t.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.user.nombre} {t.user.apellido}
                      {t.objetivo && ` · ${t.objetivo.titulo}`}
                    </p>
                  </div>
                  <Badge variant={t.vencida ? "destructive" : "warning"}>
                    {t.vencida ? "Vencida" : labelEstadoTarea(t.estado, roleLabel)}
                  </Badge>
                </Link>
              ))
            )}
            {data.tareasUrgentes.length > 0 && (
              <Link href="/dashboard/tareas?vencidas=1">
                <Button variant="ghost" size="sm" className="mt-1 w-full rounded-xl">
                  Ver vencidas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <CardHeader className="border-b border-slate-100 bg-slate-50/60 pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base font-bold tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Target className="h-4 w-4" />
              </span>
              Objetivos en seguimiento
            </CardTitle>
            <CardDescription>KPI bajo o vencimiento próximo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {data.objetivosRiesgo.length === 0 ? (
              <EmptyState
                compact
                icon={Target}
                tone="success"
                title="Objetivos al día"
                description="Ningún objetivo del alcance está en riesgo por ahora."
              />
            ) : (
              data.objetivosRiesgo.map((o) => (
                <div key={o.id} className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200/70">
                  <div className="flex justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{o.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.user.nombre} {o.user.apellido}
                        {isAdmin && ` · ${o.user.area.nombre}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(o.fechaFin).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                  <Progress value={o.kpiPromedio} className="h-2" />
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">
                      {formatPercent(o.kpiPromedio)}
                    </span>
                    {o.proximoVencer && (
                      <Badge variant="warning" className="text-[10px]">
                        Vence pronto
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
            <Link href="/dashboard/objetivos">
              <Button variant="ghost" size="sm" className="w-full rounded-xl">
                Ver todos los objetivos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <AiInsightsPanel />

      {isAdmin && data.porArea && data.porArea.length > 0 && (
        <Card className="dash-panel border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Resumen por área</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2">Área</th>
                  <th className="pb-2 text-right">Empleados</th>
                  <th className="pb-2 text-right">Tareas abiertas</th>
                  <th className="pb-2 text-right">KPI prom.</th>
                </tr>
              </thead>
              <tbody>
                {data.porArea.map((a) => (
                  <tr key={a.areaId} className="border-b border-border/50 last:border-0">
                    <td className="py-3 font-medium">{a.area}</td>
                    <td className="py-3 text-right tabular-nums">{a.empleados}</td>
                    <td className="py-3 text-right tabular-nums">{a.tareasAbiertas}</td>
                    <td className="py-3 text-right tabular-nums">
                      {formatPercent(a.kpiPromedio)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card className="dash-panel border-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-slate-500" />
              {isAdmin ? "Equipo por persona" : "Personas del área"}
            </CardTitle>
            <CardDescription>Ordenado por tareas abiertas</CardDescription>
          </div>
          <Link href="/dashboard/equipo">
            <Button variant="outline" size="sm" className="rounded-xl">
              Ver equipos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="data-table w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Empleado</th>
                {isAdmin && <th className="pb-2">Área</th>}
                <th className="pb-2 text-right">Abiertas</th>
                <th className="pb-2 text-right">Vencidas</th>
                <th className="pb-2 text-right">Objetivos</th>
                <th className="pb-2 text-right">KPI</th>
                <th className="pb-2 text-right" title="Ciclo total promedio (asignación → cierre)">
                  Ciclo
                </th>
              </tr>
            </thead>
            <tbody>
              {data.porPersona.map((p) => (
                <tr key={p.userId} className="border-b border-border/50 last:border-0">
                  <td className="py-3 font-medium">
                    {p.nombre} {p.apellido}
                  </td>
                  {isAdmin && <td className="py-3 text-muted-foreground">{p.area}</td>}
                  <td className="py-3 text-right tabular-nums">{p.tareasAbiertas}</td>
                  <td className="py-3 text-right tabular-nums">
                    {p.tareasVencidas > 0 ? (
                      <Link
                        href={`/dashboard/tareas?userId=${p.userId}&vencidas=1`}
                        className="font-medium text-destructive hover:underline"
                      >
                        {p.tareasVencidas}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 text-right tabular-nums">{p.objetivosActivos}</td>
                  <td className="py-3 text-right tabular-nums">{formatPercent(p.kpiPromedio)}</td>
                  <td className="py-3 text-right tabular-nums text-muted-foreground">
                    {latencyCell(p.latencias)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {premioHabilitado && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/50 px-5 py-4">
          <div>
            <p className="font-display font-bold tracking-tight text-slate-900">Premio semestral</p>
            <p className="text-sm text-muted-foreground">
              Fórmula, metas del equipo y ranking — pensado para gerentes
            </p>
          </div>
          <Link href="/dashboard/premio">
            <Button variant="outline" className="rounded-xl border-slate-200 bg-white">
              Ir a Premio
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

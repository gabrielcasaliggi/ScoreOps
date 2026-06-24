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
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { AiInsightsPanel } from "@/components/dashboard/ai-insights-panel";
import { formatPercent } from "@/lib/utils";

interface OperationsData {
  alcance: { tipo: "area"; areaNombre: string } | { tipo: "global" };
  resumen: {
    tareasPendientes: number;
    tareasEnProceso: number;
    tareasCompletadas: number;
    tareasVencidas: number;
    objetivosActivos: number;
    objetivosEnRiesgo: number;
    kpiPromedioEquipo: number;
  };
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
}

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  COMPLETADA: "Completada",
};

export function OperationsDashboard({ isAdmin }: OperationsDashboardProps) {
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-destructive text-sm">No se pudieron cargar las operaciones.</p>;
  }

  const scopeLabel =
    data.alcance.tipo === "area" ? data.alcance.areaNombre : "Toda la cooperativa";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAdmin ? "Gestión operativa" : "Mi área"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Seguimiento de tareas y objetivos · <span className="font-medium">{scopeLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Link href="/dashboard/tareas">
            <Button size="sm" className="rounded-xl">
              <ClipboardList className="h-4 w-4 mr-2" />
              Kanban
            </Button>
          </Link>
        </div>
      </div>

      <AiInsightsPanel />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tareas abiertas"
          value={data.resumen.tareasPendientes + data.resumen.tareasEnProceso}
          hint={`${data.resumen.tareasVencidas} vencida(s)`}
          icon={ClipboardList}
          variant="blue"
        />
        <StatCard
          label="Completadas"
          value={data.resumen.tareasCompletadas}
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          label="Objetivos activos"
          value={data.resumen.objetivosActivos}
          hint={`${data.resumen.objetivosEnRiesgo} en riesgo`}
          icon={Target}
          variant="slate"
        />
        <StatCard
          label="KPI equipo"
          value={formatPercent(data.resumen.kpiPromedioEquipo)}
          icon={TrendingUp}
          variant="emerald"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Tareas prioritarias
            </CardTitle>
            <CardDescription>Vencidas o alta prioridad</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.tareasUrgentes.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Sin tareas urgentes
              </p>
            )}
            {data.tareasUrgentes.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/tareas?userId=${t.userId}${t.vencida ? "&vencidas=1" : ""}`}
                className="flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{t.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.user.nombre} {t.user.apellido}
                    {t.objetivo && ` · ${t.objetivo.titulo}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={t.vencida ? "destructive" : "warning"}>
                    {t.vencida ? "Vencida" : ESTADO_LABEL[t.estado]}
                  </Badge>
                </div>
              </Link>
            ))}
            {data.tareasUrgentes.length > 0 && (
              <Link href="/dashboard/tareas?vencidas=1">
                <Button variant="ghost" size="sm" className="w-full">
                  Ver tareas vencidas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-600" />
              Objetivos en seguimiento
            </CardTitle>
            <CardDescription>KPI bajo o vencimiento próximo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.objetivosRiesgo.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Objetivos al día
              </p>
            )}
            {data.objetivosRiesgo.map((o) => (
              <div key={o.id} className="space-y-2">
                <div className="flex justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{o.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.user.nombre} {o.user.apellido}
                      {isAdmin && ` · ${o.user.area.nombre}`}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(o.fechaFin).toLocaleDateString("es-AR")}
                  </span>
                </div>
                <Progress value={o.kpiPromedio} className="h-2" />
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-600 font-medium">{formatPercent(o.kpiPromedio)}</span>
                  {o.proximoVencer && (
                    <Badge variant="warning" className="text-[10px]">
                      Vence pronto
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            <Link href="/dashboard/objetivos">
              <Button variant="ghost" size="sm" className="w-full">
                Ver todos los objetivos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {isAdmin && data.porArea && data.porArea.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Resumen por área</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2 font-medium">Área</th>
                  <th className="pb-2 font-medium text-right">Empleados</th>
                  <th className="pb-2 font-medium text-right">Tareas abiertas</th>
                  <th className="pb-2 font-medium text-right">KPI prom.</th>
                </tr>
              </thead>
              <tbody>
                {data.porArea.map((a) => (
                  <tr key={a.areaId} className="border-b border-border/50 last:border-0">
                    <td className="py-3 font-medium">{a.area}</td>
                    <td className="py-3 text-right tabular-nums">{a.empleados}</td>
                    <td className="py-3 text-right tabular-nums">{a.tareasAbiertas}</td>
                    <td className="py-3 text-right tabular-nums">{formatPercent(a.kpiPromedio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              {isAdmin ? "Equipo por persona" : "Personas del área"}
            </CardTitle>
            <CardDescription>Ordenado por tareas abiertas</CardDescription>
          </div>
          <Link href="/dashboard/equipo">
            <Button variant="outline" size="sm">
              Ver equipos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="pb-2 font-medium">Empleado</th>
                {isAdmin && <th className="pb-2 font-medium">Área</th>}
                <th className="pb-2 font-medium text-right">Abiertas</th>
                <th className="pb-2 font-medium text-right">Vencidas</th>
                <th className="pb-2 font-medium text-right">Objetivos</th>
                <th className="pb-2 font-medium text-right">KPI</th>
              </tr>
            </thead>
            <tbody>
              {data.porPersona.map((p) => (
                <tr key={p.userId} className="border-b border-border/50 last:border-0">
                  <td className="py-3 font-medium">
                    {p.nombre} {p.apellido}
                  </td>
                  {isAdmin && (
                    <td className="py-3 text-muted-foreground">{p.area}</td>
                  )}
                  <td className="py-3 text-right tabular-nums">{p.tareasAbiertas}</td>
                  <td className="py-3 text-right tabular-nums">
                    {p.tareasVencidas > 0 ? (
                      <Link
                        href={`/dashboard/tareas?userId=${p.userId}&vencidas=1`}
                        className="text-destructive hover:underline"
                      >
                        {p.tareasVencidas}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 text-right tabular-nums">{p.objetivosActivos}</td>
                  <td className="py-3 text-right tabular-nums">{formatPercent(p.kpiPromedio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-violet-200/60 bg-violet-50/40 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-violet-900">Premio semestral Art. 49</p>
          <p className="text-sm text-muted-foreground">
            Liquidación, tramos y metas colectivas en módulo aparte
          </p>
        </div>
        <Link href="/dashboard/premio">
          <Button variant="outline" className="rounded-xl bg-white/80 border-violet-200">
            Ir a Premio
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

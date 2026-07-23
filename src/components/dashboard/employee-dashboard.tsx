"use client";

import Link from "next/link";
import { Award, ArrowRight, AlertTriangle, CheckCircle2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PremioArt49Breakdown } from "@/components/dashboard/premio-art49-breakdown";
import { PremioExplainerPanel } from "@/components/dashboard/premio-explainer-panel";
import { BenchmarkPanel } from "@/components/dashboard/benchmark-panel";
import { LatencyMetricsPanel } from "@/components/dashboard/latency-metrics-panel";
import { EmployeeObjetivosPanel, type ObjetivoResumen } from "@/components/dashboard/employee-objetivos-panel";
import { EmployeeKpiPanel } from "@/components/dashboard/employee-kpi-panel";
import { TareaFechaLimiteBadge } from "@/components/tasks/tarea-fecha-limite";
import { formatPercent } from "@/lib/utils";
import { getTareaLimiteStatus, labelEstadoTarea } from "@/lib/task-utils";
import type { PremioArt49 } from "@/lib/art49-types";
import type { EmployeeTarea } from "@/components/tasks/employee-kanban";
import type { AggregatedLatencies } from "@/lib/task-latency";

interface KpiItem {
  kpiId: string;
  nombre: string;
  unidad: string;
  valorMeta: number;
  valorActual: number;
  cumplimiento: number;
}

interface EmployeeDashboardProps {
  kpiCompliance: KpiItem[];
  kpiPromedio: number;
  temporalEfficiency: {
    eficiencia: number;
    desvioPorcentaje: number;
    tareasCompletadas: number;
  };
  productivityBonus?: {
    puntajePremio: number;
    art49?: PremioArt49;
    premioTemplate?: string;
    tareasEvaluablesCompletadas: number;
    eficienciaEvaluable: number;
    gestionInternaPuntaje?: number;
  };
  periodo?: {
    label: string;
    mesesCalculoLabel: string;
    mesPagoLabel: string;
    liquidacionDescripcion: string;
    diasHastaLiquidacion: number;
    liquidacionPendiente: boolean;
  };
  tareasPorEstado: { pendiente: number; enProceso: number; completada: number };
  latencias?: AggregatedLatencies;
  tareas: EmployeeTarea[];
  objetivos?: ObjetivoResumen[];
  comparacion?: {
    periodo: { label: string };
    kpiPromedio: number;
    puntajePremio: number;
    eficiencia: number;
    deltaKpi: number;
    deltaPremio: number;
  } | null;
  premioHabilitado?: boolean;
  onRefresh: () => void;
}

export function EmployeeDashboard({
  kpiCompliance,
  kpiPromedio,
  temporalEfficiency,
  productivityBonus,
  periodo,
  tareasPorEstado,
  latencias,
  tareas,
  objetivos = [],
  comparacion,
  premioHabilitado = true,
  onRefresh,
}: EmployeeDashboardProps) {
  const puntajePremio = productivityBonus?.puntajePremio ?? 0;

  const tareasUrgentes = tareas
    .filter((t) => t.estado !== "COMPLETADA")
    .filter((t) => {
      const limite = getTareaLimiteStatus(t.fechaLimite, t.estado);
      return limite.vencida || limite.proxima || t.prioridad === 1;
    })
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="dash-eyebrow">Tu día</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Mi tablero</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Prioridades, avance y premio en un solo lugar
            {periodo ? ` · ${periodo.label}` : ""}
          </p>
        </div>
        <Link href="/dashboard/tareas">
          <Button size="sm" className="rounded-xl shadow-md shadow-primary/20">
            <ClipboardList className="mr-2 h-4 w-4" />
            Mis tareas
          </Button>
        </Link>
      </div>

      <div
        className={`grid gap-4 sm:grid-cols-2 ${premioHabilitado ? "xl:grid-cols-4" : "xl:grid-cols-3"} animate-stagger`}
      >
        <StatCard
          label="Tareas completadas"
          value={tareasPorEstado.completada}
          hint={`${tareasPorEstado.enProceso} en proceso · ${tareasPorEstado.pendiente} pendientes`}
          variant="slate"
        />
        <StatCard
          label="Cumplimiento KPI"
          value={formatPercent(kpiPromedio)}
          variant="emerald"
        />
        <StatCard
          label="Eficiencia"
          value={formatPercent(
            productivityBonus?.eficienciaEvaluable ?? temporalEfficiency.eficiencia
          )}
          variant="blue"
        />
        {premioHabilitado && (
          <StatCard
            label="Premio semestral"
            value={`${puntajePremio}%`}
            hint="Máx. 50% del sueldo — detalle abajo"
            icon={Award}
            variant="slate"
          />
        )}
      </div>

      {latencias && <LatencyMetricsPanel latencias={latencias} />}

      <div className="dash-panel p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Tareas prioritarias</h2>
            <p className="text-sm text-muted-foreground">
              Vencidas, próximas o de alta prioridad
            </p>
          </div>
          <Link href="/dashboard/tareas">
            <Button variant="outline" size="sm" className="rounded-xl">
              Ir al tablero
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        {tareasUrgentes.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            tone="success"
            title="Sin urgencias por ahora"
            description="Cuando haya vencidas o prioridad alta, van a aparecer acá."
            className="py-8"
            action={
              <Link href="/dashboard/tareas">
                <Button variant="outline" size="sm" className="rounded-xl">
                  Ver todas las tareas
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {tareasUrgentes.map((t) => (
              <Link
                key={t.id}
                href="/dashboard/tareas"
                className="group flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3.5 py-3 text-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:ring-teal-200 hover:shadow-md"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {getTareaLimiteStatus(t.fechaLimite, t.estado).vencida && (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <span className="truncate font-medium">{t.titulo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TareaFechaLimiteBadge fechaLimite={t.fechaLimite} estado={t.estado} />
                  <Badge variant="secondary" className="text-[10px]">
                    {labelEstadoTarea(t.estado, "EMPLEADO")}
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <EmployeeObjetivosPanel objetivos={objetivos} />
        <EmployeeKpiPanel kpiCompliance={kpiCompliance} onRefresh={onRefresh} />
      </div>

      {comparacion && (
        <div className="dash-panel p-5">
          <h2 className="text-lg font-bold tracking-tight">Vs semestre anterior</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {comparacion.periodo.label} comparado con el período actual
          </p>
          <div
            className={`grid gap-4 ${premioHabilitado ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
          >
            <StatCard
              label="KPI promedio"
              value={formatPercent(comparacion.kpiPromedio)}
              hint={`${comparacion.deltaKpi >= 0 ? "+" : ""}${comparacion.deltaKpi} pp`}
              variant={comparacion.deltaKpi >= 0 ? "emerald" : "slate"}
            />
            {premioHabilitado && (
              <StatCard
                label="Premio semestral"
                value={`${comparacion.puntajePremio}%`}
                hint={`${comparacion.deltaPremio >= 0 ? "+" : ""}${comparacion.deltaPremio} pp`}
                variant={comparacion.deltaPremio >= 0 ? "emerald" : "slate"}
              />
            )}
            <StatCard
              label="Eficiencia"
              value={formatPercent(comparacion.eficiencia)}
              hint="Período anterior"
              variant="blue"
            />
          </div>
        </div>
      )}

      {premioHabilitado && <PremioExplainerPanel />}
      <BenchmarkPanel />

      {premioHabilitado &&
        productivityBonus?.premioTemplate === "kpi_simple" &&
        !productivityBonus.art49 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4">
            <p className="font-semibold text-slate-900">Tu bono por metas — {puntajePremio}%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Se calcula con el promedio de cumplimiento de tus KPIs en el semestre.
            </p>
          </div>
        )}

      {premioHabilitado && productivityBonus?.art49 && (
        <details className="dash-panel open:pb-2" open>
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold text-slate-900">
            <span className="flex items-center gap-2">
              <Award className="h-4 w-4 text-slate-700" />
              Tu premio este semestre ({puntajePremio}%)
            </span>
            {periodo && (
              <span className="text-xs font-normal text-muted-foreground">
                Cobrás en {periodo.mesPagoLabel}
              </span>
            )}
          </summary>
          <div className="space-y-3 px-2 pb-2">
            <p className="px-3 text-sm text-muted-foreground">
              Sumá tramos personales y de equipo. El máximo es 50% del sueldo.
            </p>
            <PremioArt49Breakdown art49={productivityBonus.art49} />
          </div>
        </details>
      )}
    </div>
  );
}

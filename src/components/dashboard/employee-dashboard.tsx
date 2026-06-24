"use client";

import Link from "next/link";
import { Award, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { PremioArt49Breakdown } from "@/components/dashboard/premio-art49-breakdown";
import { EmployeeObjetivosPanel, type ObjetivoResumen } from "@/components/dashboard/employee-objetivos-panel";
import { EmployeeKpiPanel } from "@/components/dashboard/employee-kpi-panel";
import { TareaFechaLimiteBadge } from "@/components/tasks/tarea-fecha-limite";
import { formatPercent } from "@/lib/utils";
import { getTareaLimiteStatus } from "@/lib/task-utils";
import type { PremioArt49 } from "@/lib/art49-types";
import type { EmployeeTarea } from "@/components/tasks/employee-kanban";

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
  tareas: EmployeeTarea[];
  objetivos?: ObjetivoResumen[];
  onRefresh: () => void;
}

export function EmployeeDashboard({
  kpiCompliance,
  kpiPromedio,
  temporalEfficiency,
  productivityBonus,
  periodo,
  tareasPorEstado,
  tareas,
  objetivos = [],
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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        <StatCard
          label="Premio semestral"
          value={`${puntajePremio}%`}
          hint="Art. 49 — ver detalle abajo"
          icon={Award}
          variant="violet"
        />
      </div>

      <EmployeeObjetivosPanel objetivos={objetivos} />

      <EmployeeKpiPanel kpiCompliance={kpiCompliance} onRefresh={onRefresh} />

      <div className="rounded-2xl border border-border/60 bg-white/50 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">Tareas prioritarias</h2>
            <p className="text-sm text-muted-foreground">
              Vencidas, próximas a vencer o de alta prioridad
            </p>
          </div>
          <Link href="/dashboard/tareas">
            <Button variant="outline" size="sm" className="rounded-xl">
              Ir a Mis tareas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        {tareasUrgentes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No tenés tareas urgentes. Revisá tu tablero completo en Mis tareas.
          </p>
        ) : (
          <div className="space-y-2">
            {tareasUrgentes.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm"
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
                    {t.estado.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {productivityBonus?.art49 && (
        <details className="rounded-2xl border border-violet-200/60 bg-violet-50/30 open:pb-2">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold text-violet-900">
            <span>Premio semestral Art. 49 ({puntajePremio}%)</span>
            {periodo && (
              <span className="text-xs font-normal text-muted-foreground">
                Pago {periodo.mesPagoLabel}
              </span>
            )}
          </summary>
          <div className="px-2 pb-2">
            <PremioArt49Breakdown art49={productivityBonus.art49} />
          </div>
        </details>
      )}
    </div>
  );
}

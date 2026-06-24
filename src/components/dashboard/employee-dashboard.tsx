"use client";

import { useState } from "react";
import { Award, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { TaskTimer } from "@/components/tasks/task-timer";
import { TareaFechaLimiteBadge, tareaCardLimiteClass } from "@/components/tasks/tarea-fecha-limite";
import { PremioArt49Breakdown } from "@/components/dashboard/premio-art49-breakdown";
import { formatMinutes, formatPercent, cn } from "@/lib/utils";
import type { PremioArt49 } from "@/lib/art49-types";

type TaskStatus = "PENDIENTE" | "EN_PROCESO" | "COMPLETADA";

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: TaskStatus;
  tiempoEstimado: number;
  tiempoReal: number | null;
  prioridad: number;
  startedAt: string | null;
  completedAt: string | null;
  evaluaProductividad: boolean;
  pesoProductividad: number;
  fechaLimite?: string | null;
  objetivo?: { titulo: string } | null;
}

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
  tareas: Tarea[];
  onRefresh: () => void;
}

const COLUMNS: { key: TaskStatus; label: string; accent: string }[] = [
  { key: "PENDIENTE", label: "Pendiente", accent: "border-t-slate-400" },
  { key: "EN_PROCESO", label: "En proceso", accent: "border-t-blue-500" },
  { key: "COMPLETADA", label: "Completada", accent: "border-t-emerald-500" },
];

const PRIORITY_LABEL: Record<number, string> = {
  1: "Alta",
  2: "Media",
  3: "Baja",
};

export function EmployeeDashboard({
  kpiCompliance,
  kpiPromedio,
  temporalEfficiency,
  productivityBonus,
  periodo,
  tareasPorEstado,
  tareas,
  onRefresh,
}: EmployeeDashboardProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [taskError, setTaskError] = useState("");

  async function updateEstado(id: string, estado: TaskStatus) {
    setTaskError("");
    setLoadingId(id);
    try {
      const res = await fetch(`/api/tareas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setTaskError(data.error ?? "No se pudo actualizar la tarea.");
        return;
      }
      onRefresh();
    } catch {
      setTaskError("Error de conexión al actualizar la tarea.");
    } finally {
      setLoadingId(null);
    }
  }

  const puntajePremio = productivityBonus?.puntajePremio ?? 0;

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

      <div>
        <h2 className="mb-1 text-lg font-bold">Mi tablero de tareas</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Iniciá una tarea para registrar el tiempo. Los KPIs y la eficiencia son indicadores
          internos de gestión; el premio semestral se calcula según Art. 49.
        </p>
        {taskError && (
          <p className="mb-4 text-sm text-destructive">{taskError}</p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`kanban-column border-t-4 p-3 ${col.accent}`}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <Badge variant="secondary" className="rounded-lg">
                  {tareas.filter((t) => t.estado === col.key).length}
                </Badge>
              </div>
              <div className="space-y-2.5">
                {tareas.filter((t) => t.estado === col.key).length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">Vacío</p>
                )}
                {tareas
                  .filter((t) => t.estado === col.key)
                  .map((tarea) => (
                    <div key={tarea.id} className={cn("kanban-card p-4 space-y-2", tareaCardLimiteClass(tarea.fechaLimite, tarea.estado))}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm">{tarea.titulo}</p>
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant={
                                tarea.prioridad === 1
                                  ? "destructive"
                                  : tarea.prioridad === 2
                                    ? "warning"
                                    : "secondary"
                              }
                            >
                              {PRIORITY_LABEL[tarea.prioridad]}
                            </Badge>
                            {tarea.evaluaProductividad && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-violet-300 bg-violet-50 text-violet-700"
                              >
                                Premio ×{tarea.pesoProductividad}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <TareaFechaLimiteBadge fechaLimite={tarea.fechaLimite} estado={tarea.estado} />
                        {tarea.objetivo && (
                          <p className="text-xs text-muted-foreground">
                            Objetivo: {tarea.objetivo.titulo}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Estimado: {formatMinutes(tarea.tiempoEstimado)}</p>
                          {tarea.estado === "EN_PROCESO" && tarea.startedAt && (
                            <TaskTimer startedAt={tarea.startedAt} />
                          )}
                          {tarea.tiempoReal != null && (
                            <p className="text-emerald-600 font-medium">
                              Real: {formatMinutes(tarea.tiempoReal)}
                              {tarea.tiempoReal <= tarea.tiempoEstimado ? " ✓" : " (desvío)"}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 pt-1">
                          {col.key === "PENDIENTE" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 flex-1 rounded-lg text-xs"
                              disabled={loadingId === tarea.id}
                              onClick={() => updateEstado(tarea.id, "EN_PROCESO")}
                            >
                              {loadingId === tarea.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Iniciar"
                              )}
                            </Button>
                          )}
                          {col.key === "EN_PROCESO" && (
                            <Button
                              size="sm"
                              className="h-8 flex-1 rounded-lg text-xs"
                              disabled={loadingId === tarea.id}
                              onClick={() => updateEstado(tarea.id, "COMPLETADA")}
                            >
                              {loadingId === tarea.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Completar"
                              )}
                            </Button>
                          )}
                        </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {kpiCompliance.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Mis KPIs y objetivos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {kpiCompliance.map((kpi) => (
              <div key={kpi.kpiId} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{kpi.nombre}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {kpi.valorActual} / {kpi.valorMeta} {kpi.unidad}
                  </span>
                </div>
                <Progress value={kpi.cumplimiento} className="h-2.5 rounded-full" />
                <p className="text-xs text-right font-medium text-emerald-600">
                  {formatPercent(kpi.cumplimiento)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {productivityBonus?.art49 && (
        <details className="rounded-2xl border border-violet-200/60 bg-violet-50/30 open:pb-2">
          <summary className="cursor-pointer px-5 py-4 font-semibold text-violet-900 list-none flex items-center justify-between">
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

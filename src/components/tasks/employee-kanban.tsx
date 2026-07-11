"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskTimer } from "@/components/tasks/task-timer";
import { TareaFechaLimiteBadge, tareaCardLimiteClass } from "@/components/tasks/tarea-fecha-limite";
import { formatMinutes, cn } from "@/lib/utils";

type TaskStatus = "PENDIENTE" | "EN_PROCESO" | "PENDIENTE_APROBACION" | "COMPLETADA";

export interface EmployeeTarea {
  id: string;
  titulo: string;
  descripcion?: string | null;
  estado: TaskStatus;
  tiempoEstimado: number;
  tiempoReal: number | null;
  prioridad: number;
  startedAt: string | null;
  evaluaProductividad: boolean;
  pesoProductividad: number;
  fechaLimite?: string | null;
  objetivo?: { titulo: string } | null;
}

interface EmployeeKanbanProps {
  tareas: EmployeeTarea[];
  onRefresh: () => void;
  soloVencidas?: boolean;
}

const COLUMNS: { key: TaskStatus; label: string; accent: string }[] = [
  { key: "PENDIENTE", label: "Pendiente", accent: "border-t-slate-400" },
  { key: "EN_PROCESO", label: "En proceso", accent: "border-t-blue-500" },
  { key: "PENDIENTE_APROBACION", label: "En revisión", accent: "border-t-amber-500" },
  { key: "COMPLETADA", label: "Completada", accent: "border-t-emerald-500" },
];

const PRIORITY_LABEL: Record<number, string> = {
  1: "Alta",
  2: "Media",
  3: "Baja",
};

export function EmployeeKanban({ tareas, onRefresh, soloVencidas = false }: EmployeeKanbanProps) {
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
      const data = await res.json().catch(() => ({}));
      if (data.workflowPendiente) {
        setTaskError("");
      }
      onRefresh();
    } catch {
      setTaskError("Error de conexión al actualizar la tarea.");
    } finally {
      setLoadingId(null);
    }
  }

  const visibles = soloVencidas
    ? tareas.filter((t) => {
        if (!t.fechaLimite || t.estado === "COMPLETADA") return false;
        return new Date(t.fechaLimite) < new Date();
      })
    : tareas;

  return (
    <div className="space-y-4">
      {taskError && <p className="text-sm text-destructive">{taskError}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 animate-stagger">
        {COLUMNS.map((col) => {
          const columnTasks = visibles.filter((t) => t.estado === col.key);
          return (
            <div
              key={col.key}
              className={cn("kanban-column border-t-4 p-3", col.accent)}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <Badge variant="secondary" className="rounded-lg">
                  {columnTasks.length}
                </Badge>
              </div>
              <div className="space-y-2.5">
                {columnTasks.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">Vacío</p>
                )}
                {columnTasks.map((tarea) => (
                  <div
                    key={tarea.id}
                    className={cn(
                      "kanban-card space-y-2 p-4",
                      tareaCardLimiteClass(tarea.fechaLimite, tarea.estado)
                    )}
                  >
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
                            className="border-violet-300 bg-violet-50 text-[10px] text-violet-700"
                          >
                            Premio ×{tarea.pesoProductividad}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {tarea.descripcion && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {tarea.descripcion}
                      </p>
                    )}
                    <TareaFechaLimiteBadge fechaLimite={tarea.fechaLimite} estado={tarea.estado} />
                    {tarea.objetivo && (
                      <p className="text-xs text-muted-foreground">
                        Objetivo: {tarea.objetivo.titulo}
                      </p>
                    )}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Estimado: {formatMinutes(tarea.tiempoEstimado)}</p>
                      {tarea.estado === "EN_PROCESO" && tarea.startedAt && (
                        <TaskTimer startedAt={tarea.startedAt} />
                      )}
                      {tarea.tiempoReal != null && (
                        <p className="font-medium text-emerald-600">
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
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 flex-1 rounded-lg text-xs"
                            disabled={loadingId === tarea.id}
                            onClick={() => updateEstado(tarea.id, "PENDIENTE")}
                          >
                            Pausar
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 flex-1 rounded-lg text-xs"
                            disabled={loadingId === tarea.id}
                            onClick={() => updateEstado(tarea.id, "COMPLETADA")}
                          >
                            {loadingId === tarea.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Enviar a revisión"
                            )}
                          </Button>
                        </>
                      )}
                      {col.key === "PENDIENTE_APROBACION" && (
                        <p className="text-xs text-amber-700 font-medium w-full text-center py-1">
                          Esperando aprobación del gerente
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

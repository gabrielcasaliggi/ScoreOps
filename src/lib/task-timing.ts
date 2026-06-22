import type { TaskStatus } from "@prisma/client";

interface TareaTiming {
  estado: TaskStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  tiempoReal: number | null;
  createdAt: Date;
}

/** Minutos transcurridos entre dos fechas (mínimo 1 minuto) */
export function calculateRealMinutes(startedAt: Date, completedAt: Date): number {
  const diffMs = completedAt.getTime() - startedAt.getTime();
  return Math.max(1, Math.round(diffMs / 60000));
}

/** Calcula los cambios de tiempo al cambiar el estado de una tarea */
export function buildStatusTransition(
  existing: TareaTiming,
  newEstado: TaskStatus,
  manualTiempoReal?: number
): Record<string, unknown> {
  const now = new Date();
  const data: Record<string, unknown> = { estado: newEstado };

  if (newEstado === "EN_PROCESO") {
    if (existing.estado === "PENDIENTE" || !existing.startedAt) {
      data.startedAt = now;
    }
    if (existing.estado === "COMPLETADA") {
      data.completedAt = null;
      data.tiempoReal = null;
      data.startedAt = now;
    }
  }

  if (newEstado === "PENDIENTE") {
    data.startedAt = null;
    data.completedAt = null;
    data.tiempoReal = null;
  }

  if (newEstado === "COMPLETADA" && existing.estado !== "COMPLETADA") {
    data.completedAt = now;

    if (manualTiempoReal != null && manualTiempoReal > 0) {
      data.tiempoReal = manualTiempoReal;
      if (!existing.startedAt) {
        data.startedAt = new Date(now.getTime() - manualTiempoReal * 60000);
      }
    } else {
      const start = existing.startedAt ?? existing.createdAt;
      data.tiempoReal = calculateRealMinutes(start, now);
      if (!existing.startedAt) {
        data.startedAt = start;
      }
    }
  }

  return data;
}

/** Minutos transcurridos desde el inicio (para tareas en proceso) */
export function getElapsedMinutes(startedAt: Date): number {
  return Math.max(0, Math.round((Date.now() - startedAt.getTime()) / 60000));
}

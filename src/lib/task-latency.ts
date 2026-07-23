import type { Tarea } from "@prisma/client";
import { formatMinutes } from "./utils";
import {
  filterTareasForPeriodStats,
  type ProductivityPeriod,
} from "./productivity-period";

export type TareaLatencyInput = Pick<
  Tarea,
  | "estado"
  | "assignedAt"
  | "startedAt"
  | "completedAt"
  | "createdAt"
  | "tiempoReal"
  | "updatedAt"
>;

export interface TaskLatency {
  demoraInicioMin: number | null;
  tiempoActivoMin: number | null;
  tiempoTotalMin: number | null;
}

export interface LatencyStats {
  avg: number | null;
  median: number | null;
}

export interface AggregatedLatencies {
  count: number;
  demoraInicio: LatencyStats;
  tiempoActivo: LatencyStats;
  tiempoTotal: LatencyStats;
}

/** Diferencia en minutos (mínimo 0). */
function minutesBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}

/**
 * Detecta startedAt backfilleado al completar sin pasar por EN_PROCESO
 * (startedAt ≈ createdAt). Esas demoras de inicio no son medibles.
 */
function isStartedAtBackfilled(tarea: TareaLatencyInput): boolean {
  if (!tarea.startedAt) return true;
  return Math.abs(tarea.startedAt.getTime() - tarea.createdAt.getTime()) < 1000;
}

/** Latencia de una tarea completada; null si no aplica. */
export function computeTaskLatency(tarea: TareaLatencyInput): TaskLatency | null {
  if (tarea.estado !== "COMPLETADA" || !tarea.completedAt) return null;

  const tiempoTotalMin = minutesBetween(tarea.assignedAt, tarea.completedAt);

  const demoraInicioMin =
    tarea.startedAt && !isStartedAtBackfilled(tarea)
      ? minutesBetween(tarea.assignedAt, tarea.startedAt)
      : null;

  const tiempoActivoMin =
    tarea.tiempoReal != null && tarea.tiempoReal > 0
      ? tarea.tiempoReal
      : tarea.startedAt
        ? minutesBetween(tarea.startedAt, tarea.completedAt)
        : null;

  return { demoraInicioMin, tiempoActivoMin, tiempoTotalMin };
}

function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

function avgOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

function toStats(values: number[]): LatencyStats {
  return { avg: avgOf(values), median: medianOf(values) };
}

const EMPTY_LATENCIES: AggregatedLatencies = {
  count: 0,
  demoraInicio: { avg: null, median: null },
  tiempoActivo: { avg: null, median: null },
  tiempoTotal: { avg: null, median: null },
};

/** Agrega latencias de tareas completadas. */
export function aggregateLatencies(tareas: TareaLatencyInput[]): AggregatedLatencies {
  const demoraInicio: number[] = [];
  const tiempoActivo: number[] = [];
  const tiempoTotal: number[] = [];
  let count = 0;

  for (const tarea of tareas) {
    const latency = computeTaskLatency(tarea);
    if (!latency) continue;
    count += 1;
    if (latency.demoraInicioMin != null) demoraInicio.push(latency.demoraInicioMin);
    if (latency.tiempoActivoMin != null) tiempoActivo.push(latency.tiempoActivoMin);
    if (latency.tiempoTotalMin != null) tiempoTotal.push(latency.tiempoTotalMin);
  }

  if (count === 0) return EMPTY_LATENCIES;

  return {
    count,
    demoraInicio: toStats(demoraInicio),
    tiempoActivo: toStats(tiempoActivo),
    tiempoTotal: toStats(tiempoTotal),
  };
}

/** Completadas del período + agregados de demora. */
export function aggregateLatenciesForPeriod(
  tareas: TareaLatencyInput[],
  period: ProductivityPeriod
): AggregatedLatencies {
  return aggregateLatencies(filterTareasForPeriodStats(tareas, period));
}

/** Formato legible (reexporta formatMinutes del proyecto). */
export function formatLatencyMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  return formatMinutes(minutes);
}

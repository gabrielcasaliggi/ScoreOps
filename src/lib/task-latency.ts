import type { Tarea } from "@prisma/client";
import { formatMinutes } from "./utils";
import {
  filterTareasForPeriodStats,
  type ProductivityPeriod,
} from "./productivity-period";

export type TareaLatencyInput = Pick<
  Tarea,
  | "id"
  | "titulo"
  | "estado"
  | "assignedAt"
  | "startedAt"
  | "completedAt"
  | "createdAt"
  | "tiempoReal"
  | "updatedAt"
> & {
  userId?: string;
  user?: { nombre: string; apellido: string } | null;
};

export interface TaskLatency {
  /** Minutos desde asignación hasta empezar (null si no medible). */
  demoraInicioMin: number | null;
  /** Minutos resolviendo (tiempoReal / started→completed). */
  tiempoActivoMin: number | null;
  /** Minutos desde asignación hasta cierre. */
  tiempoTotalMin: number | null;
  /**
   * Tiempo ocioso / en cola: demoraInicio si es medible;
   * si no, max(0, total − activo) como aproximación.
   */
  tiempoOciosoMin: number | null;
  /** % del ciclo que fue espera antes de empezar (0–100), si medible. */
  pctOcioso: number | null;
}

export interface TaskLatencyRow extends TaskLatency {
  id: string;
  titulo: string;
  userId?: string;
  userNombre?: string;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string;
}

export interface LatencyStats {
  avg: number | null;
  median: number | null;
}

export interface AggregatedLatencies {
  count: number;
  /** Cuántas tienen demora de inicio medible (pasaron por En proceso). */
  conInicioMedible: number;
  demoraInicio: LatencyStats;
  tiempoActivo: LatencyStats;
  tiempoTotal: LatencyStats;
  tiempoOcioso: LatencyStats;
  pctOcioso: LatencyStats;
  /** Detalle por tarea (más recientes primero). */
  porTarea: TaskLatencyRow[];
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

  let tiempoActivoMin =
    tarea.tiempoReal != null && tarea.tiempoReal > 0
      ? tarea.tiempoReal
      : tarea.startedAt
        ? minutesBetween(tarea.startedAt, tarea.completedAt)
        : null;

  // Si tiempoReal (manual o raro) supera el ciclo, preferir reloj started→completed
  if (tiempoActivoMin != null && tiempoActivoMin > tiempoTotalMin) {
    tiempoActivoMin = tarea.startedAt
      ? minutesBetween(tarea.startedAt, tarea.completedAt)
      : tiempoTotalMin;
  }

  const tiempoOciosoMin =
    demoraInicioMin != null
      ? demoraInicioMin
      : tiempoActivoMin != null
        ? Math.max(0, tiempoTotalMin - tiempoActivoMin)
        : null;

  const pctOcioso =
    tiempoOciosoMin != null && tiempoTotalMin > 0
      ? Math.round((tiempoOciosoMin / tiempoTotalMin) * 1000) / 10
      : tiempoTotalMin === 0
        ? 0
        : null;

  return {
    demoraInicioMin,
    tiempoActivoMin,
    tiempoTotalMin,
    tiempoOciosoMin,
    pctOcioso,
  };
}

function toLatencyRow(tarea: TareaLatencyInput, latency: TaskLatency): TaskLatencyRow {
  return {
    ...latency,
    id: tarea.id,
    titulo: tarea.titulo,
    userId: tarea.userId,
    userNombre: tarea.user
      ? `${tarea.user.nombre} ${tarea.user.apellido}`.trim()
      : undefined,
    assignedAt: tarea.assignedAt.toISOString(),
    startedAt: tarea.startedAt?.toISOString() ?? null,
    completedAt: tarea.completedAt!.toISOString(),
  };
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

function avgFloat(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

function toStats(values: number[]): LatencyStats {
  return { avg: avgOf(values), median: medianOf(values) };
}

export const EMPTY_LATENCIES: AggregatedLatencies = {
  count: 0,
  conInicioMedible: 0,
  demoraInicio: { avg: null, median: null },
  tiempoActivo: { avg: null, median: null },
  tiempoTotal: { avg: null, median: null },
  tiempoOcioso: { avg: null, median: null },
  pctOcioso: { avg: null, median: null },
  porTarea: [],
};

const DEFAULT_DETALLE_LIMIT = 50;

/** Agrega latencias de tareas completadas. */
export function aggregateLatencies(
  tareas: TareaLatencyInput[],
  options?: { detalleLimit?: number }
): AggregatedLatencies {
  const detalleLimit = options?.detalleLimit ?? DEFAULT_DETALLE_LIMIT;
  const demoraInicio: number[] = [];
  const tiempoActivo: number[] = [];
  const tiempoTotal: number[] = [];
  const tiempoOcioso: number[] = [];
  const pctOcioso: number[] = [];
  const rows: TaskLatencyRow[] = [];
  let count = 0;
  let conInicioMedible = 0;

  for (const tarea of tareas) {
    const latency = computeTaskLatency(tarea);
    if (!latency) continue;
    count += 1;
    if (latency.demoraInicioMin != null) {
      demoraInicio.push(latency.demoraInicioMin);
      conInicioMedible += 1;
    }
    if (latency.tiempoActivoMin != null) tiempoActivo.push(latency.tiempoActivoMin);
    if (latency.tiempoTotalMin != null) tiempoTotal.push(latency.tiempoTotalMin);
    if (latency.tiempoOciosoMin != null) tiempoOcioso.push(latency.tiempoOciosoMin);
    if (latency.pctOcioso != null) pctOcioso.push(latency.pctOcioso);
    if (detalleLimit > 0) {
      rows.push(toLatencyRow(tarea, latency));
    }
  }

  if (count === 0) return EMPTY_LATENCIES;

  rows.sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  return {
    count,
    conInicioMedible,
    demoraInicio: toStats(demoraInicio),
    tiempoActivo: toStats(tiempoActivo),
    tiempoTotal: toStats(tiempoTotal),
    tiempoOcioso: toStats(tiempoOcioso),
    pctOcioso: {
      avg: avgFloat(pctOcioso),
      median: pctOcioso.length ? medianOf(pctOcioso.map((v) => Math.round(v))) : null,
    },
    porTarea: detalleLimit > 0 ? rows.slice(0, detalleLimit) : [],
  };
}

/** Completadas del período + agregados de demora. */
export function aggregateLatenciesForPeriod(
  tareas: TareaLatencyInput[],
  period: ProductivityPeriod,
  options?: { detalleLimit?: number }
): AggregatedLatencies {
  return aggregateLatencies(filterTareasForPeriodStats(tareas, period), options);
}

/** Formato legible (reexporta formatMinutes del proyecto). */
export function formatLatencyMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  return formatMinutes(minutes);
}

/** Proporciones 0–100 para barra de composición (ocioso vs activo). */
export function latencyComposition(latencias: AggregatedLatencies): {
  ociosoPct: number;
  activoPct: number;
} {
  const ocioso = latencias.tiempoOcioso.avg ?? 0;
  const activo = latencias.tiempoActivo.avg ?? 0;
  const sum = ocioso + activo;
  if (sum <= 0) return { ociosoPct: 0, activoPct: 0 };
  const ociosoPct = Math.round((ocioso / sum) * 100);
  return { ociosoPct, activoPct: 100 - ociosoPct };
}

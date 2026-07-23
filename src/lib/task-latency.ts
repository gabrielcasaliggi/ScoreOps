import type { TaskStatus, Tarea } from "@prisma/client";
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
  /** Minutos resolviendo (tiempoReal / started→completed|now). */
  tiempoActivoMin: number | null;
  /** Minutos desde asignación hasta cierre (o ahora si está abierta). */
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
  estado: TaskStatus;
  enCurso: boolean;
  userId?: string;
  userNombre?: string;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface LatencyStats {
  avg: number | null;
  median: number | null;
}

export interface AggregatedLatencies {
  count: number;
  /** Cuántas tienen demora de inicio medible (pasaron por En proceso). */
  conInicioMedible: number;
  /** Tareas abiertas incluidas en el detalle. */
  abiertasCount: number;
  demoraInicio: LatencyStats;
  tiempoActivo: LatencyStats;
  tiempoTotal: LatencyStats;
  tiempoOcioso: LatencyStats;
  pctOcioso: LatencyStats;
  /** Detalle: abiertas primero, luego completadas recientes. */
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

function withOcioso(
  demoraInicioMin: number | null,
  tiempoActivoMin: number | null,
  tiempoTotalMin: number
): Pick<TaskLatency, "tiempoOciosoMin" | "pctOcioso"> {
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

  return { tiempoOciosoMin, pctOcioso };
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

  if (tiempoActivoMin != null && tiempoActivoMin > tiempoTotalMin) {
    tiempoActivoMin = tarea.startedAt
      ? minutesBetween(tarea.startedAt, tarea.completedAt)
      : tiempoTotalMin;
  }

  return {
    demoraInicioMin,
    tiempoActivoMin,
    tiempoTotalMin,
    ...withOcioso(demoraInicioMin, tiempoActivoMin, tiempoTotalMin),
  };
}

/**
 * Latencia en curso de una tarea abierta (pendiente / en proceso / por aprobar).
 * Los tiempos corren hasta `now`.
 */
export function computeOpenTaskLatency(
  tarea: TareaLatencyInput,
  now: Date = new Date()
): TaskLatency | null {
  if (tarea.estado === "COMPLETADA") return null;
  if (
    tarea.estado !== "PENDIENTE" &&
    tarea.estado !== "EN_PROCESO" &&
    tarea.estado !== "PENDIENTE_APROBACION"
  ) {
    return null;
  }

  const tiempoTotalMin = minutesBetween(tarea.assignedAt, now);
  const hasRealStart = Boolean(tarea.startedAt && !isStartedAtBackfilled(tarea));

  if (tarea.estado === "PENDIENTE" || !hasRealStart) {
    return {
      demoraInicioMin: tiempoTotalMin,
      tiempoActivoMin: null,
      tiempoTotalMin,
      tiempoOciosoMin: tiempoTotalMin,
      pctOcioso: tiempoTotalMin > 0 ? 100 : 0,
    };
  }

  const demoraInicioMin = minutesBetween(tarea.assignedAt, tarea.startedAt!);
  const tiempoActivoMin = minutesBetween(tarea.startedAt!, now);

  return {
    demoraInicioMin,
    tiempoActivoMin,
    tiempoTotalMin,
    ...withOcioso(demoraInicioMin, tiempoActivoMin, tiempoTotalMin),
  };
}

function toLatencyRow(
  tarea: TareaLatencyInput,
  latency: TaskLatency,
  enCurso: boolean
): TaskLatencyRow {
  return {
    ...latency,
    id: tarea.id,
    titulo: tarea.titulo,
    estado: tarea.estado,
    enCurso,
    userId: tarea.userId,
    userNombre: tarea.user
      ? `${tarea.user.nombre} ${tarea.user.apellido}`.trim()
      : undefined,
    assignedAt: tarea.assignedAt.toISOString(),
    startedAt: tarea.startedAt?.toISOString() ?? null,
    completedAt: tarea.completedAt?.toISOString() ?? null,
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
  abiertasCount: 0,
  demoraInicio: { avg: null, median: null },
  tiempoActivo: { avg: null, median: null },
  tiempoTotal: { avg: null, median: null },
  tiempoOcioso: { avg: null, median: null },
  pctOcioso: { avg: null, median: null },
  porTarea: [],
};

const DEFAULT_DETALLE_LIMIT = 50;

function buildOpenRows(
  tareas: TareaLatencyInput[],
  detalleLimit: number,
  now: Date
): TaskLatencyRow[] {
  if (detalleLimit <= 0) return [];
  const rows: TaskLatencyRow[] = [];
  for (const tarea of tareas) {
    const latency = computeOpenTaskLatency(tarea, now);
    if (!latency) continue;
    rows.push(toLatencyRow(tarea, latency, true));
  }
  rows.sort(
    (a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
  );
  return rows;
}

/** Agrega latencias de tareas completadas (+ detalle de abiertas opcional). */
export function aggregateLatencies(
  tareasCompletadas: TareaLatencyInput[],
  options?: {
    detalleLimit?: number;
    abiertas?: TareaLatencyInput[];
    now?: Date;
  }
): AggregatedLatencies {
  const detalleLimit = options?.detalleLimit ?? DEFAULT_DETALLE_LIMIT;
  const now = options?.now ?? new Date();
  const demoraInicio: number[] = [];
  const tiempoActivo: number[] = [];
  const tiempoTotal: number[] = [];
  const tiempoOcioso: number[] = [];
  const pctOcioso: number[] = [];
  const completedRows: TaskLatencyRow[] = [];
  let count = 0;
  let conInicioMedible = 0;

  for (const tarea of tareasCompletadas) {
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
      completedRows.push(toLatencyRow(tarea, latency, false));
    }
  }

  const openRows = buildOpenRows(options?.abiertas ?? [], detalleLimit, now);

  if (count === 0 && openRows.length === 0) return EMPTY_LATENCIES;

  completedRows.sort(
    (a, b) =>
      new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime()
  );

  const remaining = Math.max(0, detalleLimit - openRows.length);
  const porTarea =
    detalleLimit > 0
      ? [...openRows.slice(0, detalleLimit), ...completedRows.slice(0, remaining)]
      : [];

  return {
    count,
    conInicioMedible,
    abiertasCount: openRows.length,
    demoraInicio: toStats(demoraInicio),
    tiempoActivo: toStats(tiempoActivo),
    tiempoTotal: toStats(tiempoTotal),
    tiempoOcioso: toStats(tiempoOcioso),
    pctOcioso: {
      avg: avgFloat(pctOcioso),
      median: pctOcioso.length ? medianOf(pctOcioso.map((v) => Math.round(v))) : null,
    },
    porTarea,
  };
}

/** Completadas del período para promedios + abiertas actuales en el detalle. */
export function aggregateLatenciesForPeriod(
  tareas: TareaLatencyInput[],
  period: ProductivityPeriod,
  options?: { detalleLimit?: number; now?: Date }
): AggregatedLatencies {
  const completadas = filterTareasForPeriodStats(tareas, period);
  const abiertas = tareas.filter((t) => t.estado !== "COMPLETADA");
  return aggregateLatencies(completadas, {
    detalleLimit: options?.detalleLimit,
    abiertas,
    now: options?.now,
  });
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

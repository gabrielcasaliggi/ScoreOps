import type { Objetivo, Tarea } from "@prisma/client";

export interface ProductivityPeriod {
  id: string;
  label: string;
  semester: 1 | 2;
  anioCalculo: number;
  inicio: Date;
  fin: Date;
  esActual: boolean;
  /** Meses en los que se acumulan asistencia, puntualidad y métricas */
  mesesCalculoLabel: string;
  /** Ventana orientativa de cobro (fines del mes de pago) */
  fechaLiquidacion: Date;
  /** Ej: "Septiembre 2026" */
  mesPagoLabel: string;
  /** Texto para UI / reportes */
  liquidacionDescripcion: string;
}

/**
 * Semestres de acumulación (telecomunicaciones):
 * - S1: cálculo Ene–Jun → pago con haberes de septiembre (mismo año)
 * - S2: cálculo Jul–Dic → pago con haberes de marzo (año siguiente)
 */
export function getSemesterPeriod(
  offset: 0 | -1 = 0,
  ref: Date = new Date()
): ProductivityPeriod {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const isFirstHalf = month < 6;

  let semYear = year;
  let semester: 1 | 2 = isFirstHalf ? 1 : 2;

  if (offset === -1) {
    if (semester === 1) {
      semester = 2;
      semYear -= 1;
    } else {
      semester = 1;
    }
  }

  const inicio =
    semester === 1
      ? new Date(semYear, 0, 1, 0, 0, 0, 0)
      : new Date(semYear, 6, 1, 0, 0, 0, 0);

  const fin =
    semester === 1
      ? new Date(semYear, 5, 30, 23, 59, 59, 999)
      : new Date(semYear, 11, 31, 23, 59, 59, 999);

  const mesesCalculoLabel =
    semester === 1
      ? `Enero – Junio ${semYear}`
      : `Julio – Diciembre ${semYear}`;

  const label = mesesCalculoLabel;

  // Fines de septiembre / marzo como referencia de liquidación
  const fechaLiquidacion =
    semester === 1
      ? new Date(semYear, 8, 30, 23, 59, 59, 999)
      : new Date(semYear + 1, 2, 31, 23, 59, 59, 999);

  const mesPagoLabel =
    semester === 1 ? `Septiembre ${semYear}` : `Marzo ${semYear + 1}`;

  const liquidacionDescripcion =
    semester === 1
      ? `Cobro con haberes de septiembre ${semYear} (fines de sept. / inicios de oct.)`
      : `Cobro con haberes de marzo ${semYear + 1} (fines de mar. / inicios de abr.)`;

  const now = new Date();
  const esActual = now >= inicio && now <= fin;

  return {
    id: `${semYear}-S${semester}`,
    label,
    semester,
    anioCalculo: semYear,
    inicio,
    fin,
    esActual,
    mesesCalculoLabel,
    fechaLiquidacion,
    mesPagoLabel,
    liquidacionDescripcion,
  };
}

export function parsePeriodoParam(param: string | null): ProductivityPeriod {
  if (param === "anterior") return getSemesterPeriod(-1);
  return getSemesterPeriod(0);
}

export function periodoToApiPayload(period: ProductivityPeriod) {
  return {
    id: period.id,
    label: period.label,
    semester: period.semester,
    anioCalculo: period.anioCalculo,
    esActual: period.esActual,
    mesesCalculoLabel: period.mesesCalculoLabel,
    mesPagoLabel: period.mesPagoLabel,
    liquidacionDescripcion: period.liquidacionDescripcion,
    inicio: period.inicio.toISOString(),
    fin: period.fin.toISOString(),
    fechaLiquidacion: period.fechaLiquidacion.toISOString(),
    diasHastaLiquidacion: daysUntil(period.fechaLiquidacion),
    liquidacionPendiente: period.fechaLiquidacion.getTime() > Date.now(),
  };
}

export function filterObjetivosForPeriod<T extends Pick<Objetivo, "fechaInicio" | "fechaFin">>(
  objetivos: T[],
  period: ProductivityPeriod
): T[] {
  return objetivos.filter(
    (o) => o.fechaInicio <= period.fin && o.fechaFin >= period.inicio
  );
}

/** Tareas completadas dentro del semestre (base del premio) */
export function filterTareasForPeriodStats<
  T extends Pick<Tarea, "estado" | "completedAt" | "updatedAt">,
>(tareas: T[], period: ProductivityPeriod): T[] {
  return tareas.filter((t) => {
    if (t.estado !== "COMPLETADA") return false;
    const ref = t.completedAt ?? t.updatedAt;
    return ref >= period.inicio && ref <= period.fin;
  });
}

export function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}

export function periodoIdFromDate(date: Date): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  const semester = month < 6 ? 1 : 2;
  const semYear = year;
  return `${semYear}-S${semester}`;
}

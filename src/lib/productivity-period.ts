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
  /** Ej: "Abril 2026" */
  mesPagoLabel: string;
  /** Texto para UI / reportes */
  liquidacionDescripcion: string;
}

/**
 * Semestres CCT telecomunicaciones:
 * - S1: cálculo Oct (año N) – Mar (año N+1) → pago con haberes de abril N+1
 * - S2: cálculo Abr – Sep (año N) → pago con haberes de octubre N
 */
function resolveCurrentSemester(ref: Date): { semester: 1 | 2; startYear: number } {
  const year = ref.getFullYear();
  const month = ref.getMonth(); // 0=ene … 9=oct

  // Oct–Dic → S1 que empieza este año
  if (month >= 9) {
    return { semester: 1, startYear: year };
  }
  // Ene–Mar → S1 que empezó el octubre anterior
  if (month <= 2) {
    return { semester: 1, startYear: year - 1 };
  }
  // Abr–Sep → S2 del año calendario
  return { semester: 2, startYear: year };
}

function shiftSemester(
  semester: 1 | 2,
  startYear: number,
  offset: 0 | -1
): { semester: 1 | 2; startYear: number } {
  if (offset === 0) return { semester, startYear };
  if (semester === 1) {
    // Anterior a S1 (oct N–mar N+1) = S2 abr–sep del mismo N
    return { semester: 2, startYear };
  }
  // Anterior a S2 (abr–sep N) = S1 oct (N-1)–mar N
  return { semester: 1, startYear: startYear - 1 };
}

/**
 * Semestres de acumulación (telecomunicaciones / CCT):
 * - S1: Oct–Mar → pago abril
 * - S2: Abr–Sep → pago octubre
 */
export function getSemesterPeriod(
  offset: 0 | -1 = 0,
  ref: Date = new Date()
): ProductivityPeriod {
  const current = resolveCurrentSemester(ref);
  const { semester, startYear } = shiftSemester(current.semester, current.startYear, offset);

  let inicio: Date;
  let fin: Date;
  let mesesCalculoLabel: string;
  let fechaLiquidacion: Date;
  let mesPagoLabel: string;
  let liquidacionDescripcion: string;
  let anioCalculo: number;

  if (semester === 1) {
    // Oct startYear – Mar startYear+1 → pago Abril startYear+1
    inicio = new Date(startYear, 9, 1, 0, 0, 0, 0);
    fin = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
    anioCalculo = startYear + 1;
    mesesCalculoLabel = `Octubre ${startYear} – Marzo ${startYear + 1}`;
    fechaLiquidacion = new Date(startYear + 1, 3, 30, 23, 59, 59, 999);
    mesPagoLabel = `Abril ${startYear + 1}`;
    liquidacionDescripcion = `Cobro con haberes de abril ${startYear + 1} (novedades de marzo)`;
  } else {
    // Abr–Sep startYear → pago Octubre startYear
    inicio = new Date(startYear, 3, 1, 0, 0, 0, 0);
    fin = new Date(startYear, 8, 30, 23, 59, 59, 999);
    anioCalculo = startYear;
    mesesCalculoLabel = `Abril – Septiembre ${startYear}`;
    fechaLiquidacion = new Date(startYear, 9, 31, 23, 59, 59, 999);
    mesPagoLabel = `Octubre ${startYear}`;
    liquidacionDescripcion = `Cobro con haberes de octubre ${startYear} (novedades de septiembre)`;
  }

  const label = mesesCalculoLabel;
  const now = new Date();
  const esActual = now >= inicio && now <= fin;

  return {
    id: `${startYear}-S${semester}`,
    label,
    semester,
    anioCalculo,
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
  const { semester, startYear } = resolveCurrentSemester(date);
  return `${startYear}-S${semester}`;
}

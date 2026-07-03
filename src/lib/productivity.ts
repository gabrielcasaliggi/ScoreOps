import type { KPI, Tarea } from "@prisma/client";

export interface KpiCompliance {
  kpiId: string;
  nombre: string;
  unidad: string;
  valorMeta: number;
  valorActual: number;
  cumplimiento: number;
}

export interface TemporalEfficiency {
  tareasCompletadas: number;
  tiempoEstimadoTotal: number;
  tiempoRealTotal: number;
  eficiencia: number;
  desvioPorcentaje: number;
}

import type { PremioArt49 } from "./art49-types";

export interface GestionInternaBonus {
  puntajePremio: number;
  tareasEvaluablesCompletadas: number;
  eficienciaEvaluable: number;
  tiempoEstimadoEvaluable: number;
  tiempoRealEvaluable: number;
}

export interface ProductivityBonus extends GestionInternaBonus {
  /** Porcentaje del sueldo de referencia acumulado (0–50, Art. 49 u otra plantilla) */
  puntajePremio: number;
  art49?: PremioArt49;
  premioTemplate?: import("./premio-templates").PremioTemplateId;
  gestionInternaPuntaje: number;
}

export interface EmployeeProductivity {
  userId: string;
  nombre: string;
  apellido: string;
  area: string;
  kpiCompliance: KpiCompliance[];
  kpiPromedio: number;
  temporalEfficiency: TemporalEfficiency;
  scoreGeneral: number;
  productivityBonus: ProductivityBonus;
}

type TareaProductividad = Pick<
  Tarea,
  | "tiempoEstimado"
  | "tiempoReal"
  | "estado"
  | "evaluaProductividad"
  | "pesoProductividad"
>;

/** Cumplimiento KPI = (Valor Actual / Valor Meta) × 100 */
export function calculateKpiCompliance(
  kpi: Pick<KPI, "id" | "nombre" | "valorMeta" | "valorActual" | "unidad">
): KpiCompliance {
  const cumplimiento =
    kpi.valorMeta > 0 ? (kpi.valorActual / kpi.valorMeta) * 100 : 0;

  return {
    kpiId: kpi.id,
    nombre: kpi.nombre,
    unidad: kpi.unidad,
    valorMeta: kpi.valorMeta,
    valorActual: kpi.valorActual,
    cumplimiento: Math.min(cumplimiento, 100),
  };
}

/** Eficiencia temporal = (tiempo estimado / tiempo real) × 100 en tareas completadas */
export function calculateTemporalEfficiency(
  tareas: Pick<Tarea, "tiempoEstimado" | "tiempoReal" | "estado">[]
): TemporalEfficiency {
  const completadas = tareas.filter(
    (t) => t.estado === "COMPLETADA" && t.tiempoReal != null && t.tiempoReal > 0
  );

  if (completadas.length === 0) {
    return {
      tareasCompletadas: 0,
      tiempoEstimadoTotal: 0,
      tiempoRealTotal: 0,
      eficiencia: 0,
      desvioPorcentaje: 0,
    };
  }

  const tiempoEstimadoTotal = completadas.reduce((sum, t) => sum + t.tiempoEstimado, 0);
  const tiempoRealTotal = completadas.reduce((sum, t) => sum + (t.tiempoReal ?? 0), 0);

  const eficiencia =
    tiempoRealTotal > 0 ? (tiempoEstimadoTotal / tiempoRealTotal) * 100 : 0;

  const desvioPorcentaje =
    tiempoEstimadoTotal > 0
      ? ((tiempoRealTotal - tiempoEstimadoTotal) / tiempoEstimadoTotal) * 100
      : 0;

  return {
    tareasCompletadas: completadas.length,
    tiempoEstimadoTotal,
    tiempoRealTotal,
    eficiencia: Math.min(eficiencia, 200),
    desvioPorcentaje,
  };
}

/**
 * Puntaje para premio de productividad.
 * Solo cuenta tareas con evaluaProductividad=true, ponderadas por pesoProductividad.
 * Fórmula: 60% KPI + 40% eficiencia en tareas evaluables.
 */
export function calculateProductivityBonus(
  tareas: TareaProductividad[],
  kpiPromedio: number
): GestionInternaBonus {
  const evaluables = tareas.filter(
    (t) =>
      t.estado === "COMPLETADA" &&
      t.evaluaProductividad &&
      t.tiempoReal != null &&
      t.tiempoReal > 0
  );

  if (evaluables.length === 0) {
    return {
      puntajePremio: Math.round(kpiPromedio * 0.6 * 10) / 10,
      tareasEvaluablesCompletadas: 0,
      eficienciaEvaluable: 0,
      tiempoEstimadoEvaluable: 0,
      tiempoRealEvaluable: 0,
    };
  }

  let tiempoEstimadoEvaluable = 0;
  let tiempoRealEvaluable = 0;

  for (const t of evaluables) {
    const peso = t.pesoProductividad ?? 1;
    tiempoEstimadoEvaluable += t.tiempoEstimado * peso;
    tiempoRealEvaluable += (t.tiempoReal ?? 0) * peso;
  }

  const eficienciaEvaluable =
    tiempoRealEvaluable > 0
      ? (tiempoEstimadoEvaluable / tiempoRealEvaluable) * 100
      : 0;

  const puntajePremio = calculateGeneralScore(kpiPromedio, eficienciaEvaluable);

  return {
    puntajePremio,
    tareasEvaluablesCompletadas: evaluables.length,
    eficienciaEvaluable: Math.round(eficienciaEvaluable * 10) / 10,
    tiempoEstimadoEvaluable,
    tiempoRealEvaluable,
  };
}

export function calculateGeneralScore(
  kpiPromedio: number,
  eficiencia: number
): number {
  if (kpiPromedio === 0 && eficiencia === 0) return 0;
  return Math.round((kpiPromedio * 0.6 + eficiencia * 0.4) * 10) / 10;
}

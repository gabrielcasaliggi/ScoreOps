import type { AsistenciaRegistro, KPI, Objetivo, Tarea, User, Area } from "@prisma/client";
import {
  calculateGeneralScore,
  calculateKpiCompliance,
  calculateProductivityBonus,
  calculateTemporalEfficiency,
  type EmployeeProductivity,
  type ProductivityBonus,
} from "./productivity";
import {
  filterObjetivosForPeriod,
  filterTareasForPeriodStats,
  type ProductivityPeriod,
} from "./productivity-period";
import { calcularPremioArt49 } from "./premio-art49";
import { getMetasColectivas } from "./metas-colectivas";
import { getArt49Config } from "./system-config";
import { getSemesterPeriod } from "./productivity-period";

export type EmpleadoConDatos = User & {
  area: Area;
  objetivos: (Objetivo & { kpis: KPI[] })[];
  tareas: Tarea[];
  asistencias?: AsistenciaRegistro[];
};

export interface EmployeeProductivityExtended extends EmployeeProductivity {
  productivityBonus: ProductivityBonus;
}

export async function buildEmployeeProductivity(
  empleado: EmpleadoConDatos,
  period?: ProductivityPeriod
): Promise<EmployeeProductivityExtended> {
  const objetivos = period
    ? filterObjetivosForPeriod(empleado.objetivos, period)
    : empleado.objetivos;

  const tareas = period
    ? filterTareasForPeriodStats(empleado.tareas, period)
    : empleado.tareas;

  const asistencias =
    period && empleado.asistencias
      ? empleado.asistencias.filter((a) => a.periodoId === period.id)
      : (empleado.asistencias ?? []);

  const allKpis = objetivos.flatMap((o) => o.kpis);
  const kpiCompliance = allKpis.map(calculateKpiCompliance);
  const kpiPromedio =
    kpiCompliance.length > 0
      ? kpiCompliance.reduce((sum, k) => sum + k.cumplimiento, 0) / kpiCompliance.length
      : 0;

  const temporalEfficiency = calculateTemporalEfficiency(tareas);
  const gestionInterna = calculateProductivityBonus(tareas, kpiPromedio);

  const effectivePeriod = period ?? getSemesterPeriod();
  const periodoId = effectivePeriod.id;
  const [config, metasColectivas] = await Promise.all([
    getArt49Config(empleado.organizationId),
    getMetasColectivas(empleado.organizationId, periodoId),
  ]);

  const art49 = calcularPremioArt49({
    fechaAlta: empleado.fechaAlta,
    sueldoBasico: empleado.sueldoBasico,
    valorAntiguedad: empleado.valorAntiguedad,
    asistencias,
    metasColectivas,
    period: effectivePeriod,
    config,
  });

  const productivityBonus: ProductivityBonus = {
    puntajePremio: art49.porcentajeTotal,
    art49,
    gestionInternaPuntaje: gestionInterna.puntajePremio,
    tareasEvaluablesCompletadas: gestionInterna.tareasEvaluablesCompletadas,
    eficienciaEvaluable: gestionInterna.eficienciaEvaluable,
    tiempoEstimadoEvaluable: gestionInterna.tiempoEstimadoEvaluable,
    tiempoRealEvaluable: gestionInterna.tiempoRealEvaluable,
  };

  return {
    userId: empleado.id,
    nombre: empleado.nombre,
    apellido: empleado.apellido,
    area: empleado.area.nombre,
    kpiCompliance,
    kpiPromedio: Math.round(kpiPromedio * 10) / 10,
    temporalEfficiency,
    scoreGeneral: calculateGeneralScore(kpiPromedio, temporalEfficiency.eficiencia),
    productivityBonus,
  };
}

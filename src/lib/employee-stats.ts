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
import { calcularPremioKpiSimple } from "./premio-templates";
import { getMetasColectivas } from "./metas-colectivas";
import { getArt49Config, getKpiSimpleConfig, getPremioTemplate } from "./system-config";
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
  const [template, config, kpiSimpleConfig, metasColectivas] = await Promise.all([
    getPremioTemplate(empleado.organizationId),
    getArt49Config(empleado.organizationId),
    getKpiSimpleConfig(empleado.organizationId),
    getMetasColectivas(empleado.organizationId, periodoId),
  ]);

  const bonusBase = {
    gestionInternaPuntaje: gestionInterna.puntajePremio,
    tareasEvaluablesCompletadas: gestionInterna.tareasEvaluablesCompletadas,
    eficienciaEvaluable: gestionInterna.eficienciaEvaluable,
    tiempoEstimadoEvaluable: gestionInterna.tiempoEstimadoEvaluable,
    tiempoRealEvaluable: gestionInterna.tiempoRealEvaluable,
  };

  let productivityBonus: ProductivityBonus;

  if (template === "solo_metricas") {
    productivityBonus = {
      puntajePremio: 0,
      premioTemplate: template,
      ...bonusBase,
    };
  } else if (template === "kpi_simple") {
    productivityBonus = {
      puntajePremio: calcularPremioKpiSimple(kpiPromedio, kpiSimpleConfig),
      premioTemplate: template,
      ...bonusBase,
    };
  } else {
    const art49 = calcularPremioArt49({
      fechaAlta: empleado.fechaAlta,
      sueldoBasico: empleado.sueldoBasico,
      valorAntiguedad: empleado.valorAntiguedad,
      asistencias,
      metasColectivas,
      period: effectivePeriod,
      config,
    });

    productivityBonus = {
      puntajePremio: art49.porcentajeTotal,
      art49,
      premioTemplate: template,
      ...bonusBase,
    };
  }

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

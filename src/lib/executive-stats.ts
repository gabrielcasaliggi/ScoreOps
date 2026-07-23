import { prisma } from "./prisma";
import { buildEmployeeProductivity } from "./employee-stats";
import { getSemesterPeriod, periodoToApiPayload } from "./productivity-period";
import { calculateKpiCompliance } from "./productivity";
import { getPremioTemplateMeta } from "./premio-templates";
import { getPremioTemplate } from "./system-config";
import type { Tarea } from "@prisma/client";
import {
  aggregateLatenciesForPeriod,
  type AggregatedLatencies,
} from "./task-latency";

type TareaLite = Pick<
  Tarea,
  "estado" | "fechaLimite" | "completedAt" | "tiempoEstimado" | "tiempoReal" | "prioridad"
>;

export interface TaskPipeline {
  pendientes: number;
  enProceso: number;
  enAprobacion: number;
  completadas: number;
  abiertas: number;
  vencidas: number;
  altaPrioridadAbiertas: number;
}

export interface TaskQualityMetrics {
  puntualidadPct: number;
  completadasConFecha: number;
  completadasATiempo: number;
  eficienciaTemporalPct: number;
  horasEstimadasCompletadas: number;
  horasRealesCompletadas: number;
}

export interface AreaExecutiveRow {
  areaId: string;
  nombre: string;
  empleados: number;
  kpiPromedio: number;
  premioPromedio: number;
  eficienciaPromedio: number;
  tareasAbiertas: number;
  tareasVencidas: number;
  tareasPendientes: number;
  tareasEnProceso: number;
  tareasCompletadas: number;
  puntualidadPct: number;
  altaPrioridadAbiertas: number;
  latencias: AggregatedLatencies;
}

export interface PersonaExecutiveRow {
  userId: string;
  nombre: string;
  apellido: string;
  area: string;
  kpiPromedio: number;
  premio: number;
  eficiencia: number;
  tareasAbiertas: number;
  tareasVencidas: number;
  tareasPendientes: number;
  tareasEnProceso: number;
  tareasCompletadas: number;
  puntualidadPct: number;
  altaPrioridadAbiertas: number;
  alerta: "sobrecarga" | "vencidas" | "kpi_bajo" | null;
  latencias: AggregatedLatencies;
}

export interface ExecutiveReport {
  organizationName: string;
  periodo: ReturnType<typeof periodoToApiPayload>;
  plantillaPremio: ReturnType<typeof getPremioTemplateMeta>;
  salud: { score: number; etiqueta: string };
  resumen: {
    empleadosActivos: number;
    areas: number;
    kpiPromedioOrg: number;
    premioPromedioOrg: number;
    eficienciaPromedioOrg: number;
    tareasAbiertas: number;
    tareasVencidas: number;
    objetivosActivos: number;
    objetivosEnRiesgo: number;
  };
  pipeline: TaskPipeline;
  calidadTareas: TaskQualityMetrics;
  latencias: AggregatedLatencies;
  porArea: AreaExecutiveRow[];
  porPersona: PersonaExecutiveRow[];
  distribucionCarga: {
    promedio: number;
    max: number;
    min: number;
    sobrecargados: {
      userId: string;
      nombre: string;
      apellido: string;
      area: string;
      tareasAbiertas: number;
    }[];
    conCapacidad: {
      userId: string;
      nombre: string;
      apellido: string;
      area: string;
      tareasAbiertas: number;
    }[];
  };
}

function buildPipeline(tareas: TareaLite[], now: Date): TaskPipeline {
  const pendientes = tareas.filter((t) => t.estado === "PENDIENTE").length;
  const enProceso = tareas.filter((t) => t.estado === "EN_PROCESO").length;
  const enAprobacion = tareas.filter((t) => t.estado === "PENDIENTE_APROBACION").length;
  const completadas = tareas.filter((t) => t.estado === "COMPLETADA").length;
  const abiertas = tareas.filter((t) => t.estado !== "COMPLETADA");
  const vencidas = abiertas.filter((t) => t.fechaLimite && t.fechaLimite < now).length;
  const altaPrioridadAbiertas = abiertas.filter((t) => t.prioridad === 1).length;

  return {
    pendientes,
    enProceso,
    enAprobacion,
    completadas,
    abiertas: abiertas.length,
    vencidas,
    altaPrioridadAbiertas,
  };
}

function buildQuality(tareas: TareaLite[]): TaskQualityMetrics {
  const completadas = tareas.filter((t) => t.estado === "COMPLETADA");
  const conFecha = completadas.filter((t) => t.fechaLimite && t.completedAt);
  const aTiempo = conFecha.filter(
    (t) => t.completedAt && t.fechaLimite && t.completedAt <= t.fechaLimite
  );
  const conTiempos = completadas.filter((t) => t.tiempoReal != null && t.tiempoReal > 0);
  const horasEst = conTiempos.reduce((s, t) => s + t.tiempoEstimado, 0);
  const horasReal = conTiempos.reduce((s, t) => s + (t.tiempoReal ?? 0), 0);
  const eficienciaTemporalPct =
    horasReal > 0 ? Math.round((horasEst / horasReal) * 1000) / 10 : 0;

  return {
    puntualidadPct:
      conFecha.length > 0
        ? Math.round((aTiempo.length / conFecha.length) * 1000) / 10
        : 100,
    completadasConFecha: conFecha.length,
    completadasATiempo: aTiempo.length,
    eficienciaTemporalPct,
    horasEstimadasCompletadas: Math.round(horasEst * 10) / 10,
    horasRealesCompletadas: Math.round(horasReal * 10) / 10,
  };
}

function personaAlerta(input: {
  tareasAbiertas: number;
  tareasVencidas: number;
  kpiPromedio: number;
  promedioCarga: number;
}): PersonaExecutiveRow["alerta"] {
  if (input.tareasVencidas > 0) return "vencidas";
  if (input.tareasAbiertas > input.promedioCarga + 2 && input.tareasAbiertas >= 4) {
    return "sobrecarga";
  }
  if (input.kpiPromedio < 70) return "kpi_bajo";
  return null;
}

export async function buildExecutiveReport(organizationId: string): Promise<ExecutiveReport> {
  const now = new Date();
  const soon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const period = getSemesterPeriod();

  const [empleados, areas, templateId, org] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId, role: "EMPLEADO", activo: true },
      include: {
        area: true,
        objetivos: { include: { kpis: true }, where: { fechaFin: { gte: now } } },
        tareas: true,
        asistencias: { where: { periodoId: period.id } },
      },
    }),
    prisma.area.findMany({
      where: { organizationId },
      orderBy: { nombre: "asc" },
    }),
    getPremioTemplate(organizationId),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
  ]);

  const stats = await Promise.all(empleados.map((e) => buildEmployeeProductivity(e, period)));
  const allTareas = empleados.flatMap((e) => e.tareas);

  const kpiPromedioOrg =
    stats.length > 0
      ? Math.round((stats.reduce((s, e) => s + e.kpiPromedio, 0) / stats.length) * 10) / 10
      : 0;

  const premioPromedioOrg =
    stats.length > 0
      ? Math.round(
          (stats.reduce((s, e) => s + e.productivityBonus.puntajePremio, 0) / stats.length) * 10
        ) / 10
      : 0;

  const eficienciaPromedioOrg =
    stats.length > 0
      ? Math.round(
          (stats.reduce((s, e) => s + e.productivityBonus.eficienciaEvaluable, 0) / stats.length) *
            10
        ) / 10
      : 0;

  const pipeline = buildPipeline(allTareas, now);
  const calidadTareas = buildQuality(allTareas);
  const latencias = aggregateLatenciesForPeriod(allTareas, period);

  const objetivosActivos = empleados.flatMap((e) => e.objetivos);
  const objetivosEnRiesgo = objetivosActivos.filter((o) => {
    const kpis = o.kpis.map(calculateKpiCompliance);
    const prom =
      kpis.length > 0 ? kpis.reduce((s, k) => s + k.cumplimiento, 0) / kpis.length : 100;
    return prom < 70 || o.fechaFin <= soon;
  });

  const cargaCounts = empleados.map(
    (e) => e.tareas.filter((t) => t.estado !== "COMPLETADA").length
  );
  const promedioCarga =
    cargaCounts.length > 0
      ? Math.round((cargaCounts.reduce((s, n) => s + n, 0) / cargaCounts.length) * 10) / 10
      : 0;

  const porArea: AreaExecutiveRow[] = areas.map((area) => {
    const areaStats = stats.filter((s) => s.area === area.nombre);
    const areaEmpleados = empleados.filter((e) => e.areaId === area.id);
    const tareas = areaEmpleados.flatMap((e) => e.tareas);
    const pipe = buildPipeline(tareas, now);
    const quality = buildQuality(tareas);

    return {
      areaId: area.id,
      nombre: area.nombre,
      empleados: areaEmpleados.length,
      kpiPromedio:
        areaStats.length > 0
          ? Math.round(
              (areaStats.reduce((s, e) => s + e.kpiPromedio, 0) / areaStats.length) * 10
            ) / 10
          : 0,
      premioPromedio:
        areaStats.length > 0
          ? Math.round(
              (areaStats.reduce((s, e) => s + e.productivityBonus.puntajePremio, 0) /
                areaStats.length) *
                10
            ) / 10
          : 0,
      eficienciaPromedio:
        areaStats.length > 0
          ? Math.round(
              (areaStats.reduce((s, e) => s + e.productivityBonus.eficienciaEvaluable, 0) /
                areaStats.length) *
                10
            ) / 10
          : 0,
      tareasAbiertas: pipe.abiertas,
      tareasVencidas: pipe.vencidas,
      tareasPendientes: pipe.pendientes,
      tareasEnProceso: pipe.enProceso,
      tareasCompletadas: pipe.completadas,
      puntualidadPct: quality.puntualidadPct,
      altaPrioridadAbiertas: pipe.altaPrioridadAbiertas,
      latencias: aggregateLatenciesForPeriod(tareas, period),
    };
  });

  const porPersona: PersonaExecutiveRow[] = stats
    .map((s) => {
      const emp = empleados.find((e) => e.id === s.userId)!;
      const pipe = buildPipeline(emp.tareas, now);
      const quality = buildQuality(emp.tareas);
      return {
        userId: s.userId,
        nombre: s.nombre,
        apellido: s.apellido,
        area: s.area,
        kpiPromedio: Math.round(s.kpiPromedio * 10) / 10,
        premio: s.productivityBonus.puntajePremio,
        eficiencia: Math.round(s.productivityBonus.eficienciaEvaluable * 10) / 10,
        tareasAbiertas: pipe.abiertas,
        tareasVencidas: pipe.vencidas,
        tareasPendientes: pipe.pendientes,
        tareasEnProceso: pipe.enProceso,
        tareasCompletadas: pipe.completadas,
        puntualidadPct: quality.puntualidadPct,
        altaPrioridadAbiertas: pipe.altaPrioridadAbiertas,
        latencias: aggregateLatenciesForPeriod(emp.tareas, period),
        alerta: personaAlerta({
          tareasAbiertas: pipe.abiertas,
          tareasVencidas: pipe.vencidas,
          kpiPromedio: s.kpiPromedio,
          promedioCarga,
        }),
      };
    })
    .sort((a, b) => {
      const score = (p: PersonaExecutiveRow) =>
        p.tareasVencidas * 100 + p.tareasAbiertas * 10 + (100 - p.kpiPromedio);
      return score(b) - score(a);
    });

  const sorted = [...porPersona].sort((a, b) => b.tareasAbiertas - a.tareasAbiertas);
  const maxCarga = sorted[0]?.tareasAbiertas ?? 0;
  const minCarga = sorted[sorted.length - 1]?.tareasAbiertas ?? 0;

  const sobrecargados = sorted.filter(
    (p) => p.tareasAbiertas > promedioCarga + 2 && p.tareasAbiertas >= 4
  );
  const conCapacidad = [...porPersona]
    .filter((p) => p.tareasAbiertas < promedioCarga - 1)
    .sort((a, b) => a.tareasAbiertas - b.tareasAbiertas);

  const saludScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        kpiPromedioOrg * 0.35 +
          Math.max(0, 100 - pipeline.vencidas * 8) * 0.25 +
          Math.max(0, 100 - objetivosEnRiesgo.length * 10) * 0.15 +
          calidadTareas.puntualidadPct * 0.15 +
          (maxCarga - minCarga <= 4 ? 100 : Math.max(0, 100 - (maxCarga - minCarga) * 5)) * 0.1
      )
    )
  );

  const template = getPremioTemplateMeta(templateId);

  return {
    organizationName: org?.name ?? "Organización",
    periodo: periodoToApiPayload(period),
    plantillaPremio: template,
    salud: {
      score: saludScore,
      etiqueta: saludScore >= 80 ? "Saludable" : saludScore >= 60 ? "Atención" : "Crítico",
    },
    resumen: {
      empleadosActivos: empleados.length,
      areas: areas.length,
      kpiPromedioOrg,
      premioPromedioOrg,
      eficienciaPromedioOrg,
      tareasAbiertas: pipeline.abiertas,
      tareasVencidas: pipeline.vencidas,
      objetivosActivos: objetivosActivos.length,
      objetivosEnRiesgo: objetivosEnRiesgo.length,
    },
    pipeline,
    calidadTareas,
    latencias,
    porArea,
    porPersona,
    distribucionCarga: {
      promedio: promedioCarga,
      max: maxCarga,
      min: minCarga,
      sobrecargados: sobrecargados.slice(0, 8).map((p) => ({
        userId: p.userId,
        nombre: p.nombre,
        apellido: p.apellido,
        area: p.area,
        tareasAbiertas: p.tareasAbiertas,
      })),
      conCapacidad: conCapacidad.slice(0, 8).map((p) => ({
        userId: p.userId,
        nombre: p.nombre,
        apellido: p.apellido,
        area: p.area,
        tareasAbiertas: p.tareasAbiertas,
      })),
    },
  };
}

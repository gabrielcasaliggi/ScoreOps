import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { buildEmployeeProductivity } from "@/lib/employee-stats";
import { getSemesterPeriod, periodoToApiPayload } from "@/lib/productivity-period";
import { calculateKpiCompliance } from "@/lib/productivity";
import { getPremioTemplateMeta } from "@/lib/premio-templates";
import { getPremioTemplate as getOrgPremioTemplate } from "@/lib/system-config";

export async function GET() {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const period = getSemesterPeriod();

    const [empleados, areas, templateId] = await Promise.all([
      prisma.user.findMany({
        where: { organizationId: user.organizationId, role: "EMPLEADO", activo: true },
        include: {
          area: true,
          objetivos: { include: { kpis: true }, where: { fechaFin: { gte: now } } },
          tareas: true,
          asistencias: { where: { periodoId: period.id } },
        },
      }),
      prisma.area.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { nombre: "asc" },
      }),
      getOrgPremioTemplate(user.organizationId),
    ]);

    const stats = await Promise.all(empleados.map((e) => buildEmployeeProductivity(e, period)));

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

    const tareasAbiertas = empleados.flatMap((e) =>
      e.tareas.filter((t) => t.estado !== "COMPLETADA")
    );
    const tareasVencidas = tareasAbiertas.filter((t) => t.fechaLimite && t.fechaLimite < now);

    const objetivosActivos = empleados.flatMap((e) => e.objetivos);
    const objetivosEnRiesgo = objetivosActivos.filter((o) => {
      const kpis = o.kpis.map(calculateKpiCompliance);
      const prom =
        kpis.length > 0
          ? kpis.reduce((s, k) => s + k.cumplimiento, 0) / kpis.length
          : 100;
      return prom < 70 || o.fechaFin <= soon;
    });

    const porArea = areas.map((area) => {
      const areaStats = stats.filter((s) => s.area === area.nombre);
      const areaEmpleados = empleados.filter((e) => e.areaId === area.id);
      const abiertas = areaEmpleados.flatMap((e) =>
        e.tareas.filter((t) => t.estado !== "COMPLETADA")
      );
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
        tareasAbiertas: abiertas.length,
        tareasVencidas: abiertas.filter((t) => t.fechaLimite && t.fechaLimite < now).length,
      };
    });

    const cargaPorPersona = stats.map((s) => {
      const emp = empleados.find((e) => e.id === s.userId)!;
      const abiertas = emp.tareas.filter((t) => t.estado !== "COMPLETADA").length;
      return {
        userId: s.userId,
        nombre: s.nombre,
        apellido: s.apellido,
        area: s.area,
        tareasAbiertas: abiertas,
        kpiPromedio: s.kpiPromedio,
      };
    });

    const sorted = [...cargaPorPersona].sort((a, b) => b.tareasAbiertas - a.tareasAbiertas);
    const maxCarga = sorted[0]?.tareasAbiertas ?? 0;
    const minCarga = sorted[sorted.length - 1]?.tareasAbiertas ?? 0;
    const promedioCarga =
      cargaPorPersona.length > 0
        ? Math.round(
            (cargaPorPersona.reduce((s, p) => s + p.tareasAbiertas, 0) / cargaPorPersona.length) *
              10
          ) / 10
        : 0;

    const sobrecargados = sorted.filter(
      (p) => p.tareasAbiertas > promedioCarga + 2 && p.tareasAbiertas >= 4
    );
    const conCapacidad = [...cargaPorPersona]
      .filter((p) => p.tareasAbiertas < promedioCarga - 1)
      .sort((a, b) => a.tareasAbiertas - b.tareasAbiertas);

    const saludScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          kpiPromedioOrg * 0.4 +
            Math.max(0, 100 - tareasVencidas.length * 8) * 0.3 +
            Math.max(0, 100 - objetivosEnRiesgo.length * 10) * 0.2 +
            (maxCarga - minCarga <= 4 ? 100 : Math.max(0, 100 - (maxCarga - minCarga) * 5)) * 0.1
        )
      )
    );

    const template = getPremioTemplateMeta(templateId);

    return apiSuccess({
      periodo: periodoToApiPayload(period),
      plantillaPremio: template,
      salud: {
        score: saludScore,
        etiqueta:
          saludScore >= 80 ? "Saludable" : saludScore >= 60 ? "Atención" : "Crítico",
      },
      resumen: {
        empleadosActivos: empleados.length,
        areas: areas.length,
        kpiPromedioOrg,
        premioPromedioOrg,
        tareasAbiertas: tareasAbiertas.length,
        tareasVencidas: tareasVencidas.length,
        objetivosActivos: objetivosActivos.length,
        objetivosEnRiesgo: objetivosEnRiesgo.length,
      },
      porArea,
      distribucionCarga: {
        promedio: promedioCarga,
        max: maxCarga,
        min: minCarga,
        sobrecargados: sobrecargados.slice(0, 5),
        conCapacidad: conCapacidad.slice(0, 5),
      },
    });
  } catch (err) {
    console.error("[Stats Ejecutivo]", err);
    return apiError("Error al calcular dashboard ejecutivo", 500);
  }
}

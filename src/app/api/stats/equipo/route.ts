import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildEmployeeProductivity } from "@/lib/employee-stats";
import {
  parsePeriodoParam,
  periodoToApiPayload,
  type ProductivityPeriod,
} from "@/lib/productivity-period";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { findAreaInOrg } from "@/lib/tenant";
import { aggregateLatenciesForPeriod } from "@/lib/task-latency";

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const periodoParam = searchParams.get("periodo");
  const areaIdParam = searchParams.get("areaId");

  const period: ProductivityPeriod = parsePeriodoParam(periodoParam);

  try {
    const empleadoWhere: Record<string, unknown> = {
      role: "EMPLEADO",
      activo: true,
      organizationId: user.organizationId,
    };

    if (user.role === "GERENTE") {
      empleadoWhere.areaId = user.areaId;
    } else if (areaIdParam) {
      const area = await findAreaInOrg(user.organizationId, areaIdParam);
      if (!area) return apiError("Área no encontrada en tu empresa", 404);
      empleadoWhere.areaId = area.id;
    }

    const [empleados, areas] = await Promise.all([
      prisma.user.findMany({
        where: empleadoWhere,
        include: {
          area: true,
          objetivos: { include: { kpis: true } },
          tareas: true,
          asistencias: { where: { periodoId: period.id } },
        },
        orderBy: { apellido: "asc" },
      }),
      user.role === "ADMINISTRADOR"
        ? prisma.area.findMany({
            where: { organizationId: user.organizationId },
            orderBy: { nombre: "asc" },
          })
        : Promise.resolve([]),
    ]);

    const stats = await Promise.all(
      empleados.map((e) => buildEmployeeProductivity(e, period))
    );

    const empleadosConLatencias = stats.map((s) => {
      const emp = empleados.find((e) => e.id === s.userId)!;
      return {
        ...s,
        latencias: aggregateLatenciesForPeriod(emp.tareas, period, { detalleLimit: 0 }),
      };
    });

    const latencias = aggregateLatenciesForPeriod(
      empleados.flatMap((e) =>
        e.tareas.map((t) => ({
          ...t,
          userId: e.id,
          user: { nombre: e.nombre, apellido: e.apellido },
        }))
      ),
      period
    );

    const rankingPremio = [...empleadosConLatencias]
      .sort((a, b) => b.productivityBonus.puntajePremio - a.productivityBonus.puntajePremio)
      .map((e, i) => ({ posicion: i + 1, ...e }));

    const resumen = {
      totalEmpleados: empleadosConLatencias.length,
      kpiPromedioEquipo:
        empleadosConLatencias.length > 0
          ? Math.round(
              (empleadosConLatencias.reduce((s, e) => s + e.kpiPromedio, 0) /
                empleadosConLatencias.length) *
                10
            ) / 10
          : 0,
      eficienciaPromedioEquipo:
        empleadosConLatencias.length > 0
          ? Math.round(
              (empleadosConLatencias.reduce(
                (s, e) => s + e.productivityBonus.eficienciaEvaluable,
                0
              ) /
                empleadosConLatencias.length) *
                10
            ) / 10
          : 0,
      tareasCompletadas: empleadosConLatencias.reduce(
        (s, e) => s + e.temporalEfficiency.tareasCompletadas,
        0
      ),
      tareasEvaluablesCompletadas: empleadosConLatencias.reduce(
        (s, e) => s + e.productivityBonus.tareasEvaluablesCompletadas,
        0
      ),
      puntajePremioPromedio:
        empleadosConLatencias.length > 0
          ? Math.round(
              (empleadosConLatencias.reduce(
                (s, e) => s + e.productivityBonus.puntajePremio,
                0
              ) /
                empleadosConLatencias.length) *
                10
            ) / 10
          : 0,
    };

    const porArea = Object.entries(
      empleadosConLatencias.reduce<
        Record<string, { empleados: number; puntaje: number }>
      >((acc, e) => {
        if (!acc[e.area]) acc[e.area] = { empleados: 0, puntaje: 0 };
        acc[e.area].empleados += 1;
        acc[e.area].puntaje += e.productivityBonus.puntajePremio;
        return acc;
      }, {})
    ).map(([area, data]) => ({
      area,
      empleados: data.empleados,
      puntajePromedio: Math.round((data.puntaje / data.empleados) * 10) / 10,
    }));

    return apiSuccess({
      resumen,
      latencias,
      empleados: empleadosConLatencias,
      rankingPremio,
      porArea,
      periodo: periodoToApiPayload(period),
      areas: areas.map((a) => ({ id: a.id, nombre: a.nombre })),
      alcance:
        user.role === "GERENTE"
          ? { tipo: "area" as const, areaNombre: user.areaNombre }
          : { tipo: "global" as const },
      actualizadoEn: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Stats] Error:", err);
    return apiError("Error al calcular estadísticas", 500);
  }
}

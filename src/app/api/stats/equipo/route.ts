import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildEmployeeProductivity } from "@/lib/employee-stats";
import {
  parsePeriodoParam,
  periodoToApiPayload,
  type ProductivityPeriod,
} from "@/lib/productivity-period";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const periodoParam = searchParams.get("periodo");
  const areaIdParam = searchParams.get("areaId");

  const period: ProductivityPeriod = parsePeriodoParam(periodoParam);

  try {
    const empleadoWhere: Record<string, unknown> = { role: "EMPLEADO", activo: true };

    if (user.role === "GERENTE") {
      empleadoWhere.areaId = user.areaId;
    } else if (areaIdParam) {
      empleadoWhere.areaId = areaIdParam;
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
        ? prisma.area.findMany({ orderBy: { nombre: "asc" } })
        : Promise.resolve([]),
    ]);

    const stats = await Promise.all(
      empleados.map((e) => buildEmployeeProductivity(e, period))
    );

    const rankingPremio = [...stats]
      .sort((a, b) => b.productivityBonus.puntajePremio - a.productivityBonus.puntajePremio)
      .map((e, i) => ({ posicion: i + 1, ...e }));

    const resumen = {
      totalEmpleados: stats.length,
      kpiPromedioEquipo:
        stats.length > 0
          ? Math.round(
              (stats.reduce((s, e) => s + e.kpiPromedio, 0) / stats.length) * 10
            ) / 10
          : 0,
      eficienciaPromedioEquipo:
        stats.length > 0
          ? Math.round(
              (stats.reduce((s, e) => s + e.productivityBonus.eficienciaEvaluable, 0) /
                stats.length) *
                10
            ) / 10
          : 0,
      tareasCompletadas: stats.reduce(
        (s, e) => s + e.temporalEfficiency.tareasCompletadas,
        0
      ),
      tareasEvaluablesCompletadas: stats.reduce(
        (s, e) => s + e.productivityBonus.tareasEvaluablesCompletadas,
        0
      ),
      puntajePremioPromedio:
        stats.length > 0
          ? Math.round(
              (stats.reduce((s, e) => s + e.productivityBonus.puntajePremio, 0) /
                stats.length) *
                10
            ) / 10
          : 0,
    };

    const porArea = Object.entries(
      stats.reduce<Record<string, { empleados: number; puntaje: number }>>((acc, e) => {
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
      empleados: stats,
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

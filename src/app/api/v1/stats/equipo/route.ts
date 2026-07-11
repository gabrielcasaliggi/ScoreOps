import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildEmployeeProductivity } from "@/lib/employee-stats";
import {
  parsePeriodoParam,
  periodoToApiPayload,
  type ProductivityPeriod,
} from "@/lib/productivity-period";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiKey } from "@/lib/api-v1-auth";

export async function GET(request: NextRequest) {
  const { error, ctx } = await requireApiKey(request, ["stats:read"]);
  if (error) return error;
  if (!ctx) return apiError("API key inválida", 401);

  const { searchParams } = new URL(request.url);
  const period: ProductivityPeriod = parsePeriodoParam(searchParams.get("periodo"));
  const areaIdParam = searchParams.get("areaId");

  try {
    const empleadoWhere: Record<string, unknown> = {
      role: "EMPLEADO",
      activo: true,
      organizationId: ctx.organizationId,
    };
    if (areaIdParam) empleadoWhere.areaId = areaIdParam;

    const empleados = await prisma.user.findMany({
      where: empleadoWhere,
      include: {
        area: true,
        objetivos: { include: { kpis: true } },
        tareas: true,
        asistencias: { where: { periodoId: period.id } },
      },
      orderBy: { apellido: "asc" },
    });

    const stats = await Promise.all(
      empleados.map((e) => buildEmployeeProductivity(e, period))
    );

    const resumen = {
      totalEmpleados: stats.length,
      kpiPromedioEquipo:
        stats.length > 0
          ? Math.round(
              (stats.reduce((s, e) => s + e.kpiPromedio, 0) / stats.length) * 10
            ) / 10
          : 0,
      puntajePremioPromedio:
        stats.length > 0
          ? Math.round(
              (stats.reduce((s, e) => s + e.productivityBonus.puntajePremio, 0) /
                stats.length) *
                10
            ) / 10
          : 0,
    };

    return apiSuccess({
      version: "v1",
      resumen,
      empleados: stats.map((e) => ({
        userId: e.userId,
        nombre: e.nombre,
        apellido: e.apellido,
        area: e.area,
        kpiPromedio: e.kpiPromedio,
        puntajePremio: e.productivityBonus.puntajePremio,
        eficienciaEvaluable: e.productivityBonus.eficienciaEvaluable,
        premioTemplate: e.productivityBonus.premioTemplate,
      })),
      periodo: periodoToApiPayload(period),
      actualizadoEn: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[API v1 stats/equipo]", err);
    return apiError("Error al calcular estadísticas", 500);
  }
}

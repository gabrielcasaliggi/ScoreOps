import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { buildEmployeeProductivity } from "@/lib/employee-stats";
import { parsePeriodoParam } from "@/lib/productivity-period";
import { persistScoreAudit } from "@/lib/score-audit";

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const period = parsePeriodoParam(searchParams.get("periodo"));

  try {
    const empleados = await prisma.user.findMany({
      where: { role: "EMPLEADO", activo: true },
      include: {
        area: true,
        objetivos: { include: { kpis: true } },
        tareas: true,
        asistencias: { where: { periodoId: period.id } },
      },
    });

    let registrados = 0;

    for (const empleado of empleados) {
      const productivity = await buildEmployeeProductivity(empleado, period);
      await persistScoreAudit({
        userId: empleado.id,
        periodoId: period.id,
        evento: "RECALCULO_MANUAL",
        art49: productivity.productivityBonus.art49,
        gestionInternaPuntaje: productivity.productivityBonus.gestionInternaPuntaje,
        detalle: {
          kpiPromedio: productivity.kpiPromedio,
          eficienciaEvaluable: productivity.productivityBonus.eficienciaEvaluable,
          montoTotal: productivity.productivityBonus.art49.montoTotal,
        },
        realizadoPorId: user.id,
      });
      registrados++;
    }

    return apiSuccess({ registrados, periodoId: period.id });
  } catch (err) {
    console.error("[Auditoría Recalcular]", err);
    return apiError("Error al recalcular puntajes", 500);
  }
}

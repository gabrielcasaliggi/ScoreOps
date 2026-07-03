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
      where: { role: "EMPLEADO", activo: true, organizationId: user.organizationId },
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
      const art49 = productivity.productivityBonus.art49;
      await persistScoreAudit({
        userId: empleado.id,
        periodoId: period.id,
        evento: "RECALCULO_MANUAL",
        art49: art49 ?? {
          elegible: false,
          antiguedadMeses: 0,
          sueldoReferencia: 0,
          tramos: [],
          porcentajeTotal: productivity.productivityBonus.puntajePremio,
          montoTotal: 0,
          impuntualidadesLeves: 0,
          inasistenciasInjustificadas: 0,
          tieneSancion: false,
          bloqueaTramosCondicionales: false,
        },
        gestionInternaPuntaje: productivity.productivityBonus.gestionInternaPuntaje,
        detalle: {
          kpiPromedio: productivity.kpiPromedio,
          eficienciaEvaluable: productivity.productivityBonus.eficienciaEvaluable,
          montoTotal: art49?.montoTotal ?? 0,
          premioTemplate: productivity.productivityBonus.premioTemplate,
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

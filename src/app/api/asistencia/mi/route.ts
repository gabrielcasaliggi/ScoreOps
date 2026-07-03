import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { ASISTENCIA_TIPO_LABELS } from "@/lib/asistencia";
import { parsePeriodoParam, periodoToApiPayload } from "@/lib/productivity-period";
import { buildEmployeeProductivity } from "@/lib/employee-stats";

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const period = parsePeriodoParam(searchParams.get("periodo"));

  const empleado = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      area: true,
      asistencias: { where: { periodoId: period.id }, orderBy: { fecha: "desc" } },
      objetivos: { include: { kpis: true } },
      tareas: true,
    },
  });

  if (!empleado) return apiError("Usuario no encontrado", 404);

  const productivity = await buildEmployeeProductivity(empleado, period);
  const art49 = productivity.productivityBonus.art49;

  const resumen = empleado.asistencias.reduce(
    (acc, r) => {
      acc.total += 1;
      acc.porTipo[r.tipo] = (acc.porTipo[r.tipo] ?? 0) + 1;
      return acc;
    },
    { total: 0, porTipo: {} as Record<string, number> }
  );

  return apiSuccess({
    periodo: periodoToApiPayload(period),
    registros: empleado.asistencias.map((r) => ({
      id: r.id,
      fecha: r.fecha,
      tipo: r.tipo,
      tipoLabel: ASISTENCIA_TIPO_LABELS[r.tipo],
      minutosTarde: r.minutosTarde,
      observacion: r.observacion,
    })),
    resumen,
    impactoPremio: art49
      ? {
          porcentajeTotal: art49.porcentajeTotal,
          inasistenciasInjustificadas: art49.inasistenciasInjustificadas,
          tramosActivos: art49.tramos.filter((t) => t.activo).map((t) => t.id),
        }
      : null,
  });
}

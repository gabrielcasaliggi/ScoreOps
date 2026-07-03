import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildEmployeeProductivity } from "@/lib/employee-stats";
import { calculateKpiCompliance } from "@/lib/productivity";
import { parsePeriodoParam, periodoToApiPayload, getSemesterPeriod } from "@/lib/productivity-period";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

const OBJETIVO_DIAS_ALERTA = 7;

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const period = parsePeriodoParam(searchParams.get("periodo"));
  const incluirComparacion = searchParams.get("compare") === "anterior";

  try {
    const empleado = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        area: true,
        objetivos: { include: { kpis: true, tareas: true } },
        tareas: true,
        asistencias: { where: { periodoId: period.id } },
      },
    });

    if (!empleado) return apiError("Usuario no encontrado", 404);

    const productivity = await buildEmployeeProductivity(empleado, period);

    const tareasPorEstado = {
      pendiente: empleado.tareas.filter((t) => t.estado === "PENDIENTE").length,
      enProceso: empleado.tareas.filter((t) => t.estado === "EN_PROCESO").length,
      completada: empleado.tareas.filter((t) => t.estado === "COMPLETADA").length,
    };

    const objetivosEnPeriodo = empleado.objetivos.filter(
      (o) => o.fechaInicio <= period.fin && o.fechaFin >= period.inicio
    );

    const now = new Date();

    let comparacion = null;
    if (incluirComparacion) {
      const prevPeriod = getSemesterPeriod(-1);
      const prevProductivity = await buildEmployeeProductivity(empleado, prevPeriod);
      comparacion = {
        periodo: periodoToApiPayload(prevPeriod),
        kpiPromedio: prevProductivity.kpiPromedio,
        puntajePremio: prevProductivity.productivityBonus.puntajePremio,
        eficiencia: prevProductivity.temporalEfficiency.eficiencia,
        deltaKpi: Math.round((productivity.kpiPromedio - prevProductivity.kpiPromedio) * 10) / 10,
        deltaPremio:
          Math.round(
            (productivity.productivityBonus.puntajePremio -
              prevProductivity.productivityBonus.puntajePremio) *
              10
          ) / 10,
      };
    }

    const kpiHistorial = await prisma.kpiSnapshot.findMany({
      where: { userId: user.id, organizationId: user.organizationId },
      orderBy: { capturedAt: "desc" },
      take: 30,
    });

    return apiSuccess({
      user: {
        id: empleado.id,
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        area: empleado.area.nombre,
        role: empleado.role,
      },
      ...productivity,
      puntajePremio: productivity.productivityBonus.puntajePremio,
      tareasPorEstado,
      periodo: periodoToApiPayload(period),
      objetivos: objetivosEnPeriodo.map((o) => {
        const kpis = o.kpis.map(calculateKpiCompliance);
        const kpiPromedio =
          kpis.length > 0
            ? Math.round((kpis.reduce((s, k) => s + k.cumplimiento, 0) / kpis.length) * 10) / 10
            : 0;
        const diasRestantes = Math.ceil(
          (o.fechaFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          id: o.id,
          titulo: o.titulo,
          descripcion: o.descripcion,
          fechaInicio: o.fechaInicio,
          fechaFin: o.fechaFin,
          kpisCount: o.kpis.length,
          tareasCount: o.tareas.length,
          kpiPromedio,
          diasRestantes,
          proximoVencer: diasRestantes > 0 && diasRestantes <= OBJETIVO_DIAS_ALERTA,
        };
      }),
      comparacion,
      kpiHistorial,
    });
  } catch (err) {
    console.error("[Stats] Error personal:", err);
    return apiError("Error al calcular estadísticas", 500);
  }
}

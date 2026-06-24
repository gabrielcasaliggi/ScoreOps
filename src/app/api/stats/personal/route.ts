import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildEmployeeProductivity } from "@/lib/employee-stats";
import { calculateKpiCompliance } from "@/lib/productivity";
import { parsePeriodoParam, periodoToApiPayload } from "@/lib/productivity-period";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

const OBJETIVO_DIAS_ALERTA = 7;

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const period = parsePeriodoParam(searchParams.get("periodo"));

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
    });
  } catch (err) {
    console.error("[Stats] Error personal:", err);
    return apiError("Error al calcular estadísticas", 500);
  }
}

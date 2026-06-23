import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildEmployeeProductivity } from "@/lib/employee-stats";
import { parsePeriodoParam, periodoToApiPayload } from "@/lib/productivity-period";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

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
      objetivos: objetivosEnPeriodo.map((o) => ({
        id: o.id,
        titulo: o.titulo,
        fechaInicio: o.fechaInicio,
        fechaFin: o.fechaFin,
        kpisCount: o.kpis.length,
        tareasCount: o.tareas.length,
      })),
    });
  } catch (err) {
    console.error("[Stats] Error personal:", err);
    return apiError("Error al calcular estadísticas", 500);
  }
}

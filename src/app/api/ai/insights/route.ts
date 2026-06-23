import { prisma } from "@/lib/prisma";
import { buildEmployeeProductivity } from "@/lib/employee-stats";
import { calculateKpiCompliance, calculateTemporalEfficiency } from "@/lib/productivity";
import { getSemesterPeriod } from "@/lib/productivity-period";
import { generatePersonalInsights, generateTeamInsights } from "@/lib/ai-insights";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

export async function GET() {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const period = getSemesterPeriod();

  try {
    if (user.role === "ADMINISTRADOR" || user.role === "GERENTE") {
      const empleados = await prisma.user.findMany({
        where: { role: "EMPLEADO" },
        include: {
          area: true,
          objetivos: { include: { kpis: true } },
          tareas: true,
          asistencias: { where: { periodoId: period.id } },
        },
      });

      const stats = await Promise.all(
        empleados.map((e) => buildEmployeeProductivity(e, period))
      );

      const insights = generateTeamInsights(stats);
      return apiSuccess({ insights, scope: "equipo" });
    }

    const empleado = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        objetivos: { include: { kpis: true } },
        tareas: true,
      },
    });

    if (!empleado) return apiError("Usuario no encontrado", 404);

    const allKpis = empleado.objetivos.flatMap((o) => o.kpis);
    const kpiCompliance = allKpis.map(calculateKpiCompliance);
    const kpiPromedio =
      kpiCompliance.length > 0
        ? kpiCompliance.reduce((sum, k) => sum + k.cumplimiento, 0) / kpiCompliance.length
        : 0;
    const temporalEfficiency = calculateTemporalEfficiency(empleado.tareas);

    const tareasPorEstado = {
      pendiente: empleado.tareas.filter((t) => t.estado === "PENDIENTE").length,
      enProceso: empleado.tareas.filter((t) => t.estado === "EN_PROCESO").length,
      completada: empleado.tareas.filter((t) => t.estado === "COMPLETADA").length,
    };

    const insights = generatePersonalInsights({
      kpiPromedio: Math.round(kpiPromedio * 10) / 10,
      temporalEfficiency,
      tareasPorEstado,
      kpiCompliance,
    });

    return apiSuccess({ insights, scope: "personal" });
  } catch (err) {
    console.error("[AI] Error:", err);
    return apiError("Error al generar análisis", 500);
  }
}

import { prisma } from "@/lib/prisma";
import { buildEmployeeProductivity } from "@/lib/employee-stats";
import { calculateKpiCompliance, calculateTemporalEfficiency } from "@/lib/productivity";
import { getSemesterPeriod } from "@/lib/productivity-period";
import { generatePersonalInsights, generateTeamInsights } from "@/lib/ai-insights";
import { generateWeeklySummary } from "@/lib/llm-summary";
import { getTareaLimiteStatus } from "@/lib/task-utils";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

const OBJETIVO_DIAS_ALERTA = 7;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

export async function GET() {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const period = getSemesterPeriod();

  try {
    if (user.role === "ADMINISTRADOR" || user.role === "GERENTE") {
      const empleados = await prisma.user.findMany({
        where: { role: "EMPLEADO", organizationId: user.organizationId },
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

    const now = new Date();
    const weekStart = startOfWeek(now);

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

    const tareasVencidasList = empleado.tareas.filter(
      (t) => getTareaLimiteStatus(t.fechaLimite, t.estado).vencida
    );

    const objetivosProximos = empleado.objetivos
      .map((o) => {
        const diasRestantes = Math.ceil(
          (o.fechaFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return { titulo: o.titulo, diasRestantes };
      })
      .filter((o) => o.diasRestantes > 0 && o.diasRestantes <= OBJETIVO_DIAS_ALERTA);

    const insights = generatePersonalInsights({
      kpiPromedio: Math.round(kpiPromedio * 10) / 10,
      temporalEfficiency,
      tareasPorEstado,
      kpiCompliance,
      tareasVencidas: tareasVencidasList.length,
      tareasVencidasTitulos: tareasVencidasList.map((t) => t.titulo),
      objetivosProximos,
    });

    const tareasCompletadasSemana = empleado.tareas.filter(
      (t) =>
        t.estado === "COMPLETADA" &&
        t.completedAt &&
        t.completedAt >= weekStart
    ).length;

    const resumenSemanal = await generateWeeklySummary({
      nombre: `${empleado.nombre} ${empleado.apellido}`,
      kpiPromedio,
      tareasCompletadasSemana,
      tareasVencidas: tareasVencidasList.length,
      tareasEnProceso: tareasPorEstado.enProceso,
      tareasPendientes: tareasPorEstado.pendiente,
      objetivosProximos: objetivosProximos.map((o) => o.titulo),
      eficiencia: temporalEfficiency.eficiencia,
    });

    return apiSuccess({
      insights,
      scope: "personal",
      resumenSemanal: resumenSemanal.texto,
      resumenOrigen: resumenSemanal.origen,
    });
  } catch (err) {
    console.error("[AI] Error:", err);
    return apiError("Error al generar análisis", 500);
  }
}

import { prisma } from "@/lib/prisma";
import { buildEmployeeProductivity } from "@/lib/employee-stats";
import { buildPremioExplicacion } from "@/lib/premio-explainer";
import { getSemesterPeriod } from "@/lib/productivity-period";
import { getKpiSimpleConfig, getPremioTemplate } from "@/lib/system-config";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { isPremioHabilitado } from "@/lib/tenant";

export async function GET() {
  const { error, user } = await requireAuth(["EMPLEADO", "GERENTE", "ADMINISTRADOR"]);
  if (error || !user) return error;

  if (!(await isPremioHabilitado(user.organizationId))) {
    return apiError("Premio no habilitado en esta organización", 403);
  }

  const period = getSemesterPeriod();

  try {
    const empleado = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        area: true,
        objetivos: { include: { kpis: true } },
        tareas: true,
        asistencias: { where: { periodoId: period.id } },
      },
    });

    if (!empleado) return apiError("Usuario no encontrado", 404);

    const stats = await buildEmployeeProductivity(empleado, period);
    const [template, kpiSimpleConfig] = await Promise.all([
      getPremioTemplate(user.organizationId),
      getKpiSimpleConfig(user.organizationId),
    ]);

    const explicacion = buildPremioExplicacion({
      template,
      puntajePremio: stats.productivityBonus.puntajePremio,
      kpiPromedio: stats.kpiPromedio,
      art49: stats.productivityBonus.art49,
      kpiSimpleConfig,
      periodoLabel: period.label,
    });

    return apiSuccess({ explicacion, periodo: period.label });
  } catch (err) {
    console.error("[AI premio-explicacion]", err);
    return apiError("Error al generar explicación", 500);
  }
}

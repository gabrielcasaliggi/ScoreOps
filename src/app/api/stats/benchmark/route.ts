import { prisma } from "@/lib/prisma";
import { buildEmployeeProductivity } from "@/lib/employee-stats";
import { computeAreaBenchmark, computeBenchmark } from "@/lib/benchmark-stats";
import { getSemesterPeriod, periodoToApiPayload } from "@/lib/productivity-period";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

export async function GET() {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const period = getSemesterPeriod();

  try {
    const orgEmpleados = await prisma.user.findMany({
      where: { role: "EMPLEADO", activo: true, organizationId: user.organizationId },
      include: {
        area: true,
        objetivos: { include: { kpis: true } },
        tareas: true,
        asistencias: { where: { periodoId: period.id } },
      },
    });

    const orgStats = await Promise.all(
      orgEmpleados.map((e) => buildEmployeeProductivity(e, period))
    );

    if (user.role === "ADMINISTRADOR" || user.role === "GERENTE") {
      const { orgPromedios, areas } = computeAreaBenchmark(orgStats);

      if (user.role === "GERENTE") {
        const areasFiltered = user.areaNombre
          ? areas.filter((a) => a.area === user.areaNombre)
          : [];
        const miArea = areasFiltered[0];
        return apiSuccess({
          scope: "area",
          // Gerente: solo promedios de su área (no filtrar org completa)
          orgPromedios: miArea
            ? { kpi: miArea.kpiPromedio, premio: miArea.premioPromedio, eficiencia: miArea.eficienciaPromedio }
            : null,
          areas: areasFiltered,
          periodo: periodoToApiPayload(period),
        });
      }

      return apiSuccess({
        scope: "org",
        orgPromedios,
        areas,
        periodo: periodoToApiPayload(period),
      });
    }

    const empleado = orgEmpleados.find((e) => e.id === user.id);
    if (!empleado) return apiError("Empleado no encontrado", 404);

    const miStats = orgStats.find((s) => s.userId === user.id);
    if (!miStats) return apiError("Sin datos de productividad", 404);

    const areaStats = orgStats.filter((s) => s.area === miStats.area);

    const benchmark = computeBenchmark(
      miStats,
      areaStats,
      orgStats,
      empleado.area.nombre,
      period.label
    );

    return apiSuccess({
      scope: "personal",
      benchmark,
      periodo: periodoToApiPayload(period),
    });
  } catch (err) {
    console.error("[Stats benchmark]", err);
    return apiError("Error al calcular benchmark", 500);
  }
}

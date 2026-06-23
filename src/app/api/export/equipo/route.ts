import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildEmployeeProductivity } from "@/lib/employee-stats";
import { parsePeriodoParam } from "@/lib/productivity-period";
import { buildExcelReport, buildPdfReport } from "@/lib/export";
import { apiError, requireAuth } from "@/lib/api";

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "xlsx";
  const period = parsePeriodoParam(searchParams.get("periodo"));

  try {
    const empleados = await prisma.user.findMany({
      where: {
        role: "EMPLEADO",
        activo: true,
        ...(user.role === "GERENTE" ? { areaId: user.areaId } : {}),
      },
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

    const resumen = {
      totalEmpleados: stats.length,
      kpiPromedioEquipo:
        stats.length > 0
          ? Math.round((stats.reduce((s, e) => s + e.kpiPromedio, 0) / stats.length) * 10) / 10
          : 0,
      eficienciaPromedioEquipo:
        stats.length > 0
          ? Math.round(
              (stats.reduce((s, e) => s + e.productivityBonus.eficienciaEvaluable, 0) /
                stats.length) *
                10
            ) / 10
          : 0,
      tareasCompletadas: stats.reduce(
        (s, e) => s + e.temporalEfficiency.tareasCompletadas,
        0
      ),
      puntajePremioPromedio:
        stats.length > 0
          ? Math.round(
              (stats.reduce((s, e) => s + e.productivityBonus.puntajePremio, 0) / stats.length) *
                10
            ) / 10
          : 0,
    };

    const fecha = new Date().toISOString().split("T")[0];

    if (format === "pdf") {
      const buffer = buildPdfReport(resumen, stats);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="informe-equipo-${fecha}.pdf"`,
        },
      });
    }

    const buffer = buildExcelReport(resumen, stats);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="informe-equipo-${fecha}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("[Export] Error:", err);
    return apiError("Error al generar informe", 500);
  }
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { buildEmployeeProductivity } from "@/lib/employee-stats";
import { getSemesterPeriod } from "@/lib/productivity-period";
import { calculateGeneralScore } from "@/lib/productivity";
import { isPremioHabilitado } from "@/lib/tenant";

const simularSchema = z.object({
  kpiPromedio: z.number().min(0).max(200).optional(),
  eficienciaEvaluable: z.number().min(0).max(200).optional(),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  if (!(await isPremioHabilitado(user.organizationId))) {
    return apiError("Premio no habilitado en esta organización", 403);
  }

  try {
    const body = await request.json();
    const parsed = simularSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const targetUserId =
      parsed.data.userId && user.role !== "EMPLEADO" ? parsed.data.userId : user.id;

    if (user.role === "EMPLEADO" && targetUserId !== user.id) {
      return apiError("Sin permisos", 403);
    }

    const empleado = await prisma.user.findFirst({
      where: { id: targetUserId, organizationId: user.organizationId },
      include: {
        area: true,
        objetivos: { include: { kpis: true } },
        tareas: true,
        asistencias: { where: { periodoId: getSemesterPeriod().id } },
      },
    });

    if (!empleado) return apiError("Empleado no encontrado", 404);

    if (user.role === "GERENTE" && empleado.areaId !== user.areaId) {
      return apiError("Sin permisos para simular fuera de tu área", 403);
    }

    const actual = await buildEmployeeProductivity(empleado, getSemesterPeriod());

    const kpiSim =
      parsed.data.kpiPromedio ?? actual.kpiPromedio;
    const eficienciaSim =
      parsed.data.eficienciaEvaluable ?? actual.productivityBonus.eficienciaEvaluable;

    const puntajeGestionInterna = calculateGeneralScore(kpiSim, eficienciaSim);
    const puntajeActual = actual.productivityBonus.puntajePremio;

    return apiSuccess({
      actual: {
        kpiPromedio: actual.kpiPromedio,
        eficienciaEvaluable: actual.productivityBonus.eficienciaEvaluable,
        puntajePremio: puntajeActual,
      },
      simulado: {
        kpiPromedio: kpiSim,
        eficienciaEvaluable: eficienciaSim,
        puntajeGestionInterna,
      },
      delta: Math.round((puntajeGestionInterna - puntajeActual) * 10) / 10,
      nota: "La simulación ajusta KPI y eficiencia de gestión interna. El premio Art. 49 final incluye tramos legales y metas colectivas.",
    });
  } catch (err) {
    console.error("[Premio Simular]", err);
    return apiError("Error al simular premio", 500);
  }
}

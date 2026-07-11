import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { getResultadosCiclo } from "@/lib/evaluacion360";

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const cicloId = searchParams.get("cicloId");
  if (!cicloId) return apiError("cicloId requerido");

  try {
    const ciclo = await prisma.evaluacion360Ciclo.findFirst({
      where: { id: cicloId, organizationId: user.organizationId },
    });
    if (!ciclo) return apiError("Ciclo no encontrado", 404);

    let resultados = await getResultadosCiclo(cicloId);

    if (user.role === "GERENTE") {
      resultados = resultados.filter((r) => r.area === user.areaNombre);
    }

    return apiSuccess(resultados);
  } catch (err) {
    console.error("[Evaluaciones Resultados]", err);
    return apiError("Error al calcular resultados", 500);
  }
}

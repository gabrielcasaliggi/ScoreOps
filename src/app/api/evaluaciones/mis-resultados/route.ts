import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { getActiveCiclo, getResultadoParaEvaluado } from "@/lib/evaluacion360";

/** Resultado 360 del usuario autenticado (solo hacia sí mismo). */
export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  let cicloId = searchParams.get("cicloId");

  if (!cicloId) {
    const activo = await getActiveCiclo(user.organizationId);
    if (!activo) {
      return apiSuccess({ ciclo: null, resultado: null, cobertura: [] });
    }
    cicloId = activo.id;
  }

  const ciclo = await prisma.evaluacion360Ciclo.findFirst({
    where: { id: cicloId, organizationId: user.organizationId },
  });
  if (!ciclo) return apiError("Ciclo no encontrado", 404);

  const { resultado, cobertura } = await getResultadoParaEvaluado(cicloId, user.id);

  return apiSuccess({ ciclo, resultado, cobertura });
}

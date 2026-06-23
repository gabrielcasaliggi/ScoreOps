import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import {
  DEFAULT_COMPETENCIAS,
  buildAssignmentsForUser,
  getActiveCiclo,
} from "@/lib/evaluacion360";

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  let cicloId = searchParams.get("cicloId");

  if (!cicloId) {
    const activo = await getActiveCiclo();
    if (!activo) return apiSuccess({ pendientes: [], ciclo: null });
    cicloId = activo.id;
  }

  const ciclo = await prisma.evaluacion360Ciclo.findUnique({ where: { id: cicloId } });
  if (!ciclo) return apiError("Ciclo no encontrado", 404);

  const [usuarios, respuestas] = await Promise.all([
    prisma.user.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, apellido: true, role: true, areaId: true, activo: true },
    }),
    prisma.evaluacion360Respuesta.findMany({
      where: { cicloId, evaluadorId: user.id },
      select: { evaluadoId: true, rol: true, competencia: true },
    }),
  ]);

  const evaluador = usuarios.find((u) => u.id === user.id);
  if (!evaluador) return apiSuccess({ pendientes: [], ciclo });

  const empleados = usuarios.filter((u) => u.role === "EMPLEADO" || u.role === "GERENTE");
  const gerentes = usuarios.filter((u) => u.role === "GERENTE" || u.role === "ADMINISTRADOR");
  const assignments = buildAssignmentsForUser(evaluador, empleados, gerentes, cicloId);

  const pendientes = assignments
    .map((a) => {
      const completadas = respuestas.filter(
        (r) => r.evaluadoId === a.evaluadoId && r.rol === a.rol
      ).length;
      return {
        ...a,
        competencias: [...DEFAULT_COMPETENCIAS],
        progreso: completadas,
        total: DEFAULT_COMPETENCIAS.length,
        completa: completadas >= DEFAULT_COMPETENCIAS.length,
      };
    })
    .filter((a) => !a.completa);

  return apiSuccess({ pendientes, ciclo });
}

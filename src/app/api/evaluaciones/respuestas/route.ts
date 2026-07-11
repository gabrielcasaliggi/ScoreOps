import { NextRequest } from "next/server";
import { z } from "zod";
import type { EvaluacionRol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { DEFAULT_COMPETENCIAS, buildAssignmentsForUser } from "@/lib/evaluacion360";

const respuestaSchema = z.object({
  cicloId: z.string().min(1),
  evaluadoId: z.string().min(1),
  rol: z.enum(["AUTOEVALUACION", "GERENTE", "PAR", "SUBORDINADO"]),
  respuestas: z.array(
    z.object({
      competencia: z.string().min(1),
      puntaje: z.number().int().min(1).max(5),
      comentario: z.string().optional(),
    })
  ),
});

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  try {
    const body = await request.json();
    const parsed = respuestaSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const { cicloId, evaluadoId, rol, respuestas } = parsed.data;

    const ciclo = await prisma.evaluacion360Ciclo.findFirst({
      where: { id: cicloId, organizationId: user.organizationId },
    });
    if (!ciclo || !ciclo.activo) {
      return apiError("Ciclo no activo o inexistente", 400);
    }

    const now = new Date();
    if (now < ciclo.fechaInicio || now > ciclo.fechaFin) {
      return apiError("El ciclo no está abierto para respuestas", 400);
    }

    const usuarios = await prisma.user.findMany({
      where: { activo: true, organizationId: user.organizationId },
      select: { id: true, nombre: true, apellido: true, role: true, areaId: true, activo: true },
    });
    const evaluador = usuarios.find((u) => u.id === user.id);
    if (!evaluador) return apiError("Usuario no encontrado", 404);

    const empleados = usuarios.filter((u) => u.role === "EMPLEADO" || u.role === "GERENTE");
    const gerentes = usuarios.filter((u) => u.role === "GERENTE" || u.role === "ADMINISTRADOR");
    const validAssignments = buildAssignmentsForUser(evaluador, empleados, gerentes, cicloId);
    const allowed = validAssignments.some(
      (a) => a.evaluadoId === evaluadoId && a.rol === rol && a.evaluadorId === user.id
    );

    if (!allowed) {
      return apiError("No tenés permiso para evaluar a esta persona con este rol", 403);
    }

    const competenciasValidas = new Set(DEFAULT_COMPETENCIAS as readonly string[]);
    for (const r of respuestas) {
      if (!competenciasValidas.has(r.competencia)) {
        return apiError(`Competencia inválida: ${r.competencia}`);
      }
    }

    await prisma.$transaction(
      respuestas.map((r) =>
        prisma.evaluacion360Respuesta.upsert({
          where: {
            cicloId_evaluadoId_evaluadorId_competencia: {
              cicloId,
              evaluadoId,
              evaluadorId: user.id,
              competencia: r.competencia,
            },
          },
          create: {
            cicloId,
            evaluadoId,
            evaluadorId: user.id,
            rol: rol as EvaluacionRol,
            competencia: r.competencia,
            puntaje: r.puntaje,
            comentario: r.comentario,
          },
          update: {
            puntaje: r.puntaje,
            comentario: r.comentario,
          },
        })
      )
    );

    return apiSuccess({ ok: true, guardadas: respuestas.length });
  } catch (err) {
    console.error("[Evaluaciones Respuestas POST]", err);
    return apiError("Error al guardar evaluación", 500);
  }
}

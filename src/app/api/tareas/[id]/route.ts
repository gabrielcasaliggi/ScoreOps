import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildStatusTransition } from "@/lib/task-timing";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { assertObjetivoOwnership } from "../objetivo-ownership";

const updateTareaSchema = z.object({
  titulo: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  estado: z.enum(["PENDIENTE", "EN_PROCESO", "COMPLETADA"]).optional(),
  tiempoEstimado: z.number().int().positive().optional(),
  tiempoReal: z.number().int().positive().optional(),
  prioridad: z.number().int().min(1).max(3).optional(),
  objetivoId: z.string().nullable().optional(),
  fechaLimite: z.string().datetime().nullable().optional(),
  evaluaProductividad: z.boolean().optional(),
  pesoProductividad: z.number().int().min(1).max(3).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const { id } = await params;

  try {
    const existing = await prisma.tarea.findUnique({ where: { id } });
    if (!existing) return apiError("Tarea no encontrada", 404);
    if (user.role === "EMPLEADO" && existing.userId !== user.id) {
      return apiError("Sin permisos", 403);
    }

    const body = await request.json();
    const parsed = updateTareaSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    if (parsed.data.objetivoId) {
      const ownershipError = await assertObjetivoOwnership(
        parsed.data.objetivoId,
        existing.userId
      );
      if (ownershipError) return ownershipError;
    }

    const data: Record<string, unknown> = { ...parsed.data };

    if (parsed.data.fechaLimite !== undefined) {
      data.fechaLimite = parsed.data.fechaLimite
        ? new Date(parsed.data.fechaLimite)
        : null;
    }

    // Solo gerentes pueden modificar parámetros de evaluación de productividad
    if (user.role === "EMPLEADO") {
      delete data.evaluaProductividad;
      delete data.pesoProductividad;
    }

    // Transición de estado con registro automático de tiempos
    if (parsed.data.estado && parsed.data.estado !== existing.estado) {
      const timingData = buildStatusTransition(
        existing,
        parsed.data.estado,
        user.role !== "EMPLEADO" ? parsed.data.tiempoReal : undefined
      );
      Object.assign(data, timingData);
    }

    const tarea = await prisma.tarea.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, nombre: true, apellido: true } },
        objetivo: { select: { id: true, titulo: true } },
      },
    });

    console.log(
      `[Tareas] Actualizada: ${id} -> ${tarea.estado}` +
        (tarea.tiempoReal ? ` (${tarea.tiempoReal} min)` : "")
    );
    return apiSuccess(tarea);
  } catch (err) {
    console.error("[Tareas] Error al actualizar:", err);
    return apiError("Error al actualizar tarea", 500);
  }
}

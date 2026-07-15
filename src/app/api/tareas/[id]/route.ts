import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildStatusTransition } from "@/lib/task-timing";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { assertObjetivoOwnership } from "../objetivo-ownership";
import { getWorkflowConfig } from "@/lib/workflow-config";
import {
  closePendingTaskCompletionWorkflow,
  createTaskCompletionWorkflow,
} from "@/lib/workflows";
import { findTareaInOrg, findUserInOrg } from "@/lib/tenant";

const updateTareaSchema = z.object({
  titulo: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  estado: z
    .enum(["PENDIENTE", "EN_PROCESO", "PENDIENTE_APROBACION", "COMPLETADA"])
    .optional(),
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
    const existing = await findTareaInOrg(user.organizationId, id);
    if (!existing) return apiError("Tarea no encontrada", 404);
    if (user.role === "EMPLEADO" && existing.userId !== user.id) {
      return apiError("Sin permisos", 403);
    }
    if (user.role === "GERENTE") {
      const owner = await findUserInOrg(user.organizationId, existing.userId);
      if (!owner || owner.areaId !== user.areaId) {
        return apiError("Sin permisos", 403);
      }
    }

    const body = await request.json();
    const parsed = updateTareaSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    if (parsed.data.objetivoId) {
      const ownershipError = await assertObjetivoOwnership(
        parsed.data.objetivoId,
        existing.userId,
        user.organizationId
      );
      if (ownershipError) return ownershipError;
    }

    const data: Record<string, unknown> = { ...parsed.data };

    if (parsed.data.fechaLimite !== undefined) {
      data.fechaLimite = parsed.data.fechaLimite
        ? new Date(parsed.data.fechaLimite)
        : null;
    }

    if (user.role === "EMPLEADO") {
      delete data.evaluaProductividad;
      delete data.pesoProductividad;
    }

    let workflowCreated = false;

    if (parsed.data.estado && parsed.data.estado !== existing.estado) {
      let targetEstado = parsed.data.estado;

      if (user.role === "EMPLEADO" && parsed.data.estado === "COMPLETADA") {
        const config = await getWorkflowConfig(user.organizationId);
        if (config.tareaRequiereAprobacion) {
          targetEstado = "PENDIENTE_APROBACION";
        }
      }

      const timingData = buildStatusTransition(
        existing,
        targetEstado,
        user.role !== "EMPLEADO" ? parsed.data.tiempoReal : undefined
      );
      Object.assign(data, timingData);

      if (
        targetEstado === "PENDIENTE_APROBACION" &&
        existing.estado === "EN_PROCESO"
      ) {
        await createTaskCompletionWorkflow({
          organizationId: user.organizationId,
          tareaId: existing.id,
          solicitanteId: user.id,
          areaId: user.areaId,
          tituloTarea: existing.titulo,
        });
        workflowCreated = true;
      }

      // Gerente/admin: alinear solicitud si mueve la tarjeta desde "Por aprobar"
      if (
        user.role !== "EMPLEADO" &&
        existing.estado === "PENDIENTE_APROBACION"
      ) {
        if (targetEstado === "COMPLETADA") {
          await closePendingTaskCompletionWorkflow({
            tareaId: existing.id,
            organizationId: user.organizationId,
            resolutorId: user.id,
            resolutorRole: user.role,
            resolutorAreaId: user.areaId,
            accion: "aprobar",
            comentario: "Aprobado desde el tablero de tareas",
          });
        } else if (targetEstado === "EN_PROCESO" || targetEstado === "PENDIENTE") {
          await closePendingTaskCompletionWorkflow({
            tareaId: existing.id,
            organizationId: user.organizationId,
            resolutorId: user.id,
            resolutorRole: user.role,
            resolutorAreaId: user.areaId,
            accion: "rechazar",
            comentario: "Devuelto desde el tablero de tareas",
          });
        }
      }
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

    return apiSuccess({
      ...tarea,
      ...(workflowCreated
        ? { workflowPendiente: true, message: "Tarea enviada a aprobación del gerente." }
        : {}),
    });
  } catch (err) {
    console.error("[Tareas] Error al actualizar:", err);
    return apiError("Error al actualizar tarea", 500);
  }
}

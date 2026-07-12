import type { Role, WorkflowStatus, WorkflowType } from "@prisma/client";
import { prisma } from "./prisma";
import { buildStatusTransition } from "./task-timing";
import { captureKpiSnapshot } from "./kpi-snapshots";
import { getSemesterPeriod } from "./productivity-period";

export async function notifyWorkflowPending(input: {
  userIds: string[];
  titulo: string;
  mensaje: string;
  workflowId: string;
  actionUrl?: string;
}) {
  const actionUrl = input.actionUrl ?? "/dashboard/aprobaciones";
  await prisma.notification.createMany({
    data: input.userIds.map((userId) => ({
      userId,
      tipo: "WORKFLOW_PENDIENTE" as const,
      titulo: input.titulo,
      mensaje: input.mensaje,
      metadata: { workflowId: input.workflowId, actionUrl },
    })),
  });
}

export async function notifyWorkflowResolved(input: {
  userId: string;
  titulo: string;
  mensaje: string;
  workflowId: string;
  aprobada: boolean;
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      tipo: "SISTEMA",
      titulo: input.titulo,
      mensaje: input.mensaje,
      metadata: {
        workflowId: input.workflowId,
        actionUrl: input.aprobada ? "/dashboard" : "/dashboard/tareas",
      },
    },
  });
}

export async function getManagerIdsForEmployee(
  organizationId: string,
  areaId: string
): Promise<string[]> {
  const managers = await prisma.user.findMany({
    where: {
      organizationId,
      activo: true,
      OR: [{ role: "ADMINISTRADOR" }, { role: "GERENTE", areaId }],
    },
    select: { id: true },
  });
  return managers.map((m) => m.id);
}

export async function createTaskCompletionWorkflow(input: {
  organizationId: string;
  tareaId: string;
  solicitanteId: string;
  areaId: string;
  tituloTarea: string;
  comentario?: string;
}) {
  const existing = await prisma.workflowRequest.findFirst({
    where: {
      tareaId: input.tareaId,
      tipo: "TAREA_COMPLETADA",
      estado: "PENDIENTE",
    },
  });
  if (existing) return existing;

  const workflow = await prisma.workflowRequest.create({
    data: {
      organizationId: input.organizationId,
      tipo: "TAREA_COMPLETADA",
      solicitanteId: input.solicitanteId,
      tareaId: input.tareaId,
      comentarioSolicitud: input.comentario,
    },
  });

  const managerIds = await getManagerIdsForEmployee(input.organizationId, input.areaId);
  await notifyWorkflowPending({
    userIds: managerIds,
    titulo: "Tarea pendiente de aprobación",
    mensaje: `"${input.tituloTarea}" fue marcada como completada y espera tu revisión.`,
    workflowId: workflow.id,
  });

  return workflow;
}

export async function createKpiAdjustmentWorkflow(input: {
  organizationId: string;
  kpiId: string;
  solicitanteId: string;
  areaId: string;
  kpiNombre: string;
  valorAnterior: number;
  valorPropuesto: number;
  comentario?: string;
}) {
  const existing = await prisma.workflowRequest.findFirst({
    where: {
      kpiId: input.kpiId,
      tipo: "KPI_AJUSTE",
      estado: "PENDIENTE",
    },
  });
  if (existing) {
    return prisma.workflowRequest.update({
      where: { id: existing.id },
      data: {
        valorAnterior: input.valorAnterior,
        valorPropuesto: input.valorPropuesto,
        comentarioSolicitud: input.comentario,
      },
    });
  }

  const workflow = await prisma.workflowRequest.create({
    data: {
      organizationId: input.organizationId,
      tipo: "KPI_AJUSTE",
      solicitanteId: input.solicitanteId,
      kpiId: input.kpiId,
      valorAnterior: input.valorAnterior,
      valorPropuesto: input.valorPropuesto,
      comentarioSolicitud: input.comentario,
    },
  });

  const managerIds = await getManagerIdsForEmployee(input.organizationId, input.areaId);
  await notifyWorkflowPending({
    userIds: managerIds,
    titulo: "Ajuste de KPI solicitado",
    mensaje: `"${input.kpiNombre}": ${input.valorAnterior} → ${input.valorPropuesto}.`,
    workflowId: workflow.id,
  });

  return workflow;
}

export function canResolveWorkflow(
  role: Role,
  userAreaId: string | null,
  solicitanteAreaId: string
): boolean {
  if (role === "ADMINISTRADOR") return true;
  if (role === "GERENTE" && userAreaId === solicitanteAreaId) return true;
  return false;
}

export async function resolveWorkflow(input: {
  workflowId: string;
  resolutorId: string;
  resolutorRole: Role;
  resolutorAreaId: string | null;
  organizationId: string;
  accion: "aprobar" | "rechazar";
  comentario?: string;
}) {
  const workflow = await prisma.workflowRequest.findFirst({
    where: { id: input.workflowId, organizationId: input.organizationId },
    include: {
      solicitante: { select: { id: true, areaId: true, nombre: true, apellido: true } },
      tarea: true,
      kpi: { include: { objetivo: { include: { user: true } } } },
    },
  });

  if (!workflow) return { error: "Solicitud no encontrada" as const, workflow: null };
  if (workflow.estado !== "PENDIENTE") {
    return { error: "La solicitud ya fue resuelta" as const, workflow: null };
  }

  if (
    !canResolveWorkflow(
      input.resolutorRole,
      input.resolutorAreaId,
      workflow.solicitante.areaId
    )
  ) {
    return { error: "Sin permisos para resolver esta solicitud" as const, workflow: null };
  }

  const nuevoEstado: WorkflowStatus =
    input.accion === "aprobar" ? "APROBADA" : "RECHAZADA";

  if (input.accion === "aprobar") {
    if (workflow.tipo === "TAREA_COMPLETADA" && workflow.tarea) {
      const timing = buildStatusTransition(workflow.tarea, "COMPLETADA");
      await prisma.tarea.update({
        where: { id: workflow.tarea.id },
        data: timing,
      });
    }

    if (workflow.tipo === "KPI_AJUSTE" && workflow.kpi && workflow.valorPropuesto != null) {
      await prisma.kPI.update({
        where: { id: workflow.kpi.id },
        data: { valorActual: workflow.valorPropuesto },
      });
      const period = getSemesterPeriod();
      await captureKpiSnapshot(
        workflow.kpi.id,
        input.organizationId,
        workflow.kpi.objetivo.userId,
        period.id
      );
    }
  } else if (workflow.tipo === "TAREA_COMPLETADA" && workflow.tarea) {
    await prisma.tarea.update({
      where: { id: workflow.tarea.id },
      data: { estado: "EN_PROCESO", completedAt: null, tiempoReal: null },
    });
  }

  const updated = await prisma.workflowRequest.update({
    where: { id: workflow.id },
    data: {
      estado: nuevoEstado,
      resolutorId: input.resolutorId,
      comentarioResolucion: input.comentario,
      resolvedAt: new Date(),
    },
    include: {
      solicitante: { select: { id: true, nombre: true, apellido: true } },
      tarea: { select: { id: true, titulo: true } },
      kpi: { select: { id: true, nombre: true } },
    },
  });

  const aprobada = input.accion === "aprobar";
  const tipoLabel =
    workflow.tipo === "TAREA_COMPLETADA" ? "completar tarea" : "ajuste de KPI";

  await notifyWorkflowResolved({
    userId: workflow.solicitanteId,
    titulo: aprobada ? "Solicitud aprobada" : "Solicitud rechazada",
    mensaje: aprobada
      ? `Tu solicitud de ${tipoLabel} fue aprobada.`
      : `Tu solicitud de ${tipoLabel} fue rechazada${input.comentario ? `: ${input.comentario}` : "."}`,
    workflowId: workflow.id,
    aprobada,
  });

  return { error: null, workflow: updated };
}

export async function cancelWorkflow(
  workflowId: string,
  solicitanteId: string,
  organizationId: string
) {
  const workflow = await prisma.workflowRequest.findFirst({
    where: { id: workflowId, organizationId, solicitanteId, estado: "PENDIENTE" },
    include: { tarea: true },
  });

  if (!workflow) return null;

  if (workflow.tipo === "TAREA_COMPLETADA" && workflow.tarea) {
    await prisma.tarea.update({
      where: { id: workflow.tarea.id },
      data: { estado: "EN_PROCESO" },
    });
  }

  return prisma.workflowRequest.update({
    where: { id: workflowId },
    data: { estado: "CANCELADA", resolvedAt: new Date() },
  });
}

/**
 * Cierra un WorkflowRequest de tarea pendiente cuando el gerente/admin
 * ya cambió el estado de la tarea (p. ej. drag en kanban).
 * No vuelve a tocar la tarea: solo alinea la solicitud y notifica.
 */
export async function closePendingTaskCompletionWorkflow(input: {
  tareaId: string;
  organizationId: string;
  resolutorId: string;
  resolutorRole: Role;
  resolutorAreaId: string | null;
  accion: "aprobar" | "rechazar";
  comentario?: string;
}): Promise<{ closed: boolean; error?: string }> {
  const workflow = await prisma.workflowRequest.findFirst({
    where: {
      tareaId: input.tareaId,
      organizationId: input.organizationId,
      tipo: "TAREA_COMPLETADA",
      estado: "PENDIENTE",
    },
    include: {
      solicitante: { select: { id: true, areaId: true } },
    },
  });

  if (!workflow) return { closed: false };

  if (
    !canResolveWorkflow(
      input.resolutorRole,
      input.resolutorAreaId,
      workflow.solicitante.areaId
    )
  ) {
    return { closed: false, error: "Sin permisos para resolver esta solicitud" };
  }

  const nuevoEstado: WorkflowStatus =
    input.accion === "aprobar" ? "APROBADA" : "RECHAZADA";

  await prisma.workflowRequest.update({
    where: { id: workflow.id },
    data: {
      estado: nuevoEstado,
      resolutorId: input.resolutorId,
      comentarioResolucion: input.comentario,
      resolvedAt: new Date(),
    },
  });

  const aprobada = input.accion === "aprobar";
  await notifyWorkflowResolved({
    userId: workflow.solicitanteId,
    titulo: aprobada ? "Solicitud aprobada" : "Solicitud rechazada",
    mensaje: aprobada
      ? "Tu solicitud de completar tarea fue aprobada."
      : `Tu solicitud de completar tarea fue rechazada${
          input.comentario ? `: ${input.comentario}` : "."
        }`,
    workflowId: workflow.id,
    aprobada,
  });

  return { closed: true };
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import {
  cancelWorkflow,
  createKpiAdjustmentWorkflow,
} from "@/lib/workflows";
import { getWorkflowConfig } from "@/lib/workflow-config";

const createSchema = z.object({
  tipo: z.enum(["KPI_AJUSTE"]),
  kpiId: z.string().min(1),
  valorPropuesto: z.number().min(0),
  comentario: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado") ?? "PENDIENTE";

  const where: Record<string, unknown> = {
    organizationId: user.organizationId,
    estado: estado === "todas" ? undefined : estado,
  };

  if (user.role === "EMPLEADO") {
    where.solicitanteId = user.id;
  } else if (user.role === "GERENTE") {
    where.solicitante = { areaId: user.areaId };
  }

  const workflows = await prisma.workflowRequest.findMany({
    where,
    include: {
      solicitante: { select: { id: true, nombre: true, apellido: true } },
      resolutor: { select: { id: true, nombre: true, apellido: true } },
      tarea: { select: { id: true, titulo: true } },
      kpi: { select: { id: true, nombre: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const pendientes =
    user.role !== "EMPLEADO"
      ? await prisma.workflowRequest.count({
          where: {
            organizationId: user.organizationId,
            estado: "PENDIENTE",
            ...(user.role === "GERENTE"
              ? { solicitante: { areaId: user.areaId } }
              : {}),
          },
        })
      : workflows.filter((w) => w.estado === "PENDIENTE").length;

  return apiSuccess({ workflows, pendientes });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth(["EMPLEADO"]);
  if (error || !user) return error;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Payload inválido");
    }

    const config = await getWorkflowConfig(user.organizationId);
    if (!config.kpiAjusteRequiereAprobacion) {
      return apiError("Los ajustes de KPI no requieren solicitud en esta organización");
    }

    const kpi = await prisma.kPI.findFirst({
      where: {
        id: parsed.data.kpiId,
        objetivo: { userId: user.id, user: { organizationId: user.organizationId } },
      },
      include: { objetivo: { include: { user: true } } },
    });

    if (!kpi) return apiError("KPI no encontrado", 404);

    const workflow = await createKpiAdjustmentWorkflow({
      organizationId: user.organizationId,
      kpiId: kpi.id,
      solicitanteId: user.id,
      areaId: user.areaId,
      kpiNombre: kpi.nombre,
      valorAnterior: kpi.valorActual,
      valorPropuesto: parsed.data.valorPropuesto,
      comentario: parsed.data.comentario,
    });

    return apiSuccess(
      {
        workflow,
        message: "Solicitud enviada. Tu gerente la revisará pronto.",
      },
      201
    );
  } catch (err) {
    console.error("[Workflows POST]", err);
    return apiError("Error al crear solicitud", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return apiError("id requerido");

  const cancelled = await cancelWorkflow(id, user.id, user.organizationId);
  if (!cancelled) return apiError("Solicitud no encontrada o no cancelable", 404);

  return apiSuccess({ ok: true, id });
}

// Export createTaskCompletionWorkflow for use in tareas route - it's in lib/workflows

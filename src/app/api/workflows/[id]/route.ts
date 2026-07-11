import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { resolveWorkflow } from "@/lib/workflows";

const resolveSchema = z.object({
  accion: z.enum(["aprobar", "rechazar"]),
  comentario: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = resolveSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Payload inválido");
    }

    const result = await resolveWorkflow({
      workflowId: id,
      resolutorId: user.id,
      resolutorRole: user.role,
      resolutorAreaId: user.areaId,
      organizationId: user.organizationId,
      accion: parsed.data.accion,
      comentario: parsed.data.comentario,
    });

    if (result.error) {
      const status = result.error.includes("permisos") ? 403 : 404;
      return apiError(result.error, status);
    }

    return apiSuccess({ workflow: result.workflow });
  } catch (err) {
    console.error("[Workflows PATCH]", err);
    return apiError("Error al resolver solicitud", 500);
  }
}

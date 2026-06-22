import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  valorMeta: z.number().positive().optional(),
  valorActual: z.number().min(0).optional(),
  unidad: z.string().min(1).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const { id } = await params;

  try {
    const existing = await prisma.kPI.findUnique({
      where: { id },
      include: { objetivo: true },
    });
    if (!existing) return apiError("KPI no encontrado", 404);

    if (user.role === "EMPLEADO" && existing.objetivo.userId !== user.id) {
      return apiError("Sin permisos", 403);
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    if (user.role === "EMPLEADO") {
      if (Object.keys(parsed.data).some((k) => k !== "valorActual")) {
        return apiError("Solo puede actualizar el valor actual", 403);
      }
      if (parsed.data.valorActual === undefined) {
        return apiError("valorActual requerido");
      }
      const kpi = await prisma.kPI.update({
        where: { id },
        data: { valorActual: parsed.data.valorActual },
      });
      return apiSuccess(kpi);
    }

    const kpi = await prisma.kPI.update({
      where: { id },
      data: parsed.data,
    });
    return apiSuccess(kpi);
  } catch (err) {
    console.error("[KPIs] Error al actualizar:", err);
    return apiError("Error al actualizar KPI", 500);
  }
}

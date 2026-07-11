import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  const { id } = await params;

  try {
    const existing = await prisma.evaluacion360Ciclo.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return apiError("Ciclo no encontrado", 404);

    const body = await request.json();
    const activo = body.activo as boolean | undefined;

    const ciclo = await prisma.evaluacion360Ciclo.update({
      where: { id },
      data: activo !== undefined ? { activo } : {},
    });

    return apiSuccess(ciclo);
  } catch {
    return apiError("Ciclo no encontrado", 404);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  const { id } = await params;

  try {
    const existing = await prisma.evaluacion360Ciclo.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return apiError("Ciclo no encontrado", 404);

    await prisma.evaluacion360Ciclo.delete({ where: { id } });
    return apiSuccess({ ok: true });
  } catch {
    return apiError("Ciclo no encontrado", 404);
  }
}

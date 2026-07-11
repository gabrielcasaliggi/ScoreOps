import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  const { id } = await params;

  const key = await prisma.organizationApiKey.findFirst({
    where: { id, organizationId: user.organizationId },
  });

  if (!key) return apiError("API key no encontrada", 404);

  await prisma.organizationApiKey.update({
    where: { id },
    data: { activo: false },
  });

  return apiSuccess({ ok: true, id });
}

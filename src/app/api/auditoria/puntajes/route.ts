import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { findUserInOrg } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const periodoId = searchParams.get("periodoId");

  if (userId) {
    const target = await findUserInOrg(user.organizationId, userId);
    if (!target) return apiError("Usuario no encontrado", 404);
    if (user.role === "GERENTE" && target.areaId !== user.areaId) {
      return apiError("Sin permisos", 403);
    }
  }

  const userFilter: Record<string, unknown> = {
    organizationId: user.organizationId,
  };
  if (user.role === "GERENTE") {
    userFilter.areaId = user.areaId;
  }

  const where: Record<string, unknown> = {
    user: userFilter,
  };
  if (userId) where.userId = userId;
  if (periodoId) where.periodoId = periodoId;

  const logs = await prisma.scoreAuditLog.findMany({
    where,
    include: {
      user: {
        select: {
          nombre: true,
          apellido: true,
          legajo: true,
          area: { select: { nombre: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return apiSuccess(logs);
}

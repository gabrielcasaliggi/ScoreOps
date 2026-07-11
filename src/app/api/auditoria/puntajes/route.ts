import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const periodoId = searchParams.get("periodoId");

  const where: Record<string, unknown> = {
    user: { organizationId: user.organizationId },
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

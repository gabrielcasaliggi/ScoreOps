import { prisma } from "@/lib/prisma";
import { apiSuccess, requireAuth } from "@/lib/api";

export async function GET() {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  const areas = await prisma.area.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  return apiSuccess(areas);
}

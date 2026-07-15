import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/** Verifica que el objetivo pertenezca al usuario y a la misma organización. */
export async function assertObjetivoOwnership(
  objetivoId: string,
  userId: string,
  organizationId: string
): Promise<NextResponse | null> {
  const objetivo = await prisma.objetivo.findFirst({
    where: {
      id: objetivoId,
      userId,
      user: { organizationId },
    },
    select: { id: true },
  });

  if (!objetivo) {
    return apiError("Objetivo no encontrado", 404);
  }

  return null;
}

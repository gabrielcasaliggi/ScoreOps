import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/** Verifica que el objetivo pertenezca al usuario autenticado. */
export async function assertObjetivoOwnership(
  objetivoId: string,
  userId: string
): Promise<NextResponse | null> {
  const objetivo = await prisma.objetivo.findUnique({
    where: { id: objetivoId },
    select: { userId: true },
  });

  if (!objetivo || objetivo.userId !== userId) {
    return apiError("Sin permisos", 403);
  }

  return null;
}

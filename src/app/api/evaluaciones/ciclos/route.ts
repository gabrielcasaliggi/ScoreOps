import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { getSemesterPeriod } from "@/lib/productivity-period";

const createCicloSchema = z.object({
  titulo: z.string().min(1),
  periodoId: z.string().optional(),
  fechaInicio: z.string().min(1),
  fechaFin: z.string().min(1),
});

export async function GET() {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const ciclos = await prisma.evaluacion360Ciclo.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { fechaInicio: "desc" },
    include: { _count: { select: { respuestas: true } } },
  });

  return apiSuccess(ciclos);
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  try {
    const body = await request.json();
    const parsed = createCicloSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const periodoId = parsed.data.periodoId ?? getSemesterPeriod(0).id;
    const fechaInicio = new Date(parsed.data.fechaInicio);
    const fechaFin = new Date(parsed.data.fechaFin);

    if (fechaFin <= fechaInicio) {
      return apiError("La fecha de fin debe ser posterior al inicio");
    }

    await prisma.evaluacion360Ciclo.updateMany({
      where: { organizationId: user.organizationId, activo: true },
      data: { activo: false },
    });

    const ciclo = await prisma.evaluacion360Ciclo.create({
      data: {
        organizationId: user.organizationId,
        titulo: parsed.data.titulo,
        periodoId,
        fechaInicio,
        fechaFin,
        activo: true,
      },
    });

    return apiSuccess(ciclo, 201);
  } catch (err) {
    console.error("[Evaluaciones Ciclos POST]", err);
    return apiError("Error al crear ciclo", 500);
  }
}

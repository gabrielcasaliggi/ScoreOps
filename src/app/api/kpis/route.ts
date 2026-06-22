import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

const createKpiSchema = z.object({
  nombre: z.string().min(1),
  valorMeta: z.number().positive(),
  valorActual: z.number().min(0).optional(),
  unidad: z.string().min(1),
  objetivoId: z.string(),
});

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const objetivoId = searchParams.get("objetivoId");

  const where: Record<string, unknown> = {};
  if (objetivoId) where.objetivoId = objetivoId;
  if (user.role === "EMPLEADO") {
    where.objetivo = { userId: user.id };
  }

  const kpis = await prisma.kPI.findMany({
    where,
    include: {
      objetivo: {
        select: {
          id: true,
          titulo: true,
          userId: true,
          user: { select: { nombre: true, apellido: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return apiSuccess(kpis);
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  try {
    const body = await request.json();
    const parsed = createKpiSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const kpi = await prisma.kPI.create({
      data: {
        nombre: parsed.data.nombre,
        valorMeta: parsed.data.valorMeta,
        valorActual: parsed.data.valorActual ?? 0,
        unidad: parsed.data.unidad,
        objetivoId: parsed.data.objetivoId,
      },
      include: { objetivo: { select: { id: true, titulo: true } } },
    });

    return apiSuccess(kpi, 201);
  } catch (err) {
    console.error("[KPIs] Error al crear:", err);
    return apiError("Error al crear KPI", 500);
  }
}

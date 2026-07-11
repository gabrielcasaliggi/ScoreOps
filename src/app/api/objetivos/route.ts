import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";

const createObjetivoSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  fechaInicio: z.string().datetime(),
  fechaFin: z.string().datetime(),
  userId: z.string(),
});

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  const where: Record<string, unknown> = {};
  if (user.role === "EMPLEADO") {
    where.userId = user.id;
  } else if (user.role === "GERENTE") {
    where.user = { areaId: user.areaId, organizationId: user.organizationId };
    if (userId) where.userId = userId;
  } else {
    where.user = { organizationId: user.organizationId };
    if (userId) where.userId = userId;
  }

  const objetivos = await prisma.objetivo.findMany({
    where,
    include: {
      user: { select: { id: true, nombre: true, apellido: true } },
      kpis: true,
      _count: { select: { tareas: true } },
    },
    orderBy: { fechaFin: "asc" },
  });

  return apiSuccess(objetivos);
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  try {
    const body = await request.json();
    const parsed = createObjetivoSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const target = await prisma.user.findFirst({
      where: {
        id: parsed.data.userId,
        organizationId: user.organizationId,
        activo: true,
      },
      select: { id: true, areaId: true },
    });
    if (!target) return apiError("Empleado no encontrado", 404);
    if (user.role === "GERENTE" && target.areaId !== user.areaId) {
      return apiError("Sin permisos para asignar fuera de tu área", 403);
    }

    const objetivo = await prisma.objetivo.create({
      data: {
        titulo: parsed.data.titulo,
        descripcion: parsed.data.descripcion,
        fechaInicio: new Date(parsed.data.fechaInicio),
        fechaFin: new Date(parsed.data.fechaFin),
        userId: target.id,
      },
      include: {
        user: { select: { id: true, nombre: true, apellido: true } },
        kpis: true,
      },
    });

    console.log(`[Objetivos] Creado: ${objetivo.id}`);
    return apiSuccess(objetivo, 201);
  } catch (err) {
    console.error("[Objetivos] Error al crear:", err);
    return apiError("Error al crear objetivo", 500);
  }
}

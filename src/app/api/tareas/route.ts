import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { assertObjetivoOwnership } from "./objetivo-ownership";

const createTareaSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  tiempoEstimado: z.number().int().positive(),
  prioridad: z.number().int().min(1).max(3).optional(),
  objetivoId: z.string().optional(),
  userId: z.string().optional(),
  fechaLimite: z.string().datetime().optional(),
  evaluaProductividad: z.boolean().optional(),
  pesoProductividad: z.number().int().min(1).max(3).optional(),
});

const estadoFilterSchema = z.enum(["PENDIENTE", "EN_PROCESO", "COMPLETADA"]);

export async function GET(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const estado = searchParams.get("estado");

  const where: Record<string, unknown> = {};

  if (user.role === "EMPLEADO") {
    where.userId = user.id;
  } else if (userId) {
    where.userId = userId;
  }

  if (estado) {
    const parsedEstado = estadoFilterSchema.safeParse(estado);
    if (!parsedEstado.success) {
      return apiError("Estado inválido");
    }
    where.estado = parsedEstado.data;
  }

  const tareas = await prisma.tarea.findMany({
    where,
    include: {
      user: { select: { id: true, nombre: true, apellido: true } },
      objetivo: { select: { id: true, titulo: true } },
    },
    orderBy: [{ prioridad: "asc" }, { createdAt: "desc" }],
  });

  return apiSuccess(tareas);
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  try {
    const body = await request.json();
    const parsed = createTareaSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const targetUserId =
      user.role === "EMPLEADO" ? user.id : parsed.data.userId ?? user.id;

    if (user.role === "EMPLEADO" && targetUserId !== user.id) {
      return apiError("Sin permisos", 403);
    }

    if (parsed.data.objetivoId) {
      const ownershipError = await assertObjetivoOwnership(
        parsed.data.objetivoId,
        targetUserId
      );
      if (ownershipError) return ownershipError;
    }

    const tarea = await prisma.tarea.create({
      data: {
        titulo: parsed.data.titulo,
        descripcion: parsed.data.descripcion,
        tiempoEstimado: parsed.data.tiempoEstimado,
        prioridad: parsed.data.prioridad ?? 2,
        objetivoId: parsed.data.objetivoId,
        userId: targetUserId,
        fechaLimite: parsed.data.fechaLimite
          ? new Date(parsed.data.fechaLimite)
          : undefined,
        evaluaProductividad: parsed.data.evaluaProductividad ?? true,
        pesoProductividad: parsed.data.pesoProductividad ?? 1,
      },
      include: {
        user: { select: { id: true, nombre: true, apellido: true } },
        objetivo: { select: { id: true, titulo: true } },
      },
    });

    console.log(`[Tareas] Creada: ${tarea.id} por ${user.email}`);
    return apiSuccess(tarea, 201);
  } catch (err) {
    console.error("[Tareas] Error al crear:", err);
    return apiError("Error al crear tarea", 500);
  }
}

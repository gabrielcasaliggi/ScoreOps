import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { findObjetivoInOrg, findUserInOrg } from "@/lib/tenant";

const updateSchema = z.object({
  titulo: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  fechaInicio: z.string().datetime().optional(),
  fechaFin: z.string().datetime().optional(),
  userId: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const { id } = await params;
  const objetivo = await findObjetivoInOrg(user.organizationId, id);

  if (!objetivo) return apiError("Objetivo no encontrado", 404);
  if (user.role === "EMPLEADO" && objetivo.userId !== user.id) {
    return apiError("Sin permisos", 403);
  }
  if (user.role === "GERENTE") {
    const owner = await findUserInOrg(user.organizationId, objetivo.userId);
    if (!owner || owner.areaId !== user.areaId) {
      return apiError("Sin permisos", 403);
    }
  }

  return apiSuccess(objetivo);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  const { id } = await params;

  try {
    const existing = await findObjetivoInOrg(user.organizationId, id);
    if (!existing) return apiError("Objetivo no encontrado", 404);

    if (user.role === "GERENTE") {
      const owner = await findUserInOrg(user.organizationId, existing.userId);
      if (!owner || owner.areaId !== user.areaId) {
        return apiError("Sin permisos", 403);
      }
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    if (parsed.data.userId) {
      const target = await findUserInOrg(user.organizationId, parsed.data.userId);
      if (!target) return apiError("Empleado no encontrado", 404);
      if (user.role === "GERENTE" && target.areaId !== user.areaId) {
        return apiError("Sin permisos", 403);
      }
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.fechaInicio) data.fechaInicio = new Date(parsed.data.fechaInicio);
    if (parsed.data.fechaFin) data.fechaFin = new Date(parsed.data.fechaFin);

    const objetivo = await prisma.objetivo.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, nombre: true, apellido: true } },
        kpis: true,
      },
    });

    return apiSuccess(objetivo);
  } catch {
    return apiError("Objetivo no encontrado", 404);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  const { id } = await params;

  try {
    const existing = await findObjetivoInOrg(user.organizationId, id);
    if (!existing) return apiError("Objetivo no encontrado", 404);

    if (user.role === "GERENTE") {
      const owner = await findUserInOrg(user.organizationId, existing.userId);
      if (!owner || owner.areaId !== user.areaId) {
        return apiError("Sin permisos", 403);
      }
    }

    await prisma.objetivo.delete({ where: { id } });
    return apiSuccess({ ok: true });
  } catch {
    return apiError("Objetivo no encontrado", 404);
  }
}

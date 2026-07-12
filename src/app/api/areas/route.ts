import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { orgId } from "@/lib/tenant";

const createSchema = z.object({
  nombre: z.string().min(1).max(80),
});

const updateSchema = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1).max(80),
});

export async function GET() {
  const { error, user } = await requireAuth(["ADMINISTRADOR", "GERENTE"]);
  if (error || !user) return error;

  const areas = await prisma.area.findMany({
    where: { organizationId: orgId(user) },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      _count: { select: { usuarios: true } },
    },
  });

  return apiSuccess(
    areas.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      usuarios: a._count.usuarios,
    }))
  );
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const nombre = parsed.data.nombre.trim();
    const organizationId = orgId(user);

    const exists = await prisma.area.findFirst({
      where: {
        organizationId,
        nombre: { equals: nombre, mode: "insensitive" },
      },
    });
    if (exists) return apiError("Ya existe un área con ese nombre");

    const area = await prisma.area.create({
      data: { organizationId, nombre },
      select: { id: true, nombre: true },
    });

    return apiSuccess({ ...area, usuarios: 0 }, 201);
  } catch (err) {
    console.error("[Areas POST]", err);
    return apiError("Error al crear el área", 500);
  }
}

export async function PATCH(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const organizationId = orgId(user);
    const nombre = parsed.data.nombre.trim();

    const area = await prisma.area.findFirst({
      where: { id: parsed.data.id, organizationId },
    });
    if (!area) return apiError("Área no encontrada", 404);

    const clash = await prisma.area.findFirst({
      where: {
        organizationId,
        nombre: { equals: nombre, mode: "insensitive" },
        NOT: { id: area.id },
      },
    });
    if (clash) return apiError("Ya existe un área con ese nombre");

    const updated = await prisma.area.update({
      where: { id: area.id },
      data: { nombre },
      select: {
        id: true,
        nombre: true,
        _count: { select: { usuarios: true } },
      },
    });

    return apiSuccess({
      id: updated.id,
      nombre: updated.nombre,
      usuarios: updated._count.usuarios,
    });
  } catch (err) {
    console.error("[Areas PATCH]", err);
    return apiError("Error al actualizar el área", 500);
  }
}

export async function DELETE(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return apiError("Falta id del área");

    const organizationId = orgId(user);
    const area = await prisma.area.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { usuarios: true } } },
    });
    if (!area) return apiError("Área no encontrada", 404);
    if (area._count.usuarios > 0) {
      return apiError("No se puede eliminar: hay usuarios asignados a esta área");
    }

    const totalAreas = await prisma.area.count({ where: { organizationId } });
    if (totalAreas <= 1) {
      return apiError("Debe quedar al menos un área en la empresa");
    }

    await prisma.area.delete({ where: { id: area.id } });
    return apiSuccess({ ok: true });
  } catch (err) {
    console.error("[Areas DELETE]", err);
    return apiError("Error al eliminar el área", 500);
  }
}

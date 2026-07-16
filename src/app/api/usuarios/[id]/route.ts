import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { updateUserSchema } from "@/lib/user-validation";
import { findUserInOrg } from "@/lib/tenant";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const existing = await findUserInOrg(user.organizationId, id);
    if (!existing) return apiError("Usuario no encontrado", 404);

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.email) updateData.email = data.email.toLowerCase();
    if (data.nombre) updateData.nombre = data.nombre;
    if (data.apellido) updateData.apellido = data.apellido;
    if (data.legajo !== undefined) updateData.legajo = data.legajo;
    if (data.telefono !== undefined) updateData.telefono = data.telefono;
    if (data.sueldoBasico !== undefined) updateData.sueldoBasico = data.sueldoBasico;
    if (data.valorAntiguedad !== undefined) updateData.valorAntiguedad = data.valorAntiguedad;
    if (data.role) updateData.role = data.role;
    if (data.areaId) {
      const area = await prisma.area.findFirst({
        where: { id: data.areaId, organizationId: user.organizationId },
      });
      if (!area) return apiError("Área no encontrada en tu organización", 404);
      updateData.areaId = data.areaId;
    }
    if (data.activo !== undefined) {
      updateData.activo = data.activo;
      updateData.fechaBaja = data.activo ? null : new Date();
    }
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    if (data.fechaAlta) {
      updateData.fechaAlta = new Date(data.fechaAlta);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        legajo: true,
        telefono: true,
        sueldoBasico: true,
        valorAntiguedad: true,
        role: true,
        activo: true,
        fechaAlta: true,
        fechaBaja: true,
        area: { select: { id: true, nombre: true } },
      },
    });

    return apiSuccess(updated);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return apiError("Email o legajo ya registrado");
    }
    console.error("[Usuarios PATCH]", err);
    return apiError("Error al actualizar usuario", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  const { id } = await params;

  if (id === user.id) {
    return apiError("No podés darte de baja a vos mismo");
  }

  try {
    const existing = await findUserInOrg(user.organizationId, id);
    if (!existing) return apiError("Usuario no encontrado", 404);

    const updated = await prisma.user.update({
      where: { id },
      data: { activo: false, fechaBaja: new Date() },
      select: { id: true, activo: true, fechaBaja: true },
    });

    return apiSuccess(updated);
  } catch (err) {
    console.error("[Usuarios DELETE]", err);
    return apiError("Error al dar de baja usuario", 500);
  }
}

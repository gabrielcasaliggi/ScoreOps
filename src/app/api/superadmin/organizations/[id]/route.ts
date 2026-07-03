import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireSuperAdmin } from "@/lib/api";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  tagline: z.string().max(200).nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
  activo: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, user } = await requireSuperAdmin();
  if (error || !user) return error;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const org = await prisma.organization.update({
      where: { id },
      data: parsed.data,
    });

    return apiSuccess({
      id: org.id,
      slug: org.slug,
      name: org.name,
      activo: org.activo,
    });
  } catch (err) {
    console.error("[SuperAdmin Update Org]", err);
    return apiError("Error al actualizar organización", 500);
  }
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import { resolveBranding } from "@/lib/organization-brand";

const updateOrgSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  tagline: z.string().max(200).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
});

export async function GET() {
  const { error, user } = await requireAuth();
  if (error || !user) return error;

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
  });
  if (!org) return apiError("Organización no encontrada", 404);

  return apiSuccess(resolveBranding(org));
}

export async function PATCH(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  try {
    const body = await request.json();
    const parsed = updateOrgSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Datos inválidos");
    }

    const org = await prisma.organization.update({
      where: { id: user.organizationId },
      data: parsed.data,
    });

    return apiSuccess(resolveBranding(org));
  } catch (err) {
    console.error("[Organization]", err);
    return apiError("Error al actualizar organización", 500);
  }
}

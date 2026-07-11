import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, requireAuth } from "@/lib/api";
import {
  API_SCOPES,
  createOrganizationApiKey,
  type ApiScope,
} from "@/lib/api-key";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.array(z.enum(["stats:read", "equipo:read", "rrhh:sync"])).min(1),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function GET() {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  const keys = await prisma.organizationApiKey.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      activo: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return apiSuccess({ keys, scopesDisponibles: API_SCOPES });
}

export async function POST(request: NextRequest) {
  const { error, user } = await requireAuth(["ADMINISTRADOR"]);
  if (error || !user) return error;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Payload inválido");
    }

    const { id, key, keyPrefix } = await createOrganizationApiKey({
      organizationId: user.organizationId,
      name: parsed.data.name,
      scopes: parsed.data.scopes as ApiScope[],
      createdById: user.id,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    });

    return apiSuccess(
      {
        id,
        key,
        keyPrefix,
        message: "Guardá esta clave ahora; no se volverá a mostrar.",
      },
      201
    );
  } catch (err) {
    console.error("[API Keys]", err);
    return apiError("Error al crear API key", 500);
  }
}

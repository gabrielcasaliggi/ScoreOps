import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api";
import { areaInOrg, resolveDefaultOrganizationId, userByOrgEmail } from "@/lib/tenant";
import { extractApiKeyFromRequest, hasScope, resolveApiKey } from "@/lib/api-key";

const syncSchema = z.object({
  apiKey: z.string().min(1).optional(),
  empleados: z
    .array(
      z.object({
        externalId: z.string().min(1),
        legajo: z.string().optional(),
        email: z.string().email(),
        nombre: z.string().min(1),
        apellido: z.string().min(1),
        area: z.string().min(1),
        activo: z.boolean().optional(),
      })
    )
    .optional(),
});

async function resolveSyncAuth(request: NextRequest, bodyApiKey?: string) {
  const headerKey = extractApiKeyFromRequest(request);
  if (headerKey) {
    const ctx = await resolveApiKey(headerKey);
    if (!ctx) return { error: apiError("API key inválida o expirada", 401) };
    if (!hasScope(ctx, "rrhh:sync")) {
      return { error: apiError("Scope requerido: rrhh:sync", 403) };
    }
    return { error: null, organizationId: ctx.organizationId };
  }

  const expectedKey = process.env.INTEGRATION_API_KEY;
  if (!expectedKey) {
    return { error: apiError("Integración RRHH no configurada. Usá API key por org (X-Api-Key) o INTEGRATION_API_KEY", 503) };
  }
  if (bodyApiKey !== expectedKey) {
    return { error: apiError("API key inválida", 401) };
  }

  const organizationId = await resolveDefaultOrganizationId();
  return { error: null, organizationId };
}

/**
 * Integración RRHH — sincronización de empleados.
 * Auth: header X-Api-Key (scope rrhh:sync) o legacy body.apiKey + INTEGRATION_API_KEY.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Payload inválido");
    }

    const auth = await resolveSyncAuth(request, parsed.data.apiKey);
    if (auth.error) return auth.error;

    const organizationId = auth.organizationId;

    if (!parsed.data.empleados?.length) {
      return apiSuccess({
        status: "ok",
        message: "Endpoint activo. Enviá empleados[] para sincronizar.",
        sincronizados: 0,
        organizationId,
      });
    }

    const areas = await prisma.area.findMany({ where: areaInOrg(organizationId) });
    const areaByName = new Map(areas.map((a) => [a.nombre.toLowerCase(), a.id]));
    let sincronizados = 0;
    const errores: string[] = [];

    for (const emp of parsed.data.empleados) {
      const areaId = areaByName.get(emp.area.toLowerCase());
      if (!areaId) {
        errores.push(`${emp.email}: área desconocida ${emp.area}`);
        continue;
      }

      const email = emp.email.toLowerCase();
      const existing = await prisma.user.findUnique({
        where: userByOrgEmail(organizationId, email),
      });
      const passwordHash = existing
        ? undefined
        : await bcrypt.hash(`rrhh-${emp.externalId}`, 10);

      await prisma.user.upsert({
        where: userByOrgEmail(organizationId, email),
        create: {
          organizationId,
          email,
          nombre: emp.nombre,
          apellido: emp.apellido,
          legajo: emp.legajo,
          externalId: emp.externalId,
          areaId,
          password: passwordHash!,
          activo: emp.activo ?? true,
          role: "EMPLEADO",
        },
        update: {
          nombre: emp.nombre,
          apellido: emp.apellido,
          legajo: emp.legajo,
          externalId: emp.externalId,
          areaId,
          activo: emp.activo ?? true,
        },
      });
      sincronizados++;
    }

    return apiSuccess({ status: "ok", sincronizados, errores, organizationId });
  } catch (err) {
    console.error("[Integrations RRHH]", err);
    return apiError("Error en sincronización", 500);
  }
}

export async function GET() {
  return apiSuccess({
    status: "active",
    message: "POST con empleados[] — auth: X-Api-Key (rrhh:sync) o legacy apiKey",
    openapi: "/api/v1/openapi",
    legacyConfigurado: Boolean(process.env.INTEGRATION_API_KEY),
  });
}
